// Block 2: your first model call.
// Run it with: npm run first-call
import OpenAI from "openai";

// The key and the endpoint come from .env, never from code.
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL,
});

const response = await client.chat.completions.create({
  model: "openai/gpt-oss-20b",
  reasoning_effort: "low",
  max_completion_tokens: 1024,
  messages: [
    {
      role: "system",
      content: "You are a writing assistant. Reply with the draft only, in plain text.",
    },
    {
      role: "user",
      content: "Write a two-sentence welcome message for a developer workshop.",
    },
  ],
});

const choice = response.choices[0];

console.log("Text:", choice.message.content);
console.log("Finish reason:", choice.finish_reason);
console.log("Usage:", response.usage);
