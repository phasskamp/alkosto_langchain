// src/debug-agent.ts
// Script de diagnóstico para identificar el problema exacto

import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();

async function testBasicLLM() {
  console.log("🧪 Testing basic OpenRouter LLM...");
  
  const llm = new ChatOpenAI({
    modelName: "openai/gpt-3.5-turbo",
    temperature: 0.2,
    openAIApiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Alkosto Agent Debug"
      }
    }
  });

  try {
    // Test simple message
    console.log("🔍 Testing simple message...");
    const simpleResponse = await llm.invoke("Hola, ¿cómo estás?");
    console.log("✅ Simple response:", simpleResponse.content);

    // Test system message
    console.log("🔍 Testing system message...");
    const systemResponse = await llm.invoke([
      { role: "system", content: "Eres un asistente de ventas de Alkosto." },
      { role: "user", content: "Hola" }
    ]);
    console.log("✅ System response:", systemResponse.content);

    // Test with tool result format
    console.log("🔍 Testing with mock tool result...");
    const toolResponse = await llm.invoke([
      { role: "system", content: "Eres un asistente de ventas de Alkosto." },
      { role: "user", content: "Busco un televisor Samsung" },
      { 
        role: "assistant", 
        content: "",
        tool_calls: [{
          id: "call_test",
          type: "function",
          function: {
            name: "buscar_productos",
            arguments: JSON.stringify({kategorie: "televisor", presupuesto_max: 2000000})
          }
        }]
      },
      { 
        role: "tool", 
        content: JSON.stringify({
          success: true,
          total_found: 3,
          productos: [
            {title: "TV Samsung 32", price: "1500000 COP", brand: "SAMSUNG"}
          ]
        }),
        tool_call_id: "call_test"
      }
    ]);
    console.log("✅ Tool response:", toolResponse.content);

  } catch (error) {
    console.error("❌ Error in LLM test:", error);
    
    // Check if it's a 400 error
    if (error.message?.includes("400")) {
      console.log("🔍 Analyzing 400 error...");
      console.log("Error details:", {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5)
      });
    }
  }
}

async function testToolCallFormat() {
  console.log("\n🧪 Testing different tool call formats...");
  
  const llm = new ChatOpenAI({
    modelName: "openai/gpt-3.5-turbo",
    temperature: 0.2,
    openAIApiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Alkosto Agent Debug"
      }
    }
  });

  // Test problematic tool call structure from logs
  try {
    console.log("🔍 Testing exact tool call from logs...");
    
    const messages = [
      {
        role: "system",
        content: "Eres un asistente de ventas experto de Alkosto."
      },
      {
        role: "user", 
        content: "Busco un televisor Samsung por menos de 2 millones de pesos"
      },
      {
        role: "assistant",
        content: "",
        tool_calls: [{
          index: 0,
          id: "call_test123",
          type: "function",
          function: {
            name: "buscar_productos",
            arguments: '{"kategorie": "televisor", "presupuesto_max": 2000000}'
          }
        }]
      },
      {
        role: "tool",
        tool_call_id: "call_test123",
        content: '{"success":true,"total_found":24,"productos":[{"title":"TV Hyundai 32\\" Pulgadas 81 cm Hyled3257rim HD LED Smart TV Roku","price":"709900.0 COP","brand":"HYUNDAI"}],"categoria":"televisor","presupuesto":"2000000 COP"}'
      }
    ];

    console.log("📤 Sending messages:", JSON.stringify(messages, null, 2));
    
    const response = await llm.invoke(messages);
    console.log("✅ Response received:", response.content);
    
  } catch (error) {
    console.error("❌ Tool call format error:", error);
    
    // Try to identify the specific issue
    if (error.message?.includes("functionfunctionfunction")) {
      console.log("🔍 FOUND ISSUE: Tool call type has repeated 'function' string!");
      console.log("This suggests a string concatenation bug in the tool call type field");
    }
  }
}

async function main() {
  console.log("🚀 Starting OpenRouter Agent Diagnostics...\n");
  
  // Check environment
  console.log("🔍 Environment check:");
  console.log("- OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✅ Set" : "❌ Missing");
  console.log("- OPENAI_BASE_URL:", process.env.OPENAI_BASE_URL || "❌ Using default");
  
  await testBasicLLM();
  await testToolCallFormat();
  
  console.log("\n🎯 Diagnosis complete!");
}

main().catch(console.error);