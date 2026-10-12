import { useState } from "react";
import type { ChatMessage } from "../shared/chat.ts";

// The turn in progress: on screen, but not part of the history yet.
export type PendingTurn = { user: string; reply: string };

export function useChat() {
  // The conversation so far. Only complete exchanges live here.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const busy = pending !== null;

  // Block 3: you'll build send() live with the facilitator.
  async function send(text: string) {
    setError("Not built yet. You'll build send() in block 3.");
  }

  function reset() {
    setMessages([]);
    setError("");
  }

  return { messages, pending, input, setInput, error, busy, send, reset };
}
