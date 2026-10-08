const conversation = document.querySelector("#conversation");
const form = document.querySelector("#composer");
const input = document.querySelector("#message");
const sendButton = document.querySelector("#send");
const newButton = document.querySelector("#new-conversation");
const errorBox = document.querySelector("#error");

// The conversation so far. Only complete exchanges live here.
let history = [];
let busy = false;

// An error whose message is safe to show the user.
class ChatError extends Error {}

function addBubble(role, text) {
  conversation.querySelector(".empty")?.remove();
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = text; // textContent, never innerHTML: model output is untrusted.
  conversation.append(bubble);
  bubble.scrollIntoView({ block: "end" });
  return bubble;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

function setBusy(value) {
  busy = value;
  sendButton.disabled = value;
  newButton.disabled = value;
}

async function send(text) {
  const userTurn = { role: "user", content: text };
  const userBubble = addBubble("user", text);
  const replyBubble = addBubble("assistant", "");
  replyBubble.classList.add("pending");

  input.value = "";
  showError("");
  setBusy(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...history, userTurn] }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ChatError(body.error ?? "Something went wrong. Try again.");
    }

    replyBubble.textContent = body.reply;
    replyBubble.classList.remove("pending");

    // Only now does the exchange join the history.
    history.push(userTurn, { role: "assistant", content: body.reply });
  } catch (error) {
    // Roll back: the failed turn never happened.
    userBubble.remove();
    replyBubble.remove();
    input.value = text;
    showError(error instanceof ChatError ? error.message : "Couldn't reach the server. Check it's running and try again.");
  } finally {
    setBusy(false);
    input.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || busy) return;
  send(text);
});

// Enter sends; Shift+Enter adds a new line.
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

newButton.addEventListener("click", () => {
  history = [];
  conversation.replaceChildren();
  showError("");
  input.focus();
});
