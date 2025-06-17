// fixed-agent-test.ts
import { config } from "dotenv";
config();

console.log("🔧 === FIXED AGENT TEST ===");

async function testFixedAgent() {
  try {
    // 1. Test Tool First
    console.log("\n1️⃣ Testing Fixed Tool...");
    const { productSearchTool } = await import("./src/tools/product-search-tool.js");
    
    const testInput = {
      kategorie: "televisor",
      presupuesto_max: 1000000,
      usar_vector_search: true
    };
    
    console.log("Testing tool with:", testInput);
    const toolResult = await productSearchTool.call(testInput);
    console.log("✅ Tool result preview:", toolResult?.substring(0, 300) + "...");
    
    // 2. Test Agent with Correct Input Format
    console.log("\n2️⃣ Testing Agent with Correct Input...");
    const { createAlkostoAgent } = await import("./src/agent.js");
    
    const agent = await createAlkostoAgent();
    console.log("✅ Agent created");
    
    // Test mit korrektem Input Format
    console.log("\n3️⃣ Testing Simple Greeting...");
    try {
      // KORRIGIERT: Nur EIN Parameter mit string input
      const response1 = await agent.invoke("Hola, como estas?");
      console.log("✅ Simple greeting successful!");
      console.log("Response:", response1.output);
    } catch (error1) {
      console.log("❌ Simple greeting failed, trying alternative format...");
      try {
        // Alternative: Object mit input key
        const response2 = await agent.invoke({ input: "Hola, como estas?" });
        console.log("✅ Alternative format successful!");
        console.log("Response:", response2.output);
      } catch (error2) {
        console.error("❌ Both formats failed:");
        console.error("Error 1:", error1.message);
        console.error("Error 2:", error2.message);
        return;
      }
    }
    
    // 4. Test Product Search
    console.log("\n4️⃣ Testing Product Search...");
    try {
      const productResponse = await agent.invoke("Busco un televisor barato");
      console.log("✅ Product search successful!");
      console.log("Response:", productResponse.output?.substring(0, 400) + "...");
      
      // Check if it contains product info
      const hasProducts = productResponse.output?.includes('$') || 
                         productResponse.output?.includes('precio') ||
                         productResponse.output?.includes('COP');
      
      if (hasProducts) {
        console.log("🎉 SUCCESS: Found product information!");
      } else {
        console.log("⚠️ No product information found, but no error");
      }
      
    } catch (productError) {
      console.error("❌ Product search failed:", productError.message);
      console.error("Stack:", productError.stack?.substring(0, 500));
    }
    
  } catch (importError) {
    console.error("❌ Import failed:", importError.message);
  }
}

testFixedAgent();
