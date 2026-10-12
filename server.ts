import { createServer } from "node:http";
import express from "express";
import OpenAI from "openai";
import { createServer as createViteServer } from "vite";
import { ChatRequestSchema, type StreamRecord } from "./shared/chat.ts";

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

// Groq adds an x_groq field that the OpenAI types don't know about.
type GroqChunk = OpenAI.ChatCompletionChunk & { x_groq?: { usage?: OpenAI.CompletionUsage } };

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

  // If the browser goes away mid-reply, stop paying for tokens nobody will read.
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) {
      console.log("[chat] client disconnected, cancelling the Groq request");
      controller.abort();
    }
  });

  let stream;
  try {
    stream = await client.chat.completions.create(
      {
        model: MODEL,
        reasoning_effort: "low",
        max_completion_tokens: 1024,
        stream: true,
        messages: [{ role: "system", content: SYSTEM_MESSAGE }, ...messages],
      },
      { signal: controller.signal },
    );
  } catch (error) {
    if (controller.signal.aborted) return;
    // Nothing has been sent yet, so a normal JSON error still works here.
    console.error("[chat] Groq request failed:", errorText(error));
    const { status, message } = describeError(error);
    res.status(status).json({ error: message });
    return;
  }

  // From here on, the response is a stream of NDJSON records (see StreamRecord in shared/chat.ts).
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  const write = (record: StreamRecord) => res.write(JSON.stringify(record) + "\n");

  let text = "";
  let finishReason: string | null = null;
  let usage: OpenAI.CompletionUsage | undefined;

  try {
    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      // Only content goes to the browser. Reasoning arrives in a separate field and stays here.
      const delta = choice?.delta.content;
      if (delta) {
        text += delta;
        write({ type: "delta", text: delta });
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      usage = chunk.usage ?? (chunk as GroqChunk).x_groq?.usage ?? usage;
    }
  } catch (error) {
    if (controller.signal.aborted) return;
    console.error("[chat] stream failed:", errorText(error));
    write({ type: "error", message: "The reply was interrupted. Try again." });
    res.end();
    return;
  }

  console.log(
    `[chat] ${messages.length} messages, prompt tokens: ${usage?.prompt_tokens}, ` +
      `completion tokens: ${usage?.completion_tokens}`,
  );

  // done only when the model stopped normally, some text arrived, and nothing failed.
  if (finishReason === "stop" && text.trim() !== "") {
    write({ type: "done" });
  } else {
    console.warn(`[chat] unusable reply, finish reason: ${finishReason}`);
    write({ type: "error", message: "The reply was cut off. Try asking for something shorter." });
  }
  res.end();
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
