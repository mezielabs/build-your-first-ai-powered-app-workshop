import { createServer } from "node:http";
import express from "express";
import OpenAI from "openai";
import { createServer as createViteServer } from "vite";
import { ChatRequestSchema, type ChatReply } from "./shared/chat.ts";

const MODEL = "openai/gpt-oss-20b";

// The server owns the system message. The browser never sends one.
const SYSTEM_MESSAGE =
  "You are a writing assistant. Write clear, natural drafts in plain text. " +
  "When the user asks for a change, revise your most recent draft and reply " +
  "with the full revised draft only, with no preamble.";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL,
  // Fail fast: the SDK would otherwise retry a 429 after Groq's retry-after
  // delay, leaving the page waiting with no feedback. The user can retry.
  maxRetries: 0,
});

const app = express();

app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Turns a provider error into a safe status and message for the browser.
// The full detail stays in the server log.
function describeError(error: unknown) {
  if (error instanceof OpenAI.APIError && error.status === 429) {
    return { status: 429, message: "Too many requests right now. Wait a minute and try again." };
  }
  return { status: 502, message: "Couldn't get a reply right now. Try again." };
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

app.post("/api/chat", async (req, res) => {
  // req.body is whatever the browser sent. Check it before trusting it.
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { messages } = parsed.data;

  let response;
  try {
    response = await client.chat.completions.create({
      model: MODEL,
      reasoning_effort: "low",
      max_completion_tokens: 1024,
      messages: [{ role: "system", content: SYSTEM_MESSAGE }, ...messages],
    });
  } catch (error) {
    console.error("[chat] Groq request failed:", errorText(error));
    const { status, message } = describeError(error);
    res.status(status).json({ error: message });
    return;
  }

  const choice = response.choices[0];
  const reply = choice.message.content ?? "";
  console.log(
    `[chat] ${messages.length} messages, prompt tokens: ${response.usage?.prompt_tokens}, ` +
      `completion tokens: ${response.usage?.completion_tokens}`,
  );

  if (choice.finish_reason !== "stop" || reply.trim() === "") {
    console.warn(`[chat] unusable reply, finish reason: ${choice.finish_reason}`);
    res.status(502).json({ error: "The reply was cut off. Try asking for something shorter." });
    return;
  }

  res.json({ reply } satisfies ChatReply);
});

// Vite serves the React app and turns its TypeScript into JavaScript the browser can run.
const server = createServer(app);
const vite = await createViteServer({
  server: { middlewareMode: true, hmr: { server } },
  appType: "spa",
  configLoader: "native", // Node loads vite.config.ts itself, the same way it runs this file.
});
app.use(vite.middlewares);

const port = Number(process.env.PORT ?? 3000);

server.listen(port, () => {
  console.log(`Writing assistant running at http://localhost:${port}`);
});
