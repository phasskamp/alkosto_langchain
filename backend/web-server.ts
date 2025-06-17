import express from "express"
import { startAgent } from "./src/alkosto-graduated-search-agent.js"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.post("/ask", async (req, res) => {
  const { query } = req.body
  if (!query) return res.status(400).json({ error: "Missing query" })

  try {
    const result = await startAgent(query)
    res.json(result)
  } catch (err) {
    console.error("Agent error:", err)
    res.status(500).json({ error: "Agent failed" })
  }
})

app.get("/", (_, res) => {
  res.send("🟢 Alkosto Agent is running.")
})

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`)
})

