import express from "express";
import dotenv from "dotenv";
import { startAgent } from "./src/alkosto-graduated-search-agent.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Healthcheck-Route
app.get("/health", (req, res) => {
  res.status(200).send("✅ Server läuft – Healthcheck erfolgreich");
});

// Haupt-Route
app.get("/", async (req, res) => {
  try {
    const result = await startAgent("Hola");
    res.send(result);
  } catch (error) {
    console.error("❌ Fehler beim Starten des Agenten:", error);
    res.status(500).send("Fehler beim Starten des Agenten");
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Server läuft auf http://localhost:${PORT}`);
});
