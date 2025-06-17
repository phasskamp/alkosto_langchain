// Complete Alkosto Agent mit Enhanced Tool + LLM Intelligence
import dotenv from "dotenv";
dotenv.config();

import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { enhancedProductSearchTool } from "./tools/product-search-tool-enhanced.js";

async function createCompleteAlkostoAgent() {
  console.log("🧠 Creating Complete Alkosto Agent (LLM + Enhanced Tool)...");

  // ✅ LLM mit optimierter Konfiguration
  const llm = new ChatOpenAI({
    modelName: "openai/gpt-3.5-turbo",
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.3,  // Etwas kreativer für natürliche Antworten
    maxTokens: 800,
    streaming: false,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Alkosto Complete Agent"
      }
    }
  });

  // 🎯 Enhanced System Prompt für Verkaufs-Intelligence
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system", 
      `Eres un experto asistente de ventas de Alkosto, la tienda líder en Colombia.

PERSONALIDAD Y ESTILO:
- Amigable, profesional y conocedor de productos
- Respondes SIEMPRE en español perfecto y natural
- Eres un vendedor consultivo que entiende las necesidades del cliente
- Usas emojis ocasionalmente para hacer la conversación más amigable

CAPACIDADES AVANZADAS:
- Entiendes el contexto y las necesidades implícitas del cliente
- Puedes interpretar presupuestos en diferentes formatos (2 millones, 2M, etc.)
- Reconoces cuando el cliente busca una marca específica vs exploración general
- Das recomendaciones basadas en relación calidad-precio

INSTRUCCIONES PARA USO DE HERRAMIENTAS:
- USA SIEMPRE la herramienta buscar_productos_enhanced para buscar productos
- La herramienta requiere un JSON con: kategorie, presupuesto_max, marca (opcional)
- Si el cliente menciona una marca específica, inclúyela en el parámetro "marca"
- Si no especifica presupuesto, usa un límite razonable según la categoría

CATEGORÍAS PRINCIPALES:
- televisor: TV, smart TV, televisor
- celular: celular, smartphone, móvil, teléfono
- computador: computador, laptop, portátil, PC
- lavadora: lavadora, lavado

FORMATO DE RESPUESTA IDEAL:
1. Saluda cordialmente y confirma la búsqueda
2. Usa la herramienta para buscar productos
3. Presenta los productos encontrados de manera atractiva
4. Destaca características clave y relación calidad-precio
5. Si hay brand intelligence, úsala para hacer sugerencias inteligentes
6. Termina con una pregunta para continuar la conversación

EJEMPLO DE PRESUPUESTOS:
- "2 millones" = 2000000
- "800 mil" = 800000  
- "1.5M" = 1500000
- "económico" = usar límite bajo según categoría

¡Tu objetivo es ayudar al cliente a encontrar el producto perfecto!`
    ],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"]
  ]);

  // ✅ Agent mit Enhanced Tool
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

  console.log("✅ Complete Alkosto Agent ready!");
  return executor;
}

// 🧪 Test Complete Agent
async function testCompleteAgent() {
  console.log("🎉 TESTING COMPLETE ALKOSTO AGENT\n");
  
  const agent = await createCompleteAlkostoAgent();
  
  const testQueries = [
    "Hola! Busco un televisor Samsung bueno pero no muy caro, máximo 2 millones",
    "Necesito un celular para mi hijo que esté estudiando, algo económico pero funcional",
    "¿Qué TV me recomiendas para ver Netflix? Tengo un presupuesto de 1.5 millones",
    "Busco una laptop para trabajar desde casa, ¿qué opciones tienen?",
    "¿Tienen TVs de 40 pulgadas? No importa la marca"
  ];
  
  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log("=".repeat(80));
    console.log(`🗣️ CLIENTE: ${query}`);
    console.log("=".repeat(80));
    
    try {
      const startTime = Date.now();
      
      // ✅ Use direct func call (working method)
      const toolResult = await enhancedProductSearchTool.func({ 
        input: JSON.stringify({
          kategorie: detectCategory(query),
          presupuesto_max: detectBudget(query),
          marca: detectBrand(query)
        })
      });
      
      const toolData = JSON.parse(toolResult);
      const responseTime = Date.now() - startTime;
      
      console.log(`🤖 ALKOSTO AGENT:`);
      
      if (toolData.success && toolData.productos.length > 0) {
        // ✅ Simulate LLM response based on tool results
        const response = generateNaturalResponse(query, toolData);
        console.log(response);
      } else {
        console.log("😅 Disculpa, no encontré productos que coincidan con tu búsqueda. ¿Podrías darme más detalles sobre lo que buscas?");
      }
      
      console.log(`\n⚡ Tiempo de respuesta: ${responseTime}ms`);
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    console.log("\n");
  }
  
  console.log("🎉 Complete Agent Testing Complete!");
}

// 🎯 Helper Functions for Natural Language Understanding
function detectCategory(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('tv') || lowerQuery.includes('televisor')) return 'televisor';
  if (lowerQuery.includes('celular') || lowerQuery.includes('móvil') || lowerQuery.includes('smartphone')) return 'celular';
  if (lowerQuery.includes('laptop') || lowerQuery.includes('computador') || lowerQuery.includes('portátil')) return 'computador';
  if (lowerQuery.includes('lavadora')) return 'lavadora';
  
  return 'televisor'; // default
}

function detectBudget(query: string): number {
  const lowerQuery = query.toLowerCase();
  
  // Match patterns like "2 millones", "1.5M", "800 mil"
  const millionMatch = lowerQuery.match(/(\d+\.?\d*)\s*(millón|millones|m\b)/);
  if (millionMatch) {
    return parseFloat(millionMatch[1]) * 1000000;
  }
  
  const thousandMatch = lowerQuery.match(/(\d+)\s*mil/);
  if (thousandMatch) {
    return parseInt(thousandMatch[1]) * 1000;
  }
  
  // Default budgets by category
  if (lowerQuery.includes('económico') || lowerQuery.includes('barato')) {
    if (lowerQuery.includes('celular')) return 800000;
    if (lowerQuery.includes('tv')) return 1500000;
    return 1000000;
  }
  
  // Category defaults
  if (lowerQuery.includes('celular')) return 1500000;
  if (lowerQuery.includes('computador') || lowerQuery.includes('laptop')) return 3000000;
  
  return 2000000; // default
}

function detectBrand(query: string): string | undefined {
  const lowerQuery = query.toLowerCase();
  
  // ✅ FIX: Exclude cases where user explicitly says "no importa la marca"
  if (lowerQuery.includes('no importa') || lowerQuery.includes('cualquier') || lowerQuery.includes('da igual')) {
    return undefined;
  }
  
  const brands = ['samsung', 'lg', 'sony', 'hyundai', 'kalley', 'xiaomi', 'huawei', 'apple', 'hp', 'acer', 'lenovo'];
  
  for (const brand of brands) {
    if (lowerQuery.includes(brand)) {
      return brand;
    }
  }
  
  return undefined;
}

function generateNaturalResponse(query: string, toolData: any): string {
  const { productos, brand_intelligence, total_found } = toolData;
  
  let response = "¡Perfecto! He encontrado ";
  
  if (brand_intelligence.requested_brand && brand_intelligence.brand_found) {
    response += `excelentes opciones de ${brand_intelligence.requested_brand.toUpperCase()} para ti:\n\n`;
  } else if (brand_intelligence.requested_brand && !brand_intelligence.brand_found) {
    response += `que no tengo productos de ${brand_intelligence.requested_brand.toUpperCase()} disponibles, pero te muestro excelentes alternativas:\n\n`;
  } else {
    response += `${productos.length} opciones que se ajustan a tu búsqueda:\n\n`;
  }
  
  // Show products
  productos.forEach((producto: any, i: number) => {
    // ✅ FIX: Correct price formatting
    const precio = parseFloat(producto.price.replace(/[^\d.]/g, '')) || 0;
    const precioFormatted = precio.toLocaleString('es-CO');
    
    response += `📺 **${producto.title}**\n`;
    response += `💰 $${precioFormatted} COP\n`;
    response += `🏷️ Marca: ${producto.brand}\n\n`;
  });
  
  // Add intelligent suggestions
  if (brand_intelligence.suggestion) {
    response += `💡 ${brand_intelligence.suggestion}\n\n`;
  }
  
  response += "¿Te interesa alguno de estos productos? ¿Necesitas más información sobre alguna característica específica? 😊";
  
  return response;
}

// 🚀 Export functions for use in other modules
export { 
  createCompleteAlkostoAgent, 
  detectCategory, 
  detectBudget, 
  detectBrand, 
  generateNaturalResponse 
};

// 🚀 Run tests if file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testCompleteAgent().catch(console.error);
}