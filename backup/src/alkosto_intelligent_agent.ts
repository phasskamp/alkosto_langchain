// alkosto-intelligent-agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BufferMemory } from "langchain/memory";
import { productSearchTool } from "./tools/product-search-tool.js";

// 🧠 Consultation Intelligence: LLM decides when to ask vs recommend
const CONSULTATION_PROMPT = `Eres un asesor de ventas experto de Alkosto Colombia. Tu misión es ayudar a los clientes a encontrar el producto perfecto mediante una consulta inteligente.

## 🎯 Filosofía de Consulta
- NUNCA hagas recomendaciones precipitadas
- Haz preguntas inteligentes antes de buscar productos
- Usa tu conocimiento sobre diferentes categorías de productos
- Sé empático y profesional

## 🔍 Proceso de Decisión
Antes de usar cualquier herramienta:

1. **Analiza la información disponible:**
   - ¿Qué categoría de producto busca el cliente?
   - ¿Qué información crítica falta para una buena recomendación?
   - ¿Hay suficiente contexto para hacer una búsqueda útil?

2. **Determina la acción apropiada:**
   - Si falta información clave → Haz 1-2 preguntas específicas
   - Si tienes suficiente información → Usa la herramienta de búsqueda

## 📋 Información Crítica por Categoría

**Para TVs/Televisores:**
- Uso principal (películas, deportes, gaming, TV normal)
- Tamaño del espacio y distancia de visualización
- Condiciones de luz del ambiente
- Presupuesto aproximado

**Para Electrodomésticos (lavadoras, neveras, etc.):**
- Tamaño del hogar/familia
- Espacio disponible
- Características específicas importantes
- Frecuencia de uso
- Presupuesto

**Para Tecnología (laptops, celulares, etc.):**
- Uso principal (trabajo, estudio, gaming, uso básico)
- Movilidad requerida
- Programas/aplicaciones específicas
- Nivel técnico del usuario
- Presupuesto

**Para Gaming/Consolas:**
- Tipo de juegos preferidos
- Edad del usuario
- Experiencia con gaming
- TV/monitor disponible
- Presupuesto

## 🗣️ Estilo de Comunicación
- Usa español colombiano natural y cálido
- Haz máximo 2 preguntas por respuesta
- Explica brevemente por qué la información es importante
- Sé conversacional, no robótico

## ⚠️ Reglas Importantes
- NO uses la herramienta de búsqueda sin información suficiente
- NO asumas presupuestos o preferencias del cliente
- SÍ explica el valor de hacer buenas preguntas
- SÍ usa tu conocimiento general sobre productos

## 🛠️ Uso de Herramientas
Solo usa la herramienta 'product_search' cuando tengas:
- Categoría clara del producto
- Al menos 2-3 criterios específicos (tamaño, uso, presupuesto, etc.)
- Confianza de que puedes hacer una recomendación útil

Herramientas disponibles: {tools}

Historial de conversación: {chat_history}

Entrada del humano: {input}

Reflexión del agente: {agent_scratchpad}`;

// 🧠 Context Management - inspired by colleague's simple approach
interface ConversationContext {
  kategorie?: string;
  marca?: string;
  presupuesto_max?: number;
  uso_principal?: string;
  espacio_disponible?: string;
  [key: string]: any;
}

// 🚀 Performance Configuration
const USE_COMBINED_PROMPT = true; // Toggle for A/B testing

// 🔒 Safe JSON Parsing - Production-ready error handling
function safeJsonParse<T>(input: string, fallback: T, context: string = ""): T {
  try {
    const parsed = JSON.parse(input);
    
    // Additional validation for our specific use cases
    if (context === "multitask" && !parsed.hasOwnProperty('busqueda_viable')) {
      console.warn("⚠️ JSON missing required field 'busqueda_viable', using fallback");
      return fallback;
    }
    
    return parsed;
  } catch (err) {
    console.warn(`❌ Error parsing JSON in ${context}:`, err);
    console.warn(`📝 Input was: ${input.slice(0, 200)}...`);
    return fallback;
  }
}

// 🎯 Combined JSON Multitask Prompt - Optimized for efficiency with robust error handling
async function processUserInputCombined(
  llm: ChatOpenAI,
  userInput: string,
  currentContext: ConversationContext,
  chatHistory: string
): Promise<{
  updatedContext: ConversationContext;
  shouldSearch: boolean;
  response?: string;
  searchParams?: any;
  missingInfo?: string[];
  reasoning?: string;
}> {
  
  const multitaskPrompt = `Eres un asesor experto de Alkosto. Analiza la entrada del cliente y realiza TODAS estas tareas en UN SOLO JSON:

ENTRADA DEL CLIENTE: "${userInput}"
CONTEXTO ACTUAL: ${JSON.stringify(currentContext)}
HISTORIAL RECIENTE: ${chatHistory.slice(-500)}

Responde SOLO en este formato JSON:
{
  "nueva_info": {
    "kategorie": "string o null (solo si explícitamente mencionado)",
    "marca": "string o null (solo si explícitamente mencionado)",
    "presupuesto_max": "number o null (solo si explícitamente mencionado)",
    "uso_principal": "string o null (solo si explícitamente mencionado)",
    "espacio_disponible": "string o null (solo si explícitamente mencionado)"
  },
  "busqueda_viable": "true si hay suficiente info para búsqueda útil, false si falta info crítica",
  "razon_analisis": "breve explicación de por qué sí o no se puede buscar",
  "parametros_busqueda": {
    "kategorie": "string o null",
    "presupuesto_max": "number o null"
  },
  "pregunta_siguiente": "si busqueda_viable es false, una pregunta natural en español colombiano",
  "informacion_faltante": ["array", "de", "aspectos", "faltantes"]
}

IMPORTANTE: 
- nueva_info: Solo incluye campos EXPLÍCITAMENTE mencionados por el cliente
- busqueda_viable: true solo si categoría + presupuesto están claros y son útiles
- pregunta_siguiente: Solo si busqueda_viable es false
- RESPONDE SOLO EN JSON VÁLIDO`;

  try {
    console.log("🧠 Ejecutando análisis combinado...");
    const startTime = Date.now();
    
    const response = await llm.invoke(multitaskPrompt);
    
    // 🔒 Safe JSON parsing with comprehensive fallback
    const fallbackResult = {
      nueva_info: {},
      busqueda_viable: false,
      razon_analisis: "Error en análisis - usando modo conservador",
      parametros_busqueda: null,
      pregunta_siguiente: "¿Podrías contarme un poco más sobre lo que buscas? Me ayudaría saber para qué lo vas a usar y qué presupuesto tienes en mente.",
      informacion_faltante: ["categoria", "presupuesto", "uso"]
    };
    
    const result = safeJsonParse(
      response.content as string, 
      fallbackResult, 
      "multitask"
    );
    
    const processingTime = Date.now() - startTime;
    console.log(`⚡ Análisis combinado completado en ${processingTime}ms`);
    
    // Merge context updates with validation
    const updatedContext = { ...currentContext };
    if (result.nueva_info && typeof result.nueva_info === 'object') {
      Object.keys(result.nueva_info).forEach(key => {
        if (result.nueva_info[key] !== null && result.nueva_info[key] !== undefined) {
          updatedContext[key] = result.nueva_info[key];
        }
      });
    }
    
    console.log("📝 Context actualizado:", updatedContext);
    console.log("🔍 Decisión de búsqueda:", result.busqueda_viable);
    console.log("💭 Razonamiento:", result.razon_analisis);
    
    // Additional validation for search parameters
    let validatedSearchParams = null;
    if (result.busqueda_viable && result.parametros_busqueda) {
      if (result.parametros_busqueda.kategorie && result.parametros_busqueda.presupuesto_max) {
        validatedSearchParams = result.parametros_busqueda;
      } else {
        console.warn("⚠️ Parámetros de búsqueda incompletos, requiriendo más información");
        result.busqueda_viable = false;
        result.pregunta_siguiente = result.pregunta_siguiente || "¿Podrías especificar qué tipo de producto buscas y tu presupuesto aproximado?";
      }
    }
    
    return {
      updatedContext,
      shouldSearch: result.busqueda_viable,
      response: result.pregunta_siguiente,
      searchParams: validatedSearchParams,
      missingInfo: Array.isArray(result.informacion_faltante) ? result.informacion_faltante : ["informacion_general"],
      reasoning: result.razon_analisis
    };
    
  } catch (error) {
    console.log("🚨 Error en análisis combinado, usando fallback completo:", error);
    return {
      updatedContext: currentContext,
      shouldSearch: false,
      response: "Disculpa, tuve un problema procesando tu consulta. ¿Podrías contarme qué tipo de producto buscas y cuál es tu presupuesto aproximado?",
      missingInfo: ["categoria", "presupuesto"],
      reasoning: "Error técnico - modo fallback activado"
    };
  }
}

// 🔄 Legacy functions for A/B comparison (kept for backwards compatibility)
async function extractAndUpdateContext(
  llm: ChatOpenAI,
  userInput: string,
  currentContext: ConversationContext
): Promise<ConversationContext> {
  
  const extractionPrompt = `Extrae del mensaje del cliente SOLO la información explícitamente mencionada.

MENSAJE: "${userInput}"
CONTEXTO ACTUAL: ${JSON.stringify(currentContext)}

Responde SOLO en JSON con campos que el cliente mencionó:
{
  "kategorie": "string o null",
  "marca": "string o null", 
  "presupuesto_max": "number o null",
  "uso_principal": "string o null",
  "espacio_disponible": "string o null"
}

IMPORTANTE: Solo incluye campos si están EXPLÍCITAMENTE mencionados por el cliente.`;

  try {
    const extraction = await llm.invoke(extractionPrompt);
    const newData = JSON.parse(extraction.content as string);
    
    const updatedContext = { ...currentContext };
    Object.keys(newData).forEach(key => {
      if (newData[key] !== null && newData[key] !== undefined) {
        updatedContext[key] = newData[key];
      }
    });
    
    return updatedContext;
    
  } catch (error) {
    console.log("⚠️ Context extraction error, keeping current context");
    return currentContext;
  }
}

async function shouldSearchProducts(
  llm: ChatOpenAI, 
  userInput: string, 
  context: ConversationContext,
  chatHistory: string
): Promise<{ shouldSearch: boolean; response?: string; searchParams?: any; missingInfo?: string[] }> {
  
  const hasBasicInfo = context.kategorie && context.presupuesto_max;
  
  if (hasBasicInfo) {
    const validationPrompt = `Contexto del cliente: ${JSON.stringify(context)}

¿Es suficiente esta información para hacer una recomendación de producto útil y específica?

Responde JSON:
{
  "busqueda_viable": true/false,
  "parametros_busqueda": {
    "kategorie": "string",
    "presupuesto_max": number
  }
}`;

    try {
      const validation = await llm.invoke(validationPrompt);
      const result = JSON.parse(validation.content as string);
      
      if (result.busqueda_viable) {
        return {
          shouldSearch: true,
          searchParams: result.parametros_busqueda
        };
      }
    } catch (error) {
      console.log("⚠️ Validation error");
    }
  }

  const consultationPrompt = `Contexto actual: ${JSON.stringify(context)}
El cliente busca: "${userInput}"

Responde JSON:
{
  "pregunta_directa": "string - pregunta natural",
  "informacion_faltante": ["lista", "de", "aspectos"]
}`;

  try {
    const consultation = await llm.invoke(consultationPrompt);
    const decision = JSON.parse(consultation.content as string);
    
    return {
      shouldSearch: false,
      response: decision.pregunta_directa,
      missingInfo: decision.informacion_faltante
    };
  } catch (error) {
    return {
      shouldSearch: false,
      response: "¿Podrías contarme un poco más sobre lo que buscas?"
    };
  }
}

// 🤖 Enhanced Agent with Consultation Intelligence
export async function createIntelligentAlkostoAgent() {
  console.log("🚀 Creando Alkosto Intelligent Sales Agent...");

  // LLM Configuration
  const llm = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0.2,
    openAIApiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
    },
  });

  // Enhanced tools with consultation logic
  const enhancedProductTool = {
    ...productSearchTool,
    func: async (input: string) => {
      console.log("🔍 Product search tool called with:", input);
      return await productSearchTool.func(input);
    }
  };

  const tools = [enhancedProductTool];

  // Memory for conversation context
  const memory = new BufferMemory({
    returnMessages: true,
    memoryKey: "chat_history",
    outputKey: "output",
  });

  // Intelligent prompt template
  const prompt = ChatPromptTemplate.fromTemplate(CONSULTATION_PROMPT);

  // Create the intelligent agent
  const agent = await createOpenAIToolsAgent({
    llm,
    tools,
    prompt,
  });

  // Agent executor with consultation middleware
  const executor = new AgentExecutor({
    agent,
    tools,
    memory,
    verbose: true,
    maxIterations: 3,
    returnIntermediateSteps: true,
  });

  // 🧠 Wrapper with enhanced consultation intelligence
  return {
    async consultAndRecommend(input: string) {
      try {
        console.log(`\n🗣️ Cliente: "${input}"\n`);

        // Get conversation history
        const chatHistory = await memory.chatHistory.getMessages();
        const historyString = chatHistory
          .map(msg => `${msg._getType()}: ${msg.content}`)
          .join('\n');

        // Initialize context if not exists
        if (!this.context) {
          this.context = {};
        }

        // 🎯 Choose processing method based on configuration
        let processResult;
        const startTime = Date.now();
        
        if (USE_COMBINED_PROMPT) {
          // 🚀 Optimized: Single LLM call for all analysis
          processResult = await processUserInputCombined(llm, input, this.context, historyString);
          this.context = processResult.updatedContext;
          
          const consultation = {
            shouldSearch: processResult.shouldSearch,
            response: processResult.response,
            searchParams: processResult.searchParams,
            missingInfo: processResult.missingInfo
          };
          
          console.log(`⚡ Procesamiento combinado: ${Date.now() - startTime}ms`);
          console.log("🧠 Razonamiento:", processResult.reasoning);
          
          if (!consultation.shouldSearch) {
            await memory.chatHistory.addUserMessage(input);
            await memory.chatHistory.addAIMessage(consultation.response || "");
            
            return {
              input,
              output: consultation.response,
              consultation_mode: true,
              context: this.context,
              missing_info: consultation.missingInfo,
              analysis: "Recopilando información necesaria",
              processing_mode: "combined_prompt",
              processing_time: Date.now() - startTime,
              reasoning: processResult.reasoning
            };
          }
          
          // Continue with search...
          const searchParams = consultation.searchParams;
          
        } else {
          // 🔄 Legacy: Multiple LLM calls (for A/B comparison)
          console.log("🔄 Usando método multi-step (legacy)");
          
          this.context = await extractAndUpdateContext(llm, input, this.context);
          const consultation = await shouldSearchProducts(llm, input, this.context, historyString);
          
          console.log(`⏱️ Procesamiento multi-step: ${Date.now() - startTime}ms`);
          
          if (!consultation.shouldSearch) {
            await memory.chatHistory.addUserMessage(input);
            await memory.chatHistory.addAIMessage(consultation.response || "");
            
            return {
              input,
              output: consultation.response,
              consultation_mode: true,
              context: this.context,
              missing_info: consultation.missingInfo,
              analysis: "Recopilando información necesaria",
              processing_mode: "multi_step",
              processing_time: Date.now() - startTime
            };
          }
          
          var searchParams = consultation.searchParams;
        }

        console.log("✅ Análisis: Información suficiente - procediendo con búsqueda");
        console.log("🎯 Parámetros de búsqueda:", searchParams);
        console.log("📊 Contexto completo:", this.context);

        // Enhanced tool input with full context
        const toolInput = JSON.stringify({
          ...searchParams,
          marca: this.context.marca,
          uso_principal: this.context.uso_principal,
          mostrar_alternativas: !this.context.marca
        });

        // Execute search with enhanced context
        const result = await executor.invoke({ 
          input: `Buscar productos con estos criterios: ${toolInput}. 
          Contexto adicional del cliente: ${JSON.stringify(this.context)}`
        });
        
        return {
          ...result,
          consultation_mode: false,
          context: this.context,
          search_params: searchParams,
          analysis: "Búsqueda de productos ejecutada con contexto completo",
          processing_mode: USE_COMBINED_PROMPT ? "combined_prompt" : "multi_step",
          processing_time: Date.now() - startTime
        };

      } catch (error) {
        console.error("❌ Error en consulta inteligente:", error);
        return {
          input,
          output: "Disculpa, tuve un problema técnico. ¿Podrías repetir tu consulta?",
          error: true,
          context: this.context || {}
        };
      }
    },

    // Context management (colleague's inspiration)
    context: {} as ConversationContext,
    
    // Reset context for new conversation
    resetContext() {
      this.context = {};
      console.log("🔄 Context reset for new conversation");
    },
    
    // Get current context state
    getContext() {
      return { ...this.context };
    },

    // Direct access to memory for session management
    memory,
    
    // Access to underlying executor for advanced use cases
    executor
  };
}

// 🧪 Enhanced testing with robust error monitoring
export async function testIntelligentConsultation() {
  console.log("🧪 Testing Enhanced Intelligent Consultation Logic");
  console.log(`🎯 Modo actual: ${USE_COMBINED_PROMPT ? '🚀 Combined Prompt (with Safe JSON)' : '🔄 Multi-Step (with Safe JSON)'}`);
  console.log("=" .repeat(70));

  const agent = await createIntelligentAlkostoAgent();
  const testCases = [
    "Hola",
    "Busco algo para mi mamá", 
    "Un televisor",
    "Samsung, menos de 2 millones",
    "¿Qué me recomiendas del más barato?",
    "Mejor algo para gaming",
  ];

  let totalProcessingTime = 0;
  let searchCount = 0;
  let consultationCount = 0;
  let errorCount = 0;
  let jsonParsingIssues = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testInput = testCases[i];
    console.log(`\n🎯 Test ${i + 1}: "${testInput}"`);
    console.log("-".repeat(50));
    
    const result = await agent.consultAndRecommend(testInput);
    
    console.log(`🤖 Respuesta: ${result.output}`);
    console.log(`🧠 Modo: ${result.consultation_mode ? '🔍 Consulta' : '🛒 Búsqueda'}`);
    console.log(`⚡ Procesamiento: ${result.processing_time}ms (${result.processing_mode})`);
    
    if (result.reasoning) {
      console.log(`💭 Razonamiento: ${result.reasoning}`);
    }
    
    if (result.error) {
      console.log(`❌ Error detectado: ${result.error}`);
      errorCount++;
    }
    
    // Check for JSON parsing issues in logs (would be visible in console)
    if (result.reasoning && result.reasoning.includes("Error en análisis")) {
      jsonParsingIssues++;
      console.log("⚠️ JSON parsing fallback activado");
    }
    
    if (result.context && Object.keys(result.context).length > 0) {
      console.log(`📝 Contexto: ${JSON.stringify(result.context, null, 2)}`);
    }
    
    if (result.missing_info && result.missing_info.length > 0) {
      console.log(`❓ Info faltante: ${result.missing_info.join(', ')}`);
    }
    
    if (result.search_params) {
      console.log(`🎯 Búsqueda ejecutada: ${JSON.stringify(result.search_params)}`);
      searchCount++;
    } else {
      consultationCount++;
    }
    
    totalProcessingTime += result.processing_time || 0;
    
    if (i < testCases.length - 1) {
      console.log("\n" + "=".repeat(70));
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("📊 ESTADÍSTICAS DE RENDIMIENTO Y ROBUSTEZ");
  console.log("=".repeat(70));
  console.log(`⚡ Tiempo total de procesamiento: ${totalProcessingTime}ms`);
  console.log(`📈 Tiempo promedio por consulta: ${Math.round(totalProcessingTime / testCases.length)}ms`);
  console.log(`🔍 Consultas realizadas: ${consultationCount}`);
  console.log(`🛒 Búsquedas ejecutadas: ${searchCount}`);
  console.log(`❌ Errores detectados: ${errorCount}`);
  console.log(`🔒 JSON parsing fallbacks: ${jsonParsingIssues}`);
  console.log(`🎯 Modo de procesamiento: ${USE_COMBINED_PROMPT ? 'Combined Prompt (Optimizado + Safe JSON)' : 'Multi-Step (Legacy + Safe JSON)'}`);
  console.log(`🛡️ Robustez: ${errorCount === 0 && jsonParsingIssues === 0 ? '✅ Excelente' : jsonParsingIssues > 0 ? '⚠️ Fallbacks activados' : '❌ Errores detectados'}`);
  
  console.log("\n🎉 Características implementadas:");
  console.log(`  ✅ ${USE_COMBINED_PROMPT ? 'Prompt combinado para eficiencia' : 'Procesamiento multi-step'}`);
  console.log("  ✅ Safe JSON parsing con fallbacks robustos");
  console.log("  ✅ Context tracking persistente");
  console.log("  ✅ Validación de calidad pre-búsqueda");
  console.log("  ✅ Performance monitoring");
  console.log("  ✅ Production-ready error handling");
  console.log("  ✅ A/B testing ready");
  
  console.log("\n📊 Contexto final:", agent.getContext());
  
  if (jsonParsingIssues > 0) {
    console.log("\n💡 Recomendación: Algunos LLM responses requirieron fallbacks.");
    console.log("   Considera ajustar el prompt para mayor consistencia en el formato JSON.");
  }
}

// 🆚 A/B Testing function
export async function runABTest() {
  console.log("🆚 A/B Test: Combined Prompt vs Multi-Step Processing\n");
  
  const testInputs = [
    "Un televisor Samsung de 55 pulgadas para gaming, presupuesto 2 millones",
    "Busco una lavadora",
    "Algo para estudiar programación"
  ];
  
  for (const testInput of testInputs) {
    console.log(`\n📝 Testing: "${testInput}"`);
    console.log("=".repeat(50));
    
    // Test Combined Prompt
    global.USE_COMBINED_PROMPT = true;
    const agentA = await createIntelligentAlkostoAgent();
    const resultA = await agentA.consultAndRecommend(testInput);
    
    // Test Multi-Step  
    global.USE_COMBINED_PROMPT = false;
    const agentB = await createIntelligentAlkostoAgent();
    const resultB = await agentB.consultAndRecommend(testInput);
    
    console.log(`🚀 Combined: ${resultA.processing_time}ms | 🔄 Multi-Step: ${resultB.processing_time}ms`);
    console.log(`⚡ Speedup: ${Math.round(((resultB.processing_time - resultA.processing_time) / resultB.processing_time) * 100)}%`);
  }
}

// 🎮 Interactive testing mode
export async function runInteractiveConsultation() {
  const agent = await createIntelligentAlkostoAgent();
  
  console.log("🎮 Modo Interactivo - Alkosto Intelligent Sales Agent");
  console.log("💡 Basado en lo mejor de ambos enfoques");
  console.log("⌨️  Escribe 'salir' para terminar, 'reset' para nuevo contexto\n");
  
  // This would be implemented with readline in a real Node.js environment
  // For now, showing the structure
  console.log("🚀 Agent ready for interactive testing...");
  console.log("📝 Current context:", agent.getContext());
}

// 📊 Export for production use
export { createIntelligentAlkostoAgent as createAgent };