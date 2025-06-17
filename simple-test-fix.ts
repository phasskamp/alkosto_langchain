// simple-test-fix.ts - Umgeht das Memory Problem
import { config } from "dotenv";
config();

console.log("🔧 === SIMPLE TEST FIX ===");
console.log("🧩 USE_VECTOR_SEARCH =", process.env.USE_VECTOR_SEARCH);

async function simpleTestFix() {
  try {
    // 1. Test StructuredTool directly first
    console.log("\n1️⃣ Testing StructuredTool with improved filter...");
    const { ProductSearchTool } = await import("./src/tools/product-search-tool-fixed.js");
    
    const toolInstance = new ProductSearchTool();
    console.log("✅ StructuredTool created");
    
    const testInput = {
      kategorie: "televisor",
      presupuesto_max: 1500000,
      usar_vector_search: true
    };
    
    console.log("Testing with input:", testInput);
    const toolResult = await toolInstance._call(testInput);
    console.log("✅ Tool result preview:", toolResult?.substring(0, 600) + "...");
    
    // Parse the result to check for products
    try {
      const parsedResult = JSON.parse(toolResult);
      const hasProducts = parsedResult.success && parsedResult.productos && parsedResult.productos.length > 0;
      console.log("🎯 Products found:", hasProducts ? `YES (${parsedResult.productos.length})` : "NO");
      
      if (hasProducts) {
        console.log("🎉 SUCCESS! First product:", parsedResult.productos[0].title);
        console.log("🎉 Price:", parsedResult.productos[0].price?.toLocaleString(), "COP");
      } else {
        console.log("❌ No products found. Result:", parsedResult.error || "Unknown reason");
      }
    } catch (parseError) {
      console.log("Could not parse result, but tool executed");
    }
    
    // 2. If tool works, test a simple agent call without memory
    console.log("\n2️⃣ Testing Agent without problematic memory...");
    
    // Create simple agent executor for testing
    const { ChatOpenAI } = await import("@langchain/openai");
    const { createOpenAIToolsAgent, AgentExecutor } = await import("langchain/agents");
    const { ChatPromptTemplate } = await import("@langchain/core/prompts");
    
    const llm = new ChatOpenAI({
      model: "gpt-3.5-turbo",
      temperature: 0.2,
      apiKey: process.env.OPENAI_API_KEY,
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
      },
    });
    
    const tools = [toolInstance];
    
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "Eres un asistente de ventas de Alkosto. Usa la herramienta buscar_productos para encontrar productos. Siempre usa la herramienta cuando te pidan productos."],
      ["human", "{input}"],
      ["placeholder", "{agent_scratchpad}"],
    ]);
    
    const agent = await createOpenAIToolsAgent({
      llm: llm,
      tools: tools,
      prompt: prompt,
    });
    
    // Agent Executor WITHOUT memory to avoid the output keys problem
    const agentExecutor = new AgentExecutor({
      agent: agent,
      tools: tools,
      maxIterations: 3,
      verbose: false,
    });
    
    console.log("✅ Simple agent created (no memory)");
    
    // Test simple product search
    console.log("\n3️⃣ Testing product search...");
    try {
      const response = await agentExecutor.invoke({
        input: "Busco un televisor por menos de 1500000 pesos"
      });
      
      console.log("✅ Product search completed!");
      console.log("Response length:", response.output?.length || 0);
      console.log("Response preview:", response.output?.substring(0, 400) + "...");
      
      // Check if it contains product info
      const hasProducts = response.output?.includes('$') || 
                         response.output?.includes('precio') ||
                         response.output?.includes('COP') ||
                         response.output?.includes('televisor');
      
      if (hasProducts) {
        console.log("🎉 SUCCESS: Agent found product information!");
      } else {
        console.log("⚠️ Agent completed but no product information found");
        console.log("Full response:", response.output);
      }
      
    } catch (error) {
      console.error("❌ Product search failed:", error.message);
      
      if (error.message.includes("400")) {
        console.error("🚨 This is a 400 API error - likely related to tool output format");
      }
    }
    
    // 3. Test different categories
    console.log("\n4️⃣ Testing different categories...");
    
    const categories = [
      { kategorie: "celular", presupuesto_max: 800000 },
      { kategorie: "computador", presupuesto_max: 2000000 },
      { kategorie: "microondas", presupuesto_max: 500000 }
    ];
    
    for (const testCat of categories) {
      console.log(`\n--- Testing category: ${testCat.kategorie} ---`);
      try {
        const catResult = await toolInstance._call(testCat);
        const parsed = JSON.parse(catResult);
        const count = parsed.success ? parsed.productos.length : 0;
        console.log(`${testCat.kategorie}: ${count} products found`);
        
        if (count > 0) {
          console.log(`Sample: ${parsed.productos[0].title} - $${parsed.productos[0].price?.toLocaleString()}`);
        }
      } catch (catError) {
        console.log(`${testCat.kategorie}: Error - ${catError.message}`);
      }
    }
    
  } catch (importError) {
    console.error("❌ Import failed:", importError.message);
  }
}

simpleTestFix();
