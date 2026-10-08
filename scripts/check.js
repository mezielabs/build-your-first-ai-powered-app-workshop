// Pre-work check: run `npm run check` before the workshop.
// It makes one tiny request to prove your Node version, .env file and Groq key all work.
import OpenAI from "openai";

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 9)) {
  fail(`Node ${process.versions.node} is too old. Install Node 22.9 or newer (any Node 24 works).`);
}

if (!process.env.GROQ_API_KEY) {
  fail("GROQ_API_KEY is missing. Copy .env.example to .env in this folder and paste your key into it.");
}

if (!process.env.GROQ_BASE_URL) {
  fail("GROQ_BASE_URL is missing. Copy it from .env.example into your .env file.");
}

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL,
});

try {
  await client.chat.completions.create({
    model: "openai/gpt-oss-20b",
    reasoning_effort: "low",
    max_completion_tokens: 64,
    messages: [{ role: "user", content: "Reply with the word OK." }],
  });
} catch (error) {
  if (error.status === 401) {
    fail("Groq rejected your key (401). Check GROQ_API_KEY in .env has no spaces or quotes, or create a new key.");
  }
  if (error.status === 429) {
    fail("Groq says too many requests (429). Wait a minute and run the check again.");
  }
  fail(`The request to Groq failed: ${error.message}`);
}

console.log(`\n✓ Node ${process.versions.node} is fine.`);
console.log("✓ Groq key works.\n");
console.log("You're ready for the workshop. Run `npm start` and open http://localhost:3000\n");
