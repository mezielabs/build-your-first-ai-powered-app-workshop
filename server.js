import express from "express";

const app = express();

app.use(express.json({ limit: "100kb" }));
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Block 3: POST /api/chat goes here.

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Writing assistant running at http://localhost:${port}`);
});
