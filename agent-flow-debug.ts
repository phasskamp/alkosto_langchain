// agent-flow-debug.ts
import { config } from "dotenv";
config();

console.log("🔧 === AGENT FLOW DEBUG ===");

async function debugAgentFlow() {
  try {
    // 1. Test Tool Import
    console.log("\n1️⃣ Testing Tool Import...");
    const { productSearchTool } = await import("./src/tools/product-search-tool.js");
    console.log("✅ Tool imported successfully");
    console.log("Tool name:", productSearchTool.name);
    
    // 2. Test Tool Function Directly
    console.log("\n2️⃣ Testing Tool Function Directly...");
    const testInput = {
      kategorie: "televisor",
      presupuesto_max: 1000000,
      usar_vector_search: true
    };
    
    console.log("Test input:", testInput);
    
    try {
      const toolResult = await productSearchTool.call(testInput);
      console.log("✅ Tool call successful!");
      console.log("Result preview:", toolResult?.substring(0, 200) + "...");
    } catch (toolError) {
      console.error("❌ Tool call failed:", toolError.message);
      return; // Stop here if tool fails
    }
    
    // 3. Test Agent Creation
    console.log("\n3️⃣ Testing Agent Creation...");
    const { createAlkostoAgent } = await import("./src/agent.js");
    
    const agent = await createAlkostoAgent();
    console.log("✅ Agent created successfully");
    
    // 4. Test Simple Agent Call (no tools)
    console.log("\n4️⃣ Testing Simple Agent Call...");
    try {
      const simpleResponse = await agent.invoke({
        input: "Hola, como estas?", // Simple greeting, shouldn't trigger tools
        chat_history: []
      });
      console.log("✅ Simple agent call successful!");
      console.log("Response:", simpleResponse.output?.substring(0, 200) + "...");
    } catch (simpleError) {
      console.error("❌ Simple agent call failed:", simpleError.message);
      console.error("This suggests the agent itself has issues");
      return;
    }
    
    // 5. Test Agent Call WITH Tool Trigger
    console.log("\n5️⃣ Testing Agent Call WITH Tool Trigger...");
    try {
      const toolResponse = await agent.invoke({
        input: "Busco un televisor barato", // Should trigger product search tool
        chat_history: [],
        usar_vector_search: true
      });
      console.log("✅ Tool-triggering agent call successful!");
      console.log("Response:", toolResponse.output?.substring(0, 300) + "...");
    } catch (toolTriggerError) {
      console.error("❌ Tool-triggering agent call failed:", toolTriggerError.message);
      console.error("Error type:", toolTriggerError.constructor.name);
      
      // Analyze the error
      if (toolTriggerError.message.includes("400")) {
        console.error("\n🚨 400 Error Analysis:");
        console.error("- This happens AFTER tool execution");
        console.error("- Likely in the LLM response generation");
        console.error("- Check if tool output is malformed");
      }
      
      console.error("\n🔍 Full error:");
      console.error(toolTriggerError);
    }
    
  } catch (importError) {
    console.error("❌ Import failed:", importError.message);
  }
}

debugAgentFlow();
