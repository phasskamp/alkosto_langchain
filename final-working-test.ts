// final-working-test.ts
import { config } from "dotenv";
config();

console.log("🔧 === FINAL WORKING TEST ===");
console.log("🧩 USE_VECTOR_SEARCH =", process.env.USE_VECTOR_SEARCH);

async function finalWorkingTest() {
  try {
    // 1. Test New StructuredTool
    console.log("\n1️⃣ Testing New StructuredTool...");
    const { ProductSearchTool } = await import("./src/tools/product-search-tool-fixed.js");
    
    const toolInstance = new ProductSearchTool();
    console.log("✅ StructuredTool created");
    
    const testInput = {
      kategorie: "televisor",
      presupuesto_max: 1000000,
      usar_vector_search: true
    };
    
    console.log("Testing with input:", testInput);
    const toolResult = await toolInstance._call(testInput);
    console.log("✅ Tool result preview:", toolResult?.substring(0, 400) + "...");
    
    // Check if products were found
    const hasProducts = toolResult.includes('"success": true') && toolResult.includes('"productos"');
    console.log("Has products:", hasProducts ? "✅ YES" : "❌ NO");
    
    // 2. Test Agent Creation with New Tool
    console.log("\n2️⃣ Testing Agent with New Tool...");
    
    // We need to update the agent to use the new tool
    // For now, let's create a simple direct test
    
    console.log("\n3️⃣ Direct Agent Test with Correct Format...");
    const { createAlkostoAgent } = await import("./src/agent.js");
    
    const agent = await createAlkostoAgent();
    console.log("✅ Agent created");
    
    // Test 1: Simple greeting with correct format
    console.log("\n4️⃣ Testing Simple Greeting (correct format)...");
    try {
      const response1 = await agent.invoke({ 
        input: "Hola, como estas?"
      });
      console.log("✅ Simple greeting successful!");
      console.log("Response:", response1.output);
    } catch (error1) {
      console.error("❌ Simple greeting failed:", error1.message);
      return;
    }
    
    // Test 2: Product search with correct format
    console.log("\n5️⃣ Testing Product Search (correct format)...");
    try {
      const response2 = await agent.invoke({ 
        input: "Busco un televisor por menos de 1000000 pesos"
      });
      console.log("✅ Product search completed!");
      console.log("Response length:", response2.output?.length || 0);
      console.log("Response preview:", response2.output?.substring(0, 500) + "...");
      
      // Check if it contains product info
      const hasProducts = response2.output?.includes('$') || 
                         response2.output?.includes('precio') ||
                         response2.output?.includes('COP') ||
                         response2.output?.includes('televisor');
      
      if (hasProducts) {
        console.log("🎉 SUCCESS: Found product information!");
      } else {
        console.log("⚠️ No product information found in response");
      }
      
    } catch (error2) {
      console.error("❌ Product search failed:", error2.message);
      
      // If it's a 400 error, it means the agent tried to call the tool but failed
      if (error2.message.includes("400")) {
        console.error("🚨 This is likely a tool integration issue");
        console.error("The agent tried to use the tool but got a 400 error");
      }
    }
    
  } catch (importError) {
    console.error("❌ Import failed:", importError.message);
  }
}

finalWorkingTest();
