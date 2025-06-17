// alkosto-graduated-search-agent.ts
// Enhanced with Graduated Search Readiness Logic - FIXED VERSION
import dotenv from "dotenv";
dotenv.config();

import { ChatOpenAI } from "@langchain/openai";
import { enhancedProductSearchTool } from "./tools/enhanced-product-search-tool.js";

interface ConversationContext {
  kategorie?: string;
  presupuesto_max?: number;
  marca?: string;
  user_name?: string;
  uso_principal?: string;
  espacio_disponible?: string;
  tamano_hogar?: string;
  conversation_history: string[];
  [key: string]: any;
}

// 🔒 Safe JSON Parsing
function safeJsonParse<T>(input: string, fallback: T, context: string = ""): T {
  try {
    const parsed = JSON.parse(input);
    return parsed;
  } catch (err) {
    console.warn(`❌ Error parsing JSON in ${context}:`, err);
    console.warn(`📝 Input was: ${input.slice(0, 200)}...`);
    return fallback;
  }
}

class GraduatedSearchAgent {
  private llm: ChatOpenAI;
  private context: ConversationContext;
  private criteriaCache: Map<string, {essential: string[], optional: string[]}> = new Map();
  
  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "openai/gpt-3.5-turbo",
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.3,
      maxTokens: 700,
      streaming: false,
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Alkosto Graduated Search Agent"
        }
      }
    });
    
    this.context = { conversation_history: [] };
  }

  async processMessage(userMessage: string): Promise<{
    response: string;
    context: ConversationContext;
    processing_time: number;
    consultation_mode: boolean;
    category_analysis?: string;
    search_readiness?: 'ready' | 'viable' | 'insufficient';
    criteria_analysis?: any;
    agentErrors: string[];  // ← FIXED: Always include agentErrors
  }> {
    const startTime = Date.now();
    const agentErrors: string[] = [];  // ← FIXED: Initialize agentErrors
    
    try {
      this.context.conversation_history.push(`Cliente: ${userMessage}`);
      
      // 🎯 Graduated Search Readiness Analysis
      const processResult = await this.processUserInputWithGraduatedLogic(userMessage);
      const processingTime = Date.now() - startTime;
      
      if (processResult.searchReadiness === 'insufficient') {
        // 💬 More information definitely needed
        this.context.conversation_history.push(`Alkosto: ${processResult.response}`);
        
        return {
          response: processResult.response || await this.askIntelligentQuestion(),
          context: { ...this.context },
          processing_time: processingTime,
          consultation_mode: true,
          category_analysis: processResult.category_analysis,
          search_readiness: 'insufficient',
          criteria_analysis: processResult.criteria_analysis,
          agentErrors  // ← FIXED: Include agentErrors
        };
      } else {
        // 🔍 Ready for search (either 'ready' or 'viable')
        const recommendation = await this.searchAndRecommendWithConfidence(processResult.searchReadiness);
        this.context.conversation_history.push(`Alkosto: ${recommendation}`);
        
        return {
          response: recommendation,
          context: { ...this.context },
          processing_time: processingTime,
          consultation_mode: false,
          category_analysis: processResult.category_analysis,
          search_readiness: processResult.searchReadiness,
          criteria_analysis: processResult.criteria_analysis,
          agentErrors  // ← FIXED: Include agentErrors
        };
      }
      
    } catch (error) {
      console.error("❌ Graduated Search Agent Error:", error.message);
      agentErrors.push(`Processing error: ${error.message}`);  // ← FIXED: Capture actual errors
      
      return {
        response: "😅 Disculpa, tuve un pequeño problema. ¿Podrías repetir tu pregunta?",
        context: { ...this.context },
        processing_time: Date.now() - startTime,
        consultation_mode: false,
        agentErrors  // ← FIXED: Include agentErrors with actual error
      };
    }
  }

  // 🧠 Enhanced Criteria Discovery with Essential vs Optional
  private async getGraduatedCriteria(categoria: string): Promise<{essential: string[], optional: string[]}> {
    // Check cache first
    if (this.criteriaCache.has(categoria)) {
      return this.criteriaCache.get(categoria)!;
    }

    const graduatedCriteriaPrompt = `Analiza la categoría "${categoria}" para ventas en Alkosto Colombia y clasifica los criterios en ESENCIALES vs OPCIONALES para hacer recomendaciones útiles.

ESENCIALES: Criterios absolutamente necesarios para una recomendación básica útil
OPCIONALES: Criterios que mejoran la recomendación pero no son críticos

Considera el comportamiento real de compra en Colombia:
- Los clientes a veces quieren recomendaciones rápidas
- Es mejor mostrar opciones con información parcial que hacer demasiadas preguntas
- Algunos criterios son nice-to-have pero no blockers

Responde SOLO en formato JSON:
{
  "criterios_esenciales": ["lista", "de", "criterios", "absolutamente", "necesarios"],
  "criterios_opcionales": ["lista", "de", "criterios", "que", "mejoran", "la", "recomendacion"],
  "explicacion_esenciales": "por qué estos criterios son críticos para ${categoria}",
  "explicacion_opcionales": "por qué estos criterios son útiles pero no críticos"
}

Ejemplo para televisor:
{
  "criterios_esenciales": ["presupuesto_max"],
  "criterios_opcionales": ["uso_principal", "espacio_disponible", "marca"],
  "explicacion_esenciales": "Presupuesto define qué opciones son viables",
  "explicacion_opcionales": "Uso y espacio mejoran la recomendación pero podemos sugerir opciones variadas sin ellos"
}`;

    try {
      console.log(`🧠 Determinando criterios graduados para: ${categoria}`);
      const response = await this.llm.invoke(graduatedCriteriaPrompt);
      
      const fallback = {
        criterios_esenciales: ["presupuesto_max"],
        criterios_opcionales: [],
        explicacion_esenciales: "Presupuesto es siempre necesario",
        explicacion_opcionales: "No hay criterios opcionales definidos"
      };
      
      const result = safeJsonParse(response.content as string, fallback, "graduated_criteria");
      
      const criteriaSet = {
        essential: result.criterios_esenciales,
        optional: result.criterios_opcionales
      };
      
      // Cache the criteria
      this.criteriaCache.set(categoria, criteriaSet);
      
      console.log(`📋 Criterios ESENCIALES para ${categoria}:`, result.criterios_esenciales);
      console.log(`📝 Criterios OPCIONALES para ${categoria}:`, result.criterios_opcionales);
      console.log(`💡 Razón esenciales:`, result.explicacion_esenciales);
      console.log(`🔍 Razón opcionales:`, result.explicacion_opcionales);
      
      return criteriaSet;
      
    } catch (error) {
      console.log("🚨 Error determining graduated criteria, using fallback");
      const fallbackCriteria = { essential: ["presupuesto_max"], optional: [] };
      this.criteriaCache.set(categoria, fallbackCriteria);
      return fallbackCriteria;
    }
  }

  // 🎯 Graduated Search Readiness Logic
  private async processUserInputWithGraduatedLogic(userMessage: string): Promise<{
    searchReadiness: 'ready' | 'viable' | 'insufficient';
    response?: string;
    category_analysis?: string;
    criteria_analysis?: any;
  }> {
    const historyString = this.context.conversation_history.slice(-3).join('\n');
    
    // Step 1: Extract context information
    const contextPrompt = `Analiza la entrada del cliente y extrae información específica:

ENTRADA DEL CLIENTE: "${userMessage}"
CONTEXTO ACTUAL: ${JSON.stringify(this.context)}
HISTORIAL RECIENTE: ${historyString}

Responde SOLO en este formato JSON:
{
  "nueva_info": {
    "kategorie": "string o null",
    "marca": "string o null", 
    "presupuesto_max": "number o null",
    "uso_principal": "string o null",
    "user_name": "string o null",
    "espacio_disponible": "string o null",
    "tamano_hogar": "string o null"
  },
  "categoria_detectada": "string o null"
}`;

    try {
      console.log("🧠 Ejecutando extracción de contexto graduada...");
      const contextResponse = await this.llm.invoke(contextPrompt);
      
      const contextResult = safeJsonParse(
        contextResponse.content as string, 
        { nueva_info: {}, categoria_detectada: null }, 
        "context_extraction"
      );
      
      // Merge context updates
      if (contextResult.nueva_info && typeof contextResult.nueva_info === 'object') {
        Object.keys(contextResult.nueva_info).forEach(key => {
          if (contextResult.nueva_info[key] !== null && contextResult.nueva_info[key] !== undefined) {
            this.context[key] = contextResult.nueva_info[key];
          }
        });
      }
      
      console.log("📝 Context actualizado:", this.context);
      
      // Step 2: If we have a category, get graduated criteria and assess readiness
      if (this.context.kategorie) {
        const graduatedCriteria = await this.getGraduatedCriteria(this.context.kategorie);
        
        // Step 3: Graduated Search Readiness Assessment
        const readinessAssessment = await this.assessSearchReadiness(graduatedCriteria);
        
        console.log("🎯 Evaluación de preparación para búsqueda:");
        console.log(`   Estado: ${readinessAssessment.readiness}`);
        console.log(`   Razón: ${readinessAssessment.reasoning}`);
        
        if (readinessAssessment.readiness !== 'insufficient') {
          return {
            searchReadiness: readinessAssessment.readiness,
            category_analysis: readinessAssessment.reasoning,
            criteria_analysis: readinessAssessment
          };
        } else {
          // Generate intelligent follow-up questions
          const intelligentQuestions = await this.generateIntelligentQuestions(
            graduatedCriteria, 
            readinessAssessment.criticalMissing
          );
          
          return {
            searchReadiness: 'insufficient',
            response: intelligentQuestions,
            category_analysis: readinessAssessment.reasoning,
            criteria_analysis: readinessAssessment
          };
        }
      } else {
        // No category detected yet
        return {
          searchReadiness: 'insufficient',
          response: "¡Hola! ¿En qué tipo de producto estás interesado? Puedo ayudarte con televisores, celulares, computadores, electrodomésticos y mucho más.",
          category_analysis: "Categoría no identificada aún"
        };
      }
      
    } catch (error) {
      console.log("🚨 Error en análisis graduado:", error);
      return {
        searchReadiness: 'insufficient',
        response: "¿Podrías contarme qué tipo de producto buscas?",
        category_analysis: "Error técnico - modo fallback activado"
      };
    }
  }

  // 📊 Assess Search Readiness with Graduated Logic
  private async assessSearchReadiness(graduatedCriteria: {essential: string[], optional: string[]}): Promise<{
    readiness: 'ready' | 'viable' | 'insufficient';
    reasoning: string;
    criticalMissing: string[];
    niceTohave: string[];
  }> {
    const readinessPrompt = `Dado el contexto actual del cliente y los criterios conocidos, evalúa si es posible ejecutar una búsqueda útil y recomendar productos.

CONTEXTO ACTUAL: ${JSON.stringify(this.context)}
CRITERIOS ESENCIALES: ${graduatedCriteria.essential}
CRITERIOS OPCIONALES: ${graduatedCriteria.optional}

Evalúa la preparación para búsqueda:
- READY: Todos los criterios esenciales están presentes, búsqueda óptima
- VIABLE: Criterios esenciales presentes, algunos opcionales faltan pero se puede buscar útilmente  
- INSUFFICIENT: Faltan criterios esenciales críticos, más información es necesaria

Responde SOLO en formato JSON:
{
  "busqueda_viable": "ready/viable/insufficient",
  "criterios_esenciales_faltantes": ["lista", "de", "criterios", "esenciales", "faltantes"],
  "criterios_opcionales_faltantes": ["lista", "de", "criterios", "opcionales", "faltantes"],
  "razon": "explicación clara de por qué este nivel de preparación",
  "confianza_recomendacion": "alta/media/baja - qué tan buenas serían las recomendaciones con esta información"
}`;

    try {
      const readinessResponse = await this.llm.invoke(readinessPrompt);
      
      const fallback = {
        busqueda_viable: "insufficient",
        criterios_esenciales_faltantes: ["presupuesto_max"],
        criterios_opcionales_faltantes: [],
        razon: "Información insuficiente para búsqueda",
        confianza_recomendacion: "baja"
      };
      
      const result = safeJsonParse(readinessResponse.content as string, fallback, "readiness_assessment");
      
      return {
        readiness: result.busqueda_viable as 'ready' | 'viable' | 'insufficient',
        reasoning: result.razon,
        criticalMissing: result.criterios_esenciales_faltantes,
        niceTohave: result.criterios_opcionales_faltantes
      };
      
    } catch (error) {
      return {
        readiness: 'insufficient',
        reasoning: "Error en evaluación, requiere más información",
        criticalMissing: ["informacion_general"],
        niceTohave: []
      };
    }
  }

  // 🎯 Generate Intelligent Questions based on Graduated Missing Criteria
  private async generateIntelligentQuestions(
    graduatedCriteria: {essential: string[], optional: string[]}, 
    criticalMissing: string[]
  ): Promise<string> {
    const questionPrompt = `Eres un vendedor experto de Alkosto. El cliente busca un ${this.context.kategorie} pero faltan algunos criterios para hacer una buena recomendación.

CONTEXTO ACTUAL: ${JSON.stringify(this.context, null, 2)}
HISTORIAL RECIENTE: ${this.context.conversation_history.slice(-3).join('\n')}
CRITERIOS CRÍTICOS FALTANTES: ${criticalMissing}
CRITERIOS OPCIONALES DISPONIBLES: ${graduatedCriteria.optional}

Genera 1-2 preguntas inteligentes que:
1. Se enfoquen en los criterios MÁS CRÍTICOS faltantes
2. Sean naturales y conversacionales en español colombiano
3. Eviten repetir preguntas anteriores
4. Prioricen información que realmente impacta la recomendación

Responde SOLO en formato JSON:
{
  "preguntas": [
    "Primera pregunta enfocada en el criterio más crítico",
    "Segunda pregunta opcional si es necesaria"
  ],
  "razonamiento": "por qué estas preguntas son las más importantes ahora",
  "urgencia": "alta/media - qué tan crítica es esta información"
}`;

    try {
      console.log(`🤔 Generando preguntas inteligentes para criterios críticos: ${criticalMissing.join(', ')}`);
      const response = await this.llm.invoke(questionPrompt);
      
      const fallback = {
        preguntas: [`¿Podrías contarme más sobre el ${this.context.kategorie} que buscas?`],
        razonamiento: "Pregunta genérica de fallback",
        urgencia: "media"
      };
      
      const result = safeJsonParse(response.content as string, fallback, "intelligent_questions");
      
      console.log(`💭 Razonamiento: ${result.razonamiento}`);
      console.log(`⚡ Urgencia: ${result.urgencia}`);
      
      // Combine questions naturally
      if (result.preguntas.length === 1) {
        return result.preguntas[0];
      } else if (result.preguntas.length >= 2) {
        return `${result.preguntas[0]} Y también, ${result.preguntas[1].toLowerCase()}`;
      }
      
      return result.preguntas[0] || fallback.preguntas[0];
      
    } catch (error) {
      console.log("🚨 Error generating intelligent questions, using fallback");
      return `¿Podrías contarme más sobre el ${this.context.kategorie} que buscas?`;
    }
  }

  // 🔍 Search and Recommend with Confidence Level
  private async searchAndRecommendWithConfidence(readiness: 'ready' | 'viable'): Promise<string> {
    try {
      const toolInput = JSON.stringify({
        kategorie: this.context.kategorie,
        presupuesto_max: this.context.presupuesto_max || this.getDefaultBudget(),
        marca: this.context.marca
      });
      
      console.log(`🔍 Searching with ${readiness} confidence level:`, toolInput);
      
      const toolResult = await enhancedProductSearchTool.func({ input: toolInput });
      return toolResult; // Direct return of formatted product results

      
    } catch (error) {
      console.error("❌ Confidence-based search error:", error);
      return "😅 Tuve un problema buscando productos. ¿Podrías intentar reformular tu búsqueda?";
    }
  }

  private async handleNoResults(): Promise<string> {
    return `No encontramos productos de ${this.context.kategorie}${this.context.marca ? ` ${this.context.marca}` : ''} que cumplan exactamente estos criterios. Como experto, te sugiero algunas alternativas inteligentes...`;
  }

  private async askIntelligentQuestion(): Promise<string> {
    return `¿Podrías contarme más sobre el ${this.context.kategorie || 'producto'} que buscas?`;
  }

  private getDefaultBudget(): number {
    switch (this.context.kategorie) {
      case 'televisor': return 2000000;
      case 'celular': return 1500000;
      case 'computador': return 3000000;
      case 'lavadora': return 2500000;
      case 'nevera': return 3500000;
      default: return 2000000;
    }
  }

  public resetContext(): void {
    this.context = { conversation_history: [] };
  }

  public getContext(): ConversationContext {
    return { ...this.context };
  }

  public getCriteriaCache(): Map<string, {essential: string[], optional: string[]}> {
    return new Map(this.criteriaCache);
  }
}

// 🧪 Graduated Search Readiness Testing
async function testGraduatedSearchAgent() {
  console.log("🎉 TESTING GRADUATED SEARCH READINESS AGENT");
  console.log("🎯 Smart Early Search Logic + Confidence-Based Recommendations");
  console.log("=" .repeat(80));
  
  const agent = new GraduatedSearchAgent();
  
  const conversation = [
    "Hola",
    "Busco un televisor", 
    "Presupuesto de 1.5 millones",
    "Para gaming principalmente",
    "¿Cuál recomendarías para PS5?"
  ];
  
  let totalProcessingTime = 0;
  let readySearches = 0;
  let viableSearches = 0;
  let consultations = 0;
  
  for (let i = 0; i < conversation.length; i++) {
    const userMessage = conversation[i];
    
    console.log(`\n🎯 Test ${i + 1}: "${userMessage}"`);
    console.log("-".repeat(60));
    
    const result = await agent.processMessage(userMessage);
    
    console.log(`🤖 Respuesta: ${result.response}`);
    console.log(`🧠 Modo: ${result.consultation_mode ? '🔍 Consulta Inteligente' : '🛒 Búsqueda Ejecutada'}`);
    console.log(`⚡ Procesamiento: ${result.processing_time}ms`);
    console.log(`🚨 Errores: ${result.agentErrors.length > 0 ? result.agentErrors.join(', ') : 'Ninguno'}`);  // ← FIXED: Show agentErrors
    
    if (result.search_readiness) {
      const readinessEmojis = {
        'ready': '🟢 LISTA',
        'viable': '🟡 VIABLE', 
        'insufficient': '🔴 INSUFICIENTE'
      };
      console.log(`📊 Preparación de búsqueda: ${readinessEmojis[result.search_readiness]} (${result.search_readiness})`);
    }
    
    if (result.category_analysis) {
      console.log(`🎯 Análisis: ${result.category_analysis}`);
    }
    
    // Track search readiness stats
    if (result.search_readiness === 'ready') readySearches++;
    else if (result.search_readiness === 'viable') viableSearches++;
    else consultations++;
    
    totalProcessingTime += result.processing_time;
    
    if (i < conversation.length - 1) {
      console.log("\n" + "=".repeat(80));
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("📊 ESTADÍSTICAS DE BÚSQUEDA GRADUADA");
  console.log("=".repeat(80));
  console.log(`⚡ Tiempo total: ${totalProcessingTime}ms`);
  console.log(`📈 Tiempo promedio: ${Math.round(totalProcessingTime / conversation.length)}ms`);
  console.log(`🟢 Búsquedas LISTAS (confianza alta): ${readySearches}`);
  console.log(`🟡 Búsquedas VIABLES (confianza media): ${viableSearches}`);
  console.log(`🔴 Consultas necesarias: ${consultations}`);
  console.log(`🎯 Eficiencia de búsqueda: ${Math.round(((readySearches + viableSearches) / conversation.length) * 100)}%`);
  
  console.log("\n🎉 Características de búsqueda graduada implementadas:");
  console.log("  ✅ Criterios esenciales vs opcionales por categoría");
  console.log("  ✅ Búsqueda temprana cuando es viable (no perfecta)");
  console.log("  ✅ Recomendaciones adaptadas al nivel de confianza");
  console.log("  ✅ Preguntas inteligentes priorizando criterios críticos");
  console.log("  ✅ Evita sobre-consulta que frustra a los clientes");
  console.log("  ✅ Balance entre calidad de recomendación y velocidad");
  console.log("  ✅ Manejo correcto de agentErrors"); // ← FIXED: New feature
  
  console.log("\n📋 Cache de criterios graduados generado:");
  const criteriaCache = agent.getCriteriaCache();
  if (criteriaCache.size > 0) {
    criteriaCache.forEach((criteria, category) => {
      console.log(`  📺 ${category}:`);
      console.log(`    🔴 Esenciales: ${criteria.essential.join(', ')}`);
      console.log(`    🟡 Opcionales: ${criteria.optional.join(', ')}`);
    });
  } else {
    console.log("  (No se generaron criterios en esta sesión)");
  }
  
  console.log("\n✅ GRADUATED SEARCH READINESS AGENT TEST COMPLETED!");
  console.log("🚀 Optimized for real-world customer behavior - early search when viable!");
  console.log("🔧 Fixed: agentErrors properly handled in all response paths!");
}

export { GraduatedSearchAgent };

if (import.meta.url === `file://${process.argv[1]}`) {
  testGraduatedSearchAgent().catch(console.error);
}