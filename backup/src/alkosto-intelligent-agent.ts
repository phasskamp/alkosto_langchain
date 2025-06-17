// alkosto-intelligent-agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BufferMemory } from "langchain/memory";
import { productSearchTool } from "./tools/product-search-tool.js";

// 🧠 Context Management
interface ConversationContext {
  kategorie?: string;
  marca?: string;
  presupuesto_max?: number;
  uso_principal?: string;
  espacio_disponible?: string;
  [key: string]: any;
}

// 🤖 Enhanced Agent Setup
export async function createIntelligentAlkostoAgent() {
  console.log("🚀 Creando Alkosto Intelligent Sales Agent...");

  const llm = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0.2,
    openAIApiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
    },
  });

  const tools = [productSearchTool];
  const memory = new BufferMemory({
    returnMessages: true,
    memoryKey: "chat_history",
    outputKey: "output",
  });

  // 🎯 Fixed prompt with all required placeholders
  const prompt = ChatPromptTemplate.fromTemplate(`
    Eres un asesor de ventas experto de Alkosto Colombia.
    
    Tu misión es ayudar a los clientes a encontrar el producto perfecto.
    
    ## 🎯 Proceso:
    1. Si el cliente no ha especificado qué busca, pregunta amablemente
    2. Si necesitas más info (presupuesto, uso, etc), haz preguntas específicas
    3. Solo usa las herramientas cuando tengas suficiente información
    
    ## 🗣️ Estilo:
    - Usa español colombiano cálido y natural
    - Sé conversacional, no robótico
    - Haz máximo 2 preguntas por respuesta
    
    Herramientas disponibles: {tools}
    
    Historial de conversación: {chat_history}
    
    Entrada del humano: {input}
    
    {agent_scratchpad}
  `);

  const agent = await createOpenAIToolsAgent({
    llm,
    tools,
    prompt,
  });

  const executor = new AgentExecutor({
    agent,
    tools,
    memory,
    verbose: true,
    maxIterations: 3,
  });

  return {
    async consultAndRecommend(input: string) {
      console.log(`\n🗣️ Cliente: "${input}"\n`);
      try {
        const result = await executor.invoke({ input });
        return {
          ...result,
          success: true
        };
      } catch (error) {
        console.error("❌ Error:", error.message);
        return {
          input,
          output: "Disculpa, tuve un problema técnico. ¿Podrías repetir tu consulta?",
          error: true
        };
      }
    },
    memory,
    executor
  };
}

// 🧪 Enhanced Test with multiple scenarios
export async function testIntelligentConsultation() {
  console.log("🧪 Testing Alkosto Intelligent Agent...");
  
  try {
    const agent = await createIntelligentAlkostoAgent();
    console.log("✅ Agent created successfully");
    
    const testCases = [
      "Hola",
      "Busco un televisor", 
      "Samsung, menos de 2 millones"
    ];
    
    for (let i = 0; i < testCases.length; i++) {
      const testInput = testCases[i];
      console.log(`\n🎯 Test ${i + 1}: "${testInput}"`);
      console.log("-".repeat(40));
      
      const result = await agent.consultAndRecommend(testInput);
      
      if (result.success !== false) {
        console.log("🤖 Respuesta:", result.output);
        console.log("✅ Test exitoso");
      } else {
        console.log("❌ Error en test:", result.output);
      }
      
      if (i < testCases.length - 1) {
        console.log("\n" + "=".repeat(50));
      }
    }
    
    console.log("\n🎉 Todos los tests completados!");
    
  } catch (error) {
    console.error("❌ Error en setup:", error.message);
  }
}
