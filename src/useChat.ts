import { useState } from "react";
import type { ChatErrorBody, ChatMessage, ChatRequest, StreamRecord } from "../shared/chat.ts";
import { readRecords } from "./ndjson.ts";

// The turn in progress: on screen, but not part of the history yet.
export type PendingTurn = { user: string; reply: string };

// An error whose message is safe to show the user.
class ChatError extends Error {}

export function useChat() {
  // The conversation so far. Only complete exchanges live here.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const busy = pending !== null;

  async function send(text: string) {
    const userTurn: ChatMessage = { role: "user", content: text };
    setPending({ user: text, reply: "" });
    setInput("");
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userTurn] } satisfies ChatRequest),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as Partial<ChatErrorBody>;
        throw new ChatError(body.error ?? "Something went wrong. Try again.");
      }

      let reply = "";
      let done = false;
      let failure: string | null = null;

      for await (const record of readRecords<StreamRecord>(response)) {
        if (record.type === "delta") {
          reply += record.text;
          setPending({ user: text, reply });
        } else if (record.type === "done") {
          done = true;
        } else {
          failure = record.message;
        }
      }

      // The stream ended. Only a done record means the reply is complete.
      if (!done) {
        throw new ChatError(failure ?? "The reply didn't finish. Try again.");
      }

      // Only now does the exchange join the history.
      setMessages((history) => [...history, userTurn, { role: "assistant", content: reply }]);
    } catch (error) {
      // Roll back: the failed turn never happened, and the text goes back in the box.
      setInput(text);
      setError(error instanceof ChatError ? error.message : "Couldn't reach the server. Check it's running and try again.");
    } finally {
      setPending(null);
    }
  }

  function reset() {
    setMessages([]);
    setError("");
  }

  return { messages, pending, input, setInput, error, busy, send, reset };
}
