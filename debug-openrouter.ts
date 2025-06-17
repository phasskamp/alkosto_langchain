// debug-openrouter.ts - Mit aktuellen Imports
import { config } from "dotenv";
config();

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

console.log("🔧 === OPENROUTER DEBUG SESSION (Updated) ===");
console.log("🔑 API-Key exists:", !!process.env.OPENAI_API_KEY);
console.log("🌐 Base URL:", process.env.OPENAI_BASE_URL);

async function debugOpenRouter() {
  try {
    const llm = new ChatOpenAI({
      model: "gpt-3.5-turbo",
      temperature: 0.2,
      maxTokens: 50,
      configuration: {
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL,
      },
    });

    // 1. Test einfache Anfrage
    console.log("\n📝 Testing simple call...");
    const simpleResponse = await llm.invoke("Hola");
    console.log("✅ Simple call works:", simpleResponse.content);

    // 2. Test System Message
    console.log("\n📝 Testing system message...");
    const messages = [
      new SystemMessage("Eres un asistente de ventas de Alkosto"),
      new HumanMessage("Busco un televisor")
    ];
    
    const systemResponse = await llm.invoke(messages);
    console.log("✅ System message works:", systemResponse.content);

    console.log("\n🎉 ALL TESTS PASSED! OpenRouter is working correctly!");

  } catch (error) {
    console.error("🚨 Error:", error.message);
    console.error("Status:", error.status);
  }
}

debugOpenRouter();
