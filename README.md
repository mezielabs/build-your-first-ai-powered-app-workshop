# Build Your First AI-Powered App

A Mezie Labs live workshop. In two hours you'll build a writing assistant that streams its replies and remembers the conversation, using Node, Express, plain JavaScript and a free Groq API key.

Ask it for a draft, watch the draft arrive word by word, then refine it with follow-ups like "make it shorter" or "more formal".

## Before the workshop

Get all of this working **before the session starts**. There's no setup help during the two hours. It takes about 20 minutes.

1. **Install Node 22.9 or newer, and Git.** Check with `node -v` and `git --version`.
2. **Clone this repo and install dependencies:**

   ```bash
   git clone <REPO_URL>
   cd writing-assistant-workshop
   npm ci
   ```

3. **Create a free Groq API key** at [console.groq.com/keys](https://console.groq.com/keys). No card is needed.
4. **Add your key.** Copy `.env.example` to a new file called `.env` in this folder, and paste your key after `GROQ_API_KEY=`. Never share this file or show it on screen.
5. **Run the check:**

   ```bash
   npm run check
   ```

   You should see:

   ```text
   ✓ Node 22.x.x is fine.
   ✓ Groq key works.
   ```

6. **Start the app** with `npm start`, then open [http://localhost:3000](http://localhost:3000). You should see the Writing assistant page. It won't reply yet; that's what the workshop is for.
7. **Join the [Mezie Labs Discord](https://discord.gg/buTNVnYDAX)** and the workshop channel. Post setup questions there, with the error text and the command you ran.
8. **Test your Zoom connection**, including screen sharing and chat.

## Agenda (2 hours)

| Start | Block |
| --- | --- |
| 0:00 | Open and demo |
| 0:08 | How LLMs work |
| 0:23 | First call from Node |
| 0:38 | Chat with memory |
| 1:03 | Break |
| 1:08 | Streaming |
| 1:45 | Break it, watch it grow |
| 1:52 | Close |

## During the workshop: the help protocol

1. At each checkpoint, post `DONE` or `HELP: <one-line error>` in Zoom chat.
2. Paste error text, not screenshots.
3. Stuck for three minutes? Rejoin from the checkpoint branch and keep building. Bring the problem to the break, or to the workshop channel on Discord afterwards.

### Rejoin from a checkpoint

```bash
git stash -u && git switch <branch> && npm ci
```

Your own work is saved in the stash, and your `.env` file stays where it is.

| Branch | What it holds | Use it when |
| --- | --- | --- |
| `main` | The starter: the page loads, nothing calls Groq yet | Before the workshop |
| `checkpoint/first-call` | `examples/first-call.js` makes a real request | Behind at 0:38 |
| `checkpoint/chat` | Chat with memory, without streaming | Behind at 1:01, or in the break |
| `checkpoint/streaming` | Streaming replies, saved only when `done` arrives | Behind at 1:43 |
| `reference` | The finished app | After the workshop |

## Commands

| Command | What it does |
| --- | --- |
| `npm run check` | Checks Node, your `.env` file and your Groq key |
| `npm start` | Runs the app at http://localhost:3000 |
| `npm run first-call` | Runs `examples/first-call.js` (block 2) |

## Project layout

```text
server.js              Express server: static files and the /api routes
examples/first-call.js Your first model call (block 2)
public/index.html      The page
public/app.js          The browser code (blocks 3 and 4)
public/ndjson.js       Reads a streamed response one record at a time (provided)
public/styles.css      Styles
scripts/check.js       The pre-work check
```

## Safety

- Your API key lives only in `.env`, which Git ignores. It never goes into browser code.
- If your key ever appears on screen or in a chat, delete it at [console.groq.com/keys](https://console.groq.com/keys) and create a new one.
