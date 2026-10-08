import express from "express";
import OpenAI from "openai";

const MODEL = "openai/gpt-oss-20b";
const MAX_MESSAGES = 20;
const MAX_CHARS = 4000;

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
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Returns a message for the browser if the conversation is invalid, or null if it's fine.
function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "Send at least one message.";
  }
  if (messages.length > MAX_MESSAGES) {
    return "This conversation is too long. Start a new conversation.";
  }
  for (const message of messages) {
    if (message?.role !== "user" && message?.role !== "assistant") {
      return "Messages can only come from the user or the assistant.";
    }
    if (typeof message.content !== "string" || message.content.trim() === "") {
      return "Every message needs some text.";
    }
    if (message.content.length > MAX_CHARS) {
      return `Keep each message under ${MAX_CHARS} characters.`;
    }
  }
  if (messages.at(-1).role !== "user") {
    return "The last message must come from the user.";
  }
  return null;
}

// Turns a provider error into a safe status and message for the browser.
// The full detail stays in the server log.
function describeError(error) {
  if (error.status === 429) {
    return { status: 429, message: "Too many requests right now. Wait a minute and try again." };
  }
  return { status: 502, message: "Couldn't get a reply right now. Try again." };
}

app.post("/api/chat", async (req, res) => {
  const messages = req.body?.messages;
  const problem = validateMessages(messages);
  if (problem) {
    return res.status(400).json({ error: problem });
  }

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
    stream = await client.chat.completions.create({
      model: MODEL,
      reasoning_effort: "low",
      max_completion_tokens: 1024,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_MESSAGE },
        ...messages.map(({ role, content }) => ({ role, content })),
      ],
    }, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) return;
    // Nothing has been sent yet, so a normal JSON error still works here.
    console.error("[chat] Groq request failed:", error.status ?? "", error.message);
    const { status, message } = describeError(error);
    return res.status(status).json({ error: message });
  }

  // From here on, the response is a stream of NDJSON records:
  //   {"type":"delta","text":"..."}   a piece of reply text
  //   {"type":"done"}                 the reply finished normally
  //   {"type":"error","message":"..."} the reply failed; don't keep it
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  const write = (record) => res.write(JSON.stringify(record) + "\n");

  let text = "";
  let finishReason = null;
  let usage = null;

  try {
    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      // Only content goes to the browser. Reasoning arrives in a separate field and stays here.
      const delta = choice?.delta?.content;
      if (delta) {
        text += delta;
        write({ type: "delta", text: delta });
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      usage = chunk.usage ?? chunk.x_groq?.usage ?? usage;
    }
  } catch (error) {
    if (controller.signal.aborted) return;
    console.error("[chat] stream failed:", error.message);
    write({ type: "error", message: "The reply was interrupted. Try again." });
    return res.end();
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

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Writing assistant running at http://localhost:${port}`);
});
