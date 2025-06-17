// FINAL Alkosto Agent mit ECHTER LLM + Tool Integration
import dotenv from "dotenv";
dotenv.config();

import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { enhancedProductSearchTool } from "./tools/product-search-tool-enhanced.js";

async function createFinalAlkostoAgent() {
  console.log("🧠 Creating FINAL Alkosto Agent (Real LLM + Enhanced Tool)...");

  const llm = new ChatOpenAI({
    modelName: "openai/gpt-3.5-turbo",
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.3,
    maxTokens: 500,  // Longer responses
    streaming: false,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Alkosto Final Agent"
      }
    }
  });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system", 
      `Eres un experto asistente de ventas de Alkosto, la tienda líder en Colombia.

PERSONALIDAD:
- Amigable, profesional y conocedor de productos
- Respondes SIEMPRE en español perfecto y natural  
- Eres un vendedor consultivo que entiende las necesidades del cliente
- Usas emojis ocasionalmente para hacer la conversación más amigable

INSTRUCCIONES PARA HERRAMIENTAS:
- USA SIEMPRE la herramienta buscar_productos_enhanced para buscar productos
- La herramienta requiere un JSON string con: kategorie, presupuesto_max, marca opcional
- Si el cliente menciona una marca específica, inclúyela en marca
- Si no especifica presupuesto, usa un límite razonable según la categoría

CATEGORÍAS:
- televisor: TV, smart TV, televisor
- celular: celular, smartphone, móvil
- computador: computador, laptop, portátil  
- lavadora: lavadora

FORMATO DE RESPUESTA:
1. Saluda cordialmente
2. Usa la herramienta para buscar productos
3. Presenta los productos de manera atractiva
4. Destaca características y relación calidad-precio
5. Usa la información de brand_intelligence para sugerencias
6. Termina con una pregunta para continuar la conversación

EJEMPLOS DE FORMATO:
- kategorie televisor presupuesto_max 2000000 marca samsung
- kategorie celular presupuesto_max 800000
- kategorie computador presupuesto_max 3000000

¡Tu objetivo es ayudar al cliente a encontrar el producto perfecto!`
    ],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"]
  ]);

  const agent = await createOpenAIToolsAgent({
    llm,
    tools: [enhancedProductSearchTool],
    prompt
  });

  const executor = new AgentExecutor({
    agent,
    tools: [enhancedProductSearchTool],
    verbose: false,
    maxIterations: 3,
    returnIntermediateSteps: false,
    handleParsingErrors: true
  });

  console.log("✅ FINAL Alkosto Agent ready with REAL LLM!");
  return executor;
}

async function testFinalAgent() {
  console.log("🎉 TESTING FINAL ALKOSTO AGENT WITH REAL LLM\n");
  
  const agent = await createFinalAlkostoAgent();
  
  const testQueries = [
    "Hola! Busco un televisor Samsung bueno pero no muy caro, máximo 2 millones",
    "Necesito un celular económico para mi hijo estudiante",
    "¿Qué laptop me recomiendas para trabajar desde casa?"
  ];
  
  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log("=".repeat(80));
    console.log(`🗣️ CLIENTE: ${query}`);
    console.log("=".repeat(80));
    
    try {
      const startTime = Date.now();
      
      // ✅ REAL LLM + Tool Integration
      const result = await agent.invoke({ input: query });
      
      const responseTime = Date.now() - startTime;
      
      console.log(`🤖 ALKOSTO AGENT (REAL LLM):`);
      console.log(result.output);
      console.log(`\n⚡ Tiempo de respuesta: ${responseTime}ms`);
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    console.log("\n");
  }
  
  console.log("🎉 FINAL Agent Testing Complete!");
  console.log("🚀 READY FOR PRODUCTION DEPLOYMENT!");
}

export { createFinalAlkostoAgent };

if (import.meta.url === `file://${process.argv[1]}`) {
  testFinalAgent().catch(console.error);
}