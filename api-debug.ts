// api-debug.ts
import { config } from "dotenv";
config();

console.log("🔧 === API DEBUG ===");

// Environment Check
console.log("\n📋 Environment Variables:");
console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
console.log("OPENAI_API_KEY length:", process.env.OPENAI_API_KEY?.length || 0);
console.log("OPENAI_API_KEY starts with:", process.env.OPENAI_API_KEY?.substring(0, 7) + "...");
console.log("OPENAI_BASE_URL:", process.env.OPENAI_BASE_URL);

// Test API directly
console.log("\n🌐 Testing API connection...");

async function testAPI() {
  try {
    const { ChatOpenAI } = await import("@langchain/openai");
    
    const llm = new ChatOpenAI({
      model: "gpt-3.5-turbo",
      temperature: 0.2,
      apiKey: process.env.OPENAI_API_KEY,
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
      },
    });
    
    console.log("✅ ChatOpenAI instance created");
    
    // Simple test call
    console.log("🧪 Testing simple API call...");
    
    const response = await llm.invoke("Hello, respond with just 'OK'");
    console.log("✅ API call successful!");
    console.log("Response:", response.content);
    
  } catch (error) {
    console.error("❌ API call failed:");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    
    if (error.message.includes("400")) {
      console.error("\n🚨 400 Error Analysis:");
      console.error("- Check if API key is valid");
      console.error("- Check if base URL is correct");
      console.error("- Check if model is available");
    }
    
    if (error.message.includes("401")) {
      console.error("\n🚨 401 Error Analysis:");
      console.error("- API key is invalid or expired");
      console.error("- Check your OpenRouter account");
    }
    
    console.error("\n🔍 Full error object:");
    console.error(error);
  }
}

testAPI();
