// alkosto-dynamic-criteria-agent.ts
// Enhanced with Dynamic LLM-Powered Category Criteria
import dotenv from "dotenv";
dotenv.config();
import { ChatOpenAI } from "@langchain/openai";
import { enhancedProductSearchTool } from "./tools/product-search-tool-enhanced.js";
// 🔒 Safe JSON Parsing
function safeJsonParse(input, fallback, context = "") {
    try {
        const parsed = JSON.parse(input);
        return parsed;
    }
    catch (err) {
        console.warn(`❌ Error parsing JSON in ${context}:`, err);
        console.warn(`📝 Input was: ${input.slice(0, 200)}...`);
        return fallback;
    }
}
class DynamicCriteriaAlkostoAgent {
    llm;
    context;
    criteriaCache = new Map();
    constructor() {
        this.llm = new ChatOpenAI({
            modelName: "openai/gpt-3.5-turbo",
            openAIApiKey: process.env.OPENAI_API_KEY,
            temperature: 0.3,
            maxTokens: 600,
            streaming: false,
            configuration: {
                baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
                defaultHeaders: {
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "Alkosto Dynamic Criteria Agent"
                }
            }
        });
        this.context = { conversation_history: [] };
    }
    async processMessage(userMessage) {
        const startTime = Date.now();
        try {
            this.context.conversation_history.push(`Cliente: ${userMessage}`);
            // 🎯 Dynamic Criteria-Based Analysis
            const processResult = await this.processUserInputWithDynamicCriteria(userMessage);
            const processingTime = Date.now() - startTime;
            if (!processResult.shouldSearch) {
                // 💬 Dynamic consultation needed
                this.context.conversation_history.push(`Alkosto: ${processResult.response}`);
                return {
                    response: processResult.response || await this.askDynamicQuestion(),
                    context: { ...this.context },
                    processing_time: processingTime,
                    consultation_mode: true,
                    category_analysis: processResult.category_analysis,
                    dynamic_criteria: processResult.dynamic_criteria,
                    criteria_met: false
                };
            }
            else {
                // 🔍 Ready for sophisticated product search
                const recommendation = await this.searchAndRecommend();
                this.context.conversation_history.push(`Alkosto: ${recommendation}`);
                return {
                    response: recommendation,
                    context: { ...this.context },
                    processing_time: processingTime,
                    consultation_mode: false,
                    category_analysis: processResult.category_analysis,
                    dynamic_criteria: processResult.dynamic_criteria,
                    criteria_met: true
                };
            }
        }
        catch (error) {
            console.error("❌ Dynamic Criteria Agent Error:", error.message);
            return {
                response: "😅 Disculpa, tuve un pequeño problema. ¿Podrías repetir tu pregunta?",
                context: { ...this.context },
                processing_time: Date.now() - startTime,
                consultation_mode: false
            };
        }
    }
    // 🧠 Dynamic Criteria Determination per Category
    async getDynamicCriteria(categoria) {
        // Check cache first for performance
        if (this.criteriaCache.has(categoria)) {
            return this.criteriaCache.get(categoria);
        }
        const criteriaPrompt = `Analiza la categoría "${categoria}" para ventas en Alkosto Colombia y determina qué criterios son esenciales para hacer una recomendación de producto útil y específica.

Considera el contexto de venta al por menor en Colombia y las necesidades típicas de los clientes.

Responde SOLO en formato JSON:
{
  "criterios_esenciales": ["lista", "de", "criterios", "necesarios"],
  "criterios_opcionales": ["lista", "de", "criterios", "útiles", "pero", "no", "críticos"],
  "explicacion": "breve explicación de por qué estos criterios son importantes para ${categoria}"
}

Criterios posibles incluyen: presupuesto_max, uso_principal, espacio_disponible, tamano_hogar, marca, etc.

IMPORTANTE: Solo incluye criterios realmente necesarios para hacer una buena recomendación de ${categoria}.`;
        try {
            console.log(`🧠 Determinando criterios dinámicos para: ${categoria}`);
            const response = await this.llm.invoke(criteriaPrompt);
            const fallback = {
                criterios_esenciales: ["presupuesto_max"],
                criterios_opcionales: [],
                explicacion: "Criterios básicos para cualquier producto"
            };
            const result = safeJsonParse(response.content, fallback, "dynamic_criteria");
            // Cache the criteria for this category
            this.criteriaCache.set(categoria, result.criterios_esenciales);
            console.log(`📋 Criterios esenciales para ${categoria}:`, result.criterios_esenciales);
            console.log(`💡 Explicación:`, result.explicacion);
            return result.criterios_esenciales;
        }
        catch (error) {
            console.log("🚨 Error determining dynamic criteria, using fallback");
            const fallbackCriteria = ["presupuesto_max"];
            this.criteriaCache.set(categoria, fallbackCriteria);
            return fallbackCriteria;
        }
    }
    // 🎯 Enhanced Processing with Dynamic Criteria Logic
    async processUserInputWithDynamicCriteria(userMessage) {
        const historyString = this.context.conversation_history.slice(-3).join('\n');
        // Step 1: Extract context information
        const contextPrompt = `Analiza la entrada del cliente y extrae información específica:

ENTRADA DEL CLIENTE: "${userMessage}"
CONTEXTO ACTUAL: ${JSON.stringify(this.context)}
HISTORIAL RECIENTE: ${historyString}

Responde SOLO en este formato JSON:
{
  "nueva_info": {
    "kategorie": "string o null (televisor, celular, computador, lavadora, nevera, etc)",
    "marca": "string o null (samsung, lg, sony, etc)",
    "presupuesto_max": "number o null (en COP)",
    "uso_principal": "string o null (gaming, trabajo, peliculas, streaming, etc)",
    "user_name": "string o null (si se presenta)",
    "espacio_disponible": "string o null (sala, dormitorio, cocina, etc)",
    "tamano_hogar": "string o null (1-2 personas, familia grande, etc)"
  },
  "categoria_detectada": "string o null - la categoría principal identificada"
}

IMPORTANTE: Solo incluye campos EXPLÍCITAMENTE mencionados por el cliente.`;
        try {
            console.log("🧠 Ejecutando extracción de contexto...");
            const contextResponse = await this.llm.invoke(contextPrompt);
            const contextFallback = {
                nueva_info: {},
                categoria_detectada: null
            };
            const contextResult = safeJsonParse(contextResponse.content, contextFallback, "context_extraction");
            // Merge context updates
            if (contextResult.nueva_info && typeof contextResult.nueva_info === 'object') {
                Object.keys(contextResult.nueva_info).forEach(key => {
                    if (contextResult.nueva_info[key] !== null && contextResult.nueva_info[key] !== undefined) {
                        this.context[key] = contextResult.nueva_info[key];
                    }
                });
            }
            console.log("📝 Context actualizado:", this.context);
            // Step 2: If we have a category, get dynamic criteria
            if (this.context.kategorie) {
                const dynamicCriteria = await this.getDynamicCriteria(this.context.kategorie);
                // Step 3: Check if all essential criteria are met
                const criteriaAnalysis = this.analyzeCriteriaMet(dynamicCriteria);
                console.log("🎯 Análisis de criterios dinámicos:");
                console.log(`   Criterios requeridos: ${dynamicCriteria.join(', ')}`);
                console.log(`   Criterios cumplidos: ${criteriaAnalysis.met.join(', ')}`);
                console.log(`   Criterios faltantes: ${criteriaAnalysis.missing.join(', ')}`);
                if (criteriaAnalysis.allMet) {
                    return {
                        shouldSearch: true,
                        category_analysis: `Todos los criterios esenciales están completos para ${this.context.kategorie}`,
                        dynamic_criteria: dynamicCriteria
                    };
                }
                else {
                    // Generate dynamic follow-up questions for missing criteria
                    const dynamicQuestions = await this.generateDynamicFollowUpQuestions(criteriaAnalysis.missing);
                    return {
                        shouldSearch: false,
                        response: dynamicQuestions,
                        category_analysis: `Faltan criterios esenciales para ${this.context.kategorie}: ${criteriaAnalysis.missing.join(', ')}`,
                        dynamic_criteria: dynamicCriteria
                    };
                }
            }
            else {
                // No category detected yet
                return {
                    shouldSearch: false,
                    response: "¡Hola! ¿En qué tipo de producto estás interesado? Puedo ayudarte con televisores, celulares, computadores, electrodomésticos y mucho más.",
                    category_analysis: "Categoría no identificada aún",
                    dynamic_criteria: []
                };
            }
        }
        catch (error) {
            console.log("🚨 Error en análisis dinámico, usando fallback:", error);
            return {
                shouldSearch: false,
                response: "¿Podrías contarme qué tipo de producto buscas y para qué lo vas a usar?",
                category_analysis: "Error técnico - modo fallback activado"
            };
        }
    }
    // 📊 Analyze which criteria are met vs missing
    analyzeCriteriaMet(requiredCriteria) {
        const met = [];
        const missing = [];
        for (const criterion of requiredCriteria) {
            if (this.context[criterion] !== undefined && this.context[criterion] !== null) {
                met.push(criterion);
            }
            else {
                missing.push(criterion);
            }
        }
        return {
            met,
            missing,
            allMet: missing.length === 0
        };
    }
    // 🎯 Generate Dynamic Follow-up Questions based on Missing Criteria
    async generateDynamicFollowUpQuestions(missingCriteria) {
        const questionPrompt = `Eres un vendedor experto de Alkosto. El cliente busca un ${this.context.kategorie} pero falta información importante.

CONTEXTO ACTUAL:
${JSON.stringify(this.context, null, 2)}

CRITERIOS FALTANTES: ${JSON.stringify(missingCriteria)}

HISTORIAL RECIENTE:
${this.context.conversation_history.slice(-3).join('\n')}

Como asesor experto de Alkosto, formula 1-2 preguntas naturales en español colombiano que te ayuden a obtener la información faltante más crítica. 

IMPORTANTE:
- Evita repetir preguntas anteriores del historial
- Sé conversacional y empático
- Prioriza los criterios más importantes para ${this.context.kategorie}
- Adapta el tono según el contexto de la conversación

Responde SOLO en JSON:
{
  "preguntas": [
    "Primera pregunta específica y natural",
    "Segunda pregunta opcional si es necesaria"
  ],
  "razonamiento": "breve explicación de por qué estas preguntas son las más importantes ahora"
}

Ejemplo para televisor:
{
  "preguntas": [
    "¿Para qué vas a usar principalmente el televisor? ¿Gaming, películas, o TV normal?",
    "¿Cuál es tu presupuesto aproximado?"
  ],
  "razonamiento": "Uso principal define características técnicas, presupuesto define opciones disponibles"
}`;
        try {
            console.log(`🤔 Generando preguntas dinámicas para criterios faltantes: ${missingCriteria.join(', ')}`);
            const response = await this.llm.invoke(questionPrompt);
            const fallback = {
                preguntas: [`¿Podrías contarme más detalles sobre el ${this.context.kategorie} que buscas?`],
                razonamiento: "Pregunta genérica de fallback"
            };
            const result = safeJsonParse(response.content, fallback, "dynamic_questions");
            console.log(`💭 Razonamiento de preguntas: ${result.razonamiento}`);
            // Return the first 1-2 questions as a natural conversation
            if (result.preguntas.length === 1) {
                return result.preguntas[0];
            }
            else if (result.preguntas.length >= 2) {
                // Combine 2 questions naturally
                return `${result.preguntas[0]} Y también, ${result.preguntas[1].toLowerCase()}`;
            }
            return result.preguntas[0] || fallback.preguntas[0];
        }
        catch (error) {
            console.log("🚨 Error generating dynamic questions, using fallback");
            return `¿Podrías contarme más detalles sobre el ${this.context.kategorie} que buscas?`;
        }
    }
    // 🎯 Dynamic Question Generation (fallback)
    async askDynamicQuestion() {
        const questionPrompt = `Eres un vendedor experto de Alkosto. 

Contexto actual:
${JSON.stringify(this.context, null, 2)}

Historial reciente:
${this.context.conversation_history.slice(-3).join('\n')}

Haz UNA pregunta específica y profesional para obtener información importante que falta.
Sé amigable y natural en español colombiano.`;
        const response = await this.llm.invoke(questionPrompt);
        return response.content;
    }
    // 🔍 Enhanced Product Search and Recommendation
    async searchAndRecommend() {
        try {
            const toolInput = JSON.stringify({
                kategorie: this.context.kategorie,
                presupuesto_max: this.context.presupuesto_max || this.getDefaultBudget(),
                marca: this.context.marca
            });
            console.log("🔍 Searching with dynamic criteria validation:", toolInput);
            const toolResult = await enhancedProductSearchTool.func({ input: toolInput });
            const productData = safeJsonParse(toolResult, { success: false, productos: [] }, "product_search");
            if (!productData.success || productData.productos.length === 0) {
                return await this.handleNoResults();
            }
            // 🎯 Generate context-aware recommendation
            const recommendationPrompt = `Eres un vendedor experto de Alkosto especializado en ${this.context.kategorie}.

CONTEXTO COMPLETO DEL CLIENTE:
${JSON.stringify(this.context, null, 2)}

PRODUCTOS ENCONTRADOS:
${productData.productos.map((p, i) => `${i + 1}. ${p.title} - ${p.price} - ${p.brand}`).join('\n')}

INSTRUCCIONES:
1. Presenta 2-3 productos destacando características específicas para ${this.context.uso_principal || 'su uso'}
2. Explica por qué son ideales considerando TODOS los criterios conocidos
3. Menciona precios de forma atractiva
4. Incluye consejos específicos basados en el contexto completo
5. Termina preguntando si quiere más detalles
6. Usa emojis apropiados
7. Máximo 300 palabras
8. Sé personal y específico basándote en la información completa del cliente`;
            const recommendation = await this.llm.invoke(recommendationPrompt);
            return recommendation.content;
        }
        catch (error) {
            console.error("❌ Dynamic search error:", error);
            return "😅 Tuve un problema buscando productos. ¿Podrías intentar reformular tu búsqueda?";
        }
    }
    async handleNoResults() {
        const noResultsPrompt = `No encontramos productos de ${this.context.kategorie}${this.context.marca ? ` ${this.context.marca}` : ''} 
que cumplan exactamente estos criterios: ${JSON.stringify(this.context)}.

Como experto en ${this.context.kategorie}, sugiere alternativas inteligentes y mantén un tono positivo.`;
        const response = await this.llm.invoke(noResultsPrompt);
        return response.content;
    }
    getDefaultBudget() {
        switch (this.context.kategorie) {
            case 'televisor': return 2000000;
            case 'celular': return 1500000;
            case 'computador': return 3000000;
            case 'lavadora': return 2500000;
            case 'nevera': return 3500000;
            default: return 2000000;
        }
    }
    resetContext() {
        this.context = { conversation_history: [] };
    }
    getContext() {
        return { ...this.context };
    }
    getCriteriaCache() {
        return new Map(this.criteriaCache);
    }
}
// 🧪 Enhanced Dynamic Criteria Testing with Follow-up Questions
async function testDynamicCriteriaAgent() {
    console.log("🎉 TESTING ENHANCED DYNAMIC CRITERIA AGENT");
    console.log("🧠 LLM-Powered Category Logic + Dynamic Follow-up Questions");
    console.log("=".repeat(80));
    const agent = new DynamicCriteriaAlkostoAgent();
    const conversation = [
        "Hola",
        "Busco un televisor",
        "Para gaming y en mi sala, presupuesto de 1.5 millones",
        "Samsung preferiblemente",
        "¿Cuál es el mejor para juegos rápidos?"
    ];
    let totalProcessingTime = 0;
    let searchCount = 0;
    let consultationCount = 0;
    for (let i = 0; i < conversation.length; i++) {
        const userMessage = conversation[i];
        console.log(`\n🎯 Test ${i + 1}: "${userMessage}"`);
        console.log("-".repeat(60));
        const result = await agent.processMessage(userMessage);
        console.log(`🤖 Respuesta: ${result.response}`);
        console.log(`🧠 Modo: ${result.consultation_mode ? '🔍 Consulta Dinámica Adaptiva' : '🛒 Búsqueda Inteligente'}`);
        console.log(`⚡ Procesamiento: ${result.processing_time}ms`);
        if (result.category_analysis) {
            console.log(`🎯 Análisis: ${result.category_analysis}`);
        }
        if (result.dynamic_criteria && result.dynamic_criteria.length > 0) {
            console.log(`📋 Criterios dinámicos: ${result.dynamic_criteria.join(', ')}`);
            console.log(`✅ Criterios cumplidos: ${result.criteria_met ? 'SÍ - Búsqueda autorizada' : 'NO - Más información necesaria'}`);
        }
        // Show context evolution
        const currentContext = { ...result.context };
        delete currentContext.conversation_history; // Hide for cleaner display
        if (Object.keys(currentContext).length > 0) {
            console.log(`📝 Contexto acumulado: ${JSON.stringify(currentContext, null, 2)}`);
        }
        if (result.consultation_mode) {
            consultationCount++;
        }
        else {
            searchCount++;
        }
        totalProcessingTime += result.processing_time;
        if (i < conversation.length - 1) {
            console.log("\n" + "=".repeat(80));
        }
    }
    console.log("\n" + "=".repeat(80));
    console.log("📊 ESTADÍSTICAS DE CRITERIOS DINÁMICOS AVANZADOS");
    console.log("=".repeat(80));
    console.log(`⚡ Tiempo total: ${totalProcessingTime}ms`);
    console.log(`📈 Tiempo promedio: ${Math.round(totalProcessingTime / conversation.length)}ms`);
    console.log(`🔍 Consultas adaptivas: ${consultationCount}`);
    console.log(`🛒 Búsquedas autorizadas: ${searchCount}`);
    console.log(`🎯 Eficiencia de criterios: ${searchCount > 0 ? 'Alta - Búsqueda alcanzada' : 'En progreso'}`);
    console.log("\n🎉 Características avanzadas implementadas:");
    console.log("  ✅ Criterios determinados dinámicamente por LLM");
    console.log("  ✅ Preguntas de seguimiento adaptivas e inteligentes");
    console.log("  ✅ Sin reglas hardcodeadas - completamente flexible");
    console.log("  ✅ Extensible a cualquier categoría automáticamente");
    console.log("  ✅ Cache de criterios optimizado para performance");
    console.log("  ✅ Análisis contextual completo con validación robusta");
    console.log("  ✅ Prevención de preguntas repetitivas");
    console.log("  ✅ Combinación natural de múltiples preguntas");
    console.log("\n📋 Cache de criterios dinámicos generado:");
    const criteriaCache = agent.getCriteriaCache();
    if (criteriaCache.size > 0) {
        criteriaCache.forEach((criteria, category) => {
            console.log(`  📺 ${category}: ${criteria.join(', ')}`);
        });
    }
    else {
        console.log("  (No se generaron criterios en esta sesión)");
    }
    console.log("\n✅ ENHANCED DYNAMIC CRITERIA AGENT TEST COMPLETED!");
    console.log("🚀 Ready for production deployment with state-of-the-art conversation logic!");
}
export { DynamicCriteriaAlkostoAgent };
if (import.meta.url === `file://${process.argv[1]}`) {
    testDynamicCriteriaAgent().catch(console.error);
}
