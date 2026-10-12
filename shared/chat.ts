// The contract between the browser and the server. Both sides import from this file.
import { z } from "zod";

export const MAX_MESSAGES = 20;
export const MAX_CHARS = 4000;

// TypeScript types disappear when the code runs, so they can't check what the browser sends.
// A zod schema checks the data at runtime, and the matching type is inferred from it.
export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"], {
    error: "Messages can only come from the user or the assistant.",
  }),
  content: z
    .string({ error: "Every message needs some text." })
    .refine((text) => text.trim() !== "", "Every message needs some text.")
    .refine((text) => text.length <= MAX_CHARS, `Keep each message under ${MAX_CHARS} characters.`),
});

export const ChatRequestSchema = z.object(
  {
    messages: z
      .array(ChatMessageSchema, { error: "Send at least one message." })
      .min(1, "Send at least one message.")
      .max(MAX_MESSAGES, "This conversation is too long. Start a new conversation.")
      .refine((messages) => messages.at(-1)?.role === "user", "The last message must come from the user."),
  },
  { error: "Send at least one message." },
);

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// Block 3: the server answers with the whole reply at once.
export type ChatReply = { reply: string };

// Any failed request: a message that's safe to show the user.
export type ChatErrorBody = { error: string };

// Block 4: the server streams newline-delimited JSON records instead.
export type StreamRecord =
  | { type: "delta"; text: string } // a piece of reply text
  | { type: "done" } // the reply finished normally
  | { type: "error"; message: string }; // the reply failed; don't keep it
