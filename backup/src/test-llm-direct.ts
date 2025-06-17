// Direct LLM Test mit OpenRouter
import dotenv from "dotenv";
dotenv.config();

import { ChatOpenAI } from "@langchain/openai";

async function testLLMDirect() {
  console.log("🧪 Testing OpenRouter LLM directly...\n");
  
  const llm = new ChatOpenAI({
    modelName: "openai/gpt-3.5-turbo",
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.3,
    maxTokens: 200,
    streaming: false,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Alkosto LLM Test"
      }
    }
  });

  try {
    console.log("🔍 Testing simple message...");
    const response = await llm.invoke("Hola, soy un asistente de Alkosto. ¿En qué puedo ayudarte?");
    console.log("✅ LLM Response:", response.content);
    console.log("🎉 OpenRouter LLM is working!");
    
  } catch (error) {
    console.error("❌ LLM Error:", error.message);
    
    if (error.message.includes("400")) {
      console.log("🔍 Still getting 400 errors - OpenRouter issue persists");
    }
  }
}

testLLMDirect().catch(console.error);
