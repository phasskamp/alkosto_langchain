import { createAlkostoGraduatedAgent } from "./src/alkosto-graduated-search-agent.js";

async function testCompleteAgent() {
  console.log("🤖 Testing kompletter Alkosto Agent...");
  
  const agent = await createAlkostoGraduatedAgent();
  
  const testConversations = [
    "Hola, busco un televisor Samsung",
    "Mi presupuesto es de 2 millones",
    "¿Qué celulares Samsung tienen disponibles?"
  ];
  
  for (const input of testConversations) {
    console.log(`
👤 Usuario: ${input}`);
    console.log("🤖 Agent:");
    
    try {
      const response = await agent.invoke({ input });
      console.log(response.output);
    } catch (error) {
      console.log("❌ Error:", error.message);
    }
    
    console.log("-".repeat(50));
  }
}

testCompleteAgent().catch(console.error);
