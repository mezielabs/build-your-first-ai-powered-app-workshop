// The page. It's supplied: everything it needs comes from useChat().
import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { useChat } from "./useChat.ts";

export function App() {
  const { messages, pending, input, setInput, error, busy, send, reset } = useChat();
  const conversationRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest text in view as the reply arrives.
  useEffect(() => {
    conversationRef.current?.lastElementChild?.scrollIntoView({ block: "end" });
  }, [messages, pending]);

  // Put the cursor back in the box whenever a reply finishes or fails.
  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    void send(text);
  }

  // Enter sends; Shift+Enter adds a new line.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function handleNewConversation() {
    reset();
    inputRef.current?.focus();
  }

  const isEmpty = messages.length === 0 && pending === null;

  return (
    <main className="app">
      <header className="app-header">
        <h1>Writing assistant</h1>
        <button id="new-conversation" type="button" onClick={handleNewConversation} disabled={busy}>
          New conversation
        </button>
      </header>

      {/* React renders text, never HTML, so model output can't inject markup. */}
      <section id="conversation" className="conversation" aria-live="polite" ref={conversationRef}>
        {isEmpty && <p className="empty">Ask for a draft, then refine it with follow-ups like "make it shorter".</p>}
        {messages.map((message, index) => (
          <div key={index} className={`bubble ${message.role}`}>
            {message.content}
          </div>
        ))}
        {pending && (
          <>
            <div className="bubble user">{pending.user}</div>
            <div className="bubble assistant pending">{pending.reply}</div>
          </>
        )}
      </section>

      <p id="error" className="error" role="alert" hidden={!error}>
        {error}
      </p>

      <form id="composer" className="composer" onSubmit={handleSubmit}>
        <label htmlFor="message" className="visually-hidden">
          Message
        </label>
        <textarea
          id="message"
          ref={inputRef}
          rows={3}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a short email asking my landlord to fix the leaking kitchen tap"
        />
        <button id="send" type="submit" disabled={busy}>
          Send
        </button>
      </form>
      <p className="hint">Enter sends. Shift+Enter adds a new line.</p>
    </main>
  );
}
