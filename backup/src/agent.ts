// src/agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { productSearchTool } from "./tools/product-search-tool-dynamic.ts";
import dotenv from "dotenv";

dotenv.config();

export async function createAlkostoAgent() {
  console.log("🧠 Initializing OpenAI Agent...");
  
  const llm = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0.2,
    openAIApiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1"
    }
  });

  const executor = await initializeAgentExecutorWithOptions(
    [productSearchTool],
    llm,
    {
      agentType: "openai-functions",
      verbose: true,
    }
  );

  console.log("✅ Agent ready.");
  return executor;
}
