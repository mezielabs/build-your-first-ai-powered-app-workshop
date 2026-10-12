import { createServer } from "node:http";
import express from "express";
import { createServer as createViteServer } from "vite";

const app = express();

app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Block 3: POST /api/chat goes here.

// Vite serves the React app and turns its TypeScript into JavaScript the browser can run.
const server = createServer(app);
const vite = await createViteServer({
  server: { middlewareMode: true, hmr: { server } },
  appType: "spa",
  configLoader: "native", // Node loads vite.config.ts itself, the same way it runs this file.
});
app.use(vite.middlewares);

const port = Number(process.env.PORT ?? 3000);

server.listen(port, () => {
  console.log(`Writing assistant running at http://localhost:${port}`);
});
