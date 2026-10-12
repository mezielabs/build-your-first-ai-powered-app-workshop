import { useState } from "react";
import type { ChatErrorBody, ChatMessage, ChatReply, ChatRequest } from "../shared/chat.ts";

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
      const body = (await response.json().catch(() => ({}))) as Partial<ChatReply & ChatErrorBody>;
      if (!response.ok || body.reply === undefined) {
        throw new ChatError(body.error ?? "Something went wrong. Try again.");
      }
      const reply = body.reply;

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
