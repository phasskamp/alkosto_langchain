// alkosto-hybrid-intelligent-agent.ts
// Combining: Dynamic Agent Logic + Combined Prompts + Safe JSON + Context Intelligence
import dotenv from "dotenv";
dotenv.config();
import { ChatOpenAI } from "@langchain/openai";
import { enhancedProductSearchTool } from "./tools/product-search-tool-enhanced.js";
// 🔒 Safe JSON Parsing - Production-ready error handling
function safeJsonParse(input, fallback, context = "") {
    try {
        const parsed = JSON.parse(input);
        // Validation for our specific use cases
        if (context === "multitask" && !parsed.hasOwnProperty('busqueda_viable')) {
            console.warn("⚠️ JSON missing required field 'busqueda_viable', using fallback");
            return fallback;
        }
        return parsed;
    }
    catch (err) {
        console.warn(`❌ Error parsing JSON in ${context}:`, err);
        console.warn(`📝 Input was: ${input.slice(0, 200)}...`);
        return fallback;
    }
}
// 🚀 Performance Configuration
const USE_COMBINED_PROMPT = true; // Toggle for A/B testing
class HybridIntelligentAlkostoAgent {
    llm;
    context;
    constructor() {
        this.llm = new ChatOpenAI({
            modelName: "openai/gpt-3.5-turbo",
            openAIApiKey: process.env.OPENAI_API_KEY,
            temperature: 0.3, // Balanced for consistency + creativity
            maxTokens: 400,
            streaming: false,
            configuration: {
                baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
                defaultHeaders: {
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "Alkosto Hybrid Intelligent Agent"
                }
            }
        });
        this.context = { conversation_history: [] };
    }
    async processMessage(userMessage) {
        const startTime = Date.now();
        try {
            // 📝 Add to conversation history
            this.context.conversation_history.push(`Cliente: ${userMessage}`);
            let processResult;
            if (USE_COMBINED_PROMPT) {
                // 🚀 Optimized: Single LLM call for all analysis
                processResult = await this.processUserInputCombined(userMessage);
            }
            else {
                // 🔄 Legacy: Multiple LLM calls (for A/B comparison)
                await this.updateContext(userMessage);
                processResult = {
                    shouldSearch: !this.needsMoreInformation(),
                    response: this.needsMoreInformation() ? await this.askClarifyingQuestion() : null,
                    reasoning: "Legacy multi-step processing"
                };
            }
            const processingTime = Date.now() - startTime;
            if (!processResult.shouldSearch) {
                // 💬 Need more information - ask clarifying questions
                this.context.conversation_history.push(`Alkosto: ${processResult.response}`);
                return {
                    response: processResult.response || await this.askClarifyingQuestion(),
                    context: { ...this.context },
                    processing_mode: USE_COMBINED_PROMPT ? "combined_prompt" : "multi_step",
                    processing_time: processingTime,
                    consultation_mode: true,
                    analysis: processResult.reasoning
                };
            }
            else {
                // 🔍 We have enough info - search and recommend
                const recommendation = await this.searchAndRecommend();
                this.context.conversation_history.push(`Alkosto: ${recommendation}`);
                return {
                    response: recommendation,
                    context: { ...this.context },
                    processing_mode: USE_COMBINED_PROMPT ? "combined_prompt" : "multi_step",
                    processing_time: processingTime,
                    consultation_mode: false,
                    analysis: processResult.reasoning
                };
            }
        }
        catch (error) {
            console.error("❌ Hybrid Agent Error:", error.message);
            return {
                response: "😅 Disculpa, tuve un pequeño problema. ¿Podrías repetir tu pregunta?",
                context: { ...this.context },
                processing_mode: "error_fallback",
                processing_time: Date.now() - startTime,
                consultation_mode: false,
                analysis: "Error occurred during processing"
            };
        }
    }
    // 🎯 Combined Multitask Processing - Single LLM call for efficiency
    async processUserInputCombined(userMessage) {
        const historyString = this.context.conversation_history.slice(-3).join('\n');
        const multitaskPrompt = `Eres un asesor experto de Alkosto. Analiza la entrada del cliente y realiza TODAS estas tareas en UN SOLO JSON:

ENTRADA DEL CLIENTE: "${userMessage}"
CONTEXTO ACTUAL: ${JSON.stringify(this.context)}
HISTORIAL RECIENTE: ${historyString}

Responde SOLO en este formato JSON:
{
  "nueva_info": {
    "kategorie": "string o null (televisor, celular, computador, lavadora, etc)",
    "marca": "string o null (samsung, lg, sony, etc)",
    "presupuesto_max": "number o null (en COP)",
    "uso_principal": "string o null (gaming, trabajo, peliculas, etc)",
    "user_name": "string o null (si se presenta)",
    "espacio_disponible": "string o null (sala, dormitorio, etc)"
  },
  "busqueda_viable": "true si hay suficiente info (categoria + presupuesto o contexto claro), false si falta info crítica",
  "razon_analisis": "breve explicación de por qué sí o no se puede buscar",
  "pregunta_siguiente": "si busqueda_viable es false, una pregunta natural y específica en español colombiano",
  "informacion_faltante": ["array", "de", "aspectos", "faltantes"]
}

IMPORTANTE: 
- nueva_info: Solo incluye campos EXPLÍCITAMENTE mencionados por el cliente
- busqueda_viable: true solo si categoría está clara y hay suficiente contexto
- pregunta_siguiente: Solo si busqueda_viable es false
- RESPONDE SOLO EN JSON VÁLIDO`;
        try {
            console.log("🧠 Ejecutando análisis combinado...");
            const response = await this.llm.invoke(multitaskPrompt);
            // 🔒 Safe JSON parsing with comprehensive fallback
            const fallbackResult = {
                nueva_info: {},
                busqueda_viable: false,
                razon_analisis: "Error en análisis - usando modo conservador",
                pregunta_siguiente: "¿Podrías contarme qué tipo de producto buscas y cuál es tu presupuesto aproximado?",
                informacion_faltante: ["categoria", "presupuesto"]
            };
            const result = safeJsonParse(response.content, fallbackResult, "multitask");
            // Merge context updates with validation
            if (result.nueva_info && typeof result.nueva_info === 'object') {
                Object.keys(result.nueva_info).forEach(key => {
                    if (result.nueva_info[key] !== null && result.nueva_info[key] !== undefined) {
                        this.context[key] = result.nueva_info[key];
                    }
                });
            }
            console.log("📝 Context actualizado:", this.context);
            console.log("🔍 Decisión de búsqueda:", result.busqueda_viable);
            console.log("💭 Razonamiento:", result.razon_analisis);
            return {
                shouldSearch: result.busqueda_viable,
                response: result.pregunta_siguiente,
                reasoning: result.razon_analisis
            };
        }
        catch (error) {
            console.log("🚨 Error en análisis combinado, usando fallback:", error);
            return {
                shouldSearch: false,
                response: "¿Podrías contarme qué tipo de producto buscas?",
                reasoning: "Error técnico - modo fallback activado"
            };
        }
    }
    // 🔄 Legacy methods for A/B comparison
    async updateContext(userMessage) {
        const analysisPrompt = `Analiza este mensaje del cliente y extrae información específica:

Mensaje: "${userMessage}"
Contexto previo: ${JSON.stringify(this.context, null, 2)}

Extrae SOLO si está claramente mencionado:
- kategorie: (televisor, celular, computador, lavadora, o null)
- presupuesto_max: (número en COP, o null)
- marca: (samsung, lg, sony, hyundai, etc, o null)
- user_name: (nombre del cliente si se presenta, o null)
- uso_principal: (gaming, trabajo, peliculas, etc, o null)

Responde SOLO con JSON válido:
{"kategorie": "...", "presupuesto_max": 1000000, "marca": "...", "user_name": "...", "uso_principal": "..."}

Si algo no está claro, usa null.`;
        try {
            const analysis = await this.llm.invoke(analysisPrompt);
            const fallback = {};
            const extracted = safeJsonParse(analysis.content, fallback, "context_extraction");
            // Update context with new info
            Object.keys(extracted).forEach(key => {
                if (extracted[key] !== null && extracted[key] !== undefined) {
                    this.context[key] = extracted[key];
                }
            });
            console.log("🧠 Updated context:", this.context);
        }
        catch (error) {
            console.log("⚠️ Context analysis failed, continuing with existing context");
        }
    }
    needsMoreInformation() {
        // We need at least category to search
        if (!this.context.kategorie)
            return true;
        // For some categories, ensure we have sufficient context
        if (this.context.kategorie === 'computador' && !this.context.presupuesto_max && !this.context.uso_principal) {
            return true;
        }
        return false; // We have enough info
    }
    async askClarifyingQuestion() {
        const questionPrompt = `Eres un vendedor amigable de Alkosto. Basándote en la conversación, haz UNA pregunta específica para ayudar al cliente.

Contexto actual:
- Categoría: ${this.context.kategorie || 'no especificada'}
- Presupuesto: ${this.context.presupuesto_max ? `$${this.context.presupuesto_max.toLocaleString()} COP` : 'no especificado'}
- Marca: ${this.context.marca || 'no especificada'}
- Uso: ${this.context.uso_principal || 'no especificado'}
- Nombre: ${this.context.user_name || 'no conocido'}

Historial reciente:
${this.context.conversation_history.slice(-3).join('\n')}

Haz UNA pregunta específica y útil para poder ayudar mejor. Sé amigable y profesional.`;
        const response = await this.llm.invoke(questionPrompt);
        return response.content;
    }
    async searchAndRecommend() {
        try {
            // 🔍 Search products using enhanced tool
            const toolInput = JSON.stringify({
                kategorie: this.context.kategorie,
                presupuesto_max: this.context.presupuesto_max || this.getDefaultBudget(),
                marca: this.context.marca
            });
            console.log("🔍 Searching with:", toolInput);
            const toolResult = await enhancedProductSearchTool.func({ input: toolInput });
            const productData = safeJsonParse(toolResult, { success: false, productos: [] }, "product_search");
            if (!productData.success || productData.productos.length === 0) {
                return await this.handleNoResults();
            }
            // 🎯 Generate personalized recommendation
            const recommendationPrompt = `Eres un vendedor experto de Alkosto. Presenta estos productos de manera atractiva y personalizada:

Cliente busca: ${this.context.kategorie}${this.context.marca ? ` de marca ${this.context.marca}` : ''}
${this.context.uso_principal ? `Para: ${this.context.uso_principal}` : ''}
Presupuesto: $${(this.context.presupuesto_max || this.getDefaultBudget()).toLocaleString()} COP

Productos encontrados:
${productData.productos.map((p, i) => `${i + 1}. ${p.title} - ${p.price} - ${p.brand}`).join('\n')}

Información adicional:
${productData.brand_intelligence ? `Sugerencia: ${productData.brand_intelligence.suggestion}` : ''}

Instrucciones:
1. Saluda de manera personalizada ${this.context.user_name ? `usando el nombre ${this.context.user_name}` : ''}
2. Presenta 2-3 productos destacando características clave
3. Explica por qué son buenas opciones para sus necesidades
4. Menciona precios de forma atractiva
5. Termina preguntando si quiere más detalles o tiene otras preguntas
6. Usa emojis ocasionalmente
7. Máximo 250 palabras`;
            const recommendation = await this.llm.invoke(recommendationPrompt);
            return recommendation.content;
        }
        catch (error) {
            console.error("❌ Search error:", error);
            return "😅 Tuve un problema buscando productos. ¿Podrías intentar reformular tu búsqueda?";
        }
    }
    async handleNoResults() {
        const noResultsPrompt = `El cliente busca ${this.context.kategorie}${this.context.marca ? ` de ${this.context.marca}` : ''} pero no encontramos productos disponibles.

Sé honesto pero útil:
1. Explica que no tenemos exactamente lo que busca
2. Sugiere alternativas (otras marcas, ajustar presupuesto, categorías similares)  
3. Ofrece ayuda para encontrar algo que funcione
4. Mantén un tono positivo y servicial`;
        const response = await this.llm.invoke(noResultsPrompt);
        return response.content;
    }
    getDefaultBudget() {
        switch (this.context.kategorie) {
            case 'televisor': return 2000000;
            case 'celular': return 1500000;
            case 'computador': return 3000000;
            case 'lavadora': return 2500000;
            default: return 2000000;
        }
    }
    // 🔄 Reset conversation context
    resetContext() {
        this.context = { conversation_history: [] };
    }
    // 📊 Get conversation context
    getContext() {
        return { ...this.context };
    }
}
// 🧪 Enhanced Testing with Performance Monitoring
async function testHybridIntelligentAgent() {
    console.log("🎉 TESTING HYBRID INTELLIGENT ALKOSTO AGENT");
    console.log(`🎯 Modo actual: ${USE_COMBINED_PROMPT ? '🚀 Combined Prompt (Optimizado)' : '🔄 Multi-Step (Legacy)'}`);
    console.log("=".repeat(70));
    const agent = new HybridIntelligentAlkostoAgent();
    const conversation = [
        "Hola",
        "Busco algo para mi mamá",
        "Un televisor",
        "Samsung, menos de 2 millones",
        "¿Qué me recomiendas del más barato?"
    ];
    let totalProcessingTime = 0;
    let searchCount = 0;
    let consultationCount = 0;
    for (let i = 0; i < conversation.length; i++) {
        const userMessage = conversation[i];
        console.log(`\n🎯 Test ${i + 1}: "${userMessage}"`);
        console.log("-".repeat(50));
        const result = await agent.processMessage(userMessage);
        console.log(`🤖 Respuesta: ${result.response}`);
        console.log(`🧠 Modo: ${result.consultation_mode ? '🔍 Consulta' : '🛒 Búsqueda'}`);
        console.log(`⚡ Procesamiento: ${result.processing_time}ms (${result.processing_mode})`);
        if (result.analysis) {
            console.log(`💭 Análisis: ${result.analysis}`);
        }
        if (result.context && Object.keys(result.context).filter(k => k !== 'conversation_history').length > 0) {
            const contextDisplay = { ...result.context };
            delete contextDisplay.conversation_history; // Hide history for cleaner display
            console.log(`📝 Contexto: ${JSON.stringify(contextDisplay, null, 2)}`);
        }
        if (result.consultation_mode) {
            consultationCount++;
        }
        else {
            searchCount++;
        }
        totalProcessingTime += result.processing_time;
        if (i < conversation.length - 1) {
            console.log("\n" + "=".repeat(70));
        }
    }
    console.log("\n" + "=".repeat(70));
    console.log("📊 ESTADÍSTICAS DE RENDIMIENTO Y ROBUSTEZ");
    console.log("=".repeat(70));
    console.log(`⚡ Tiempo total de procesamiento: ${totalProcessingTime}ms`);
    console.log(`📈 Tiempo promedio por consulta: ${Math.round(totalProcessingTime / conversation.length)}ms`);
    console.log(`🔍 Consultas realizadas: ${consultationCount}`);
    console.log(`🛒 Búsquedas ejecutadas: ${searchCount}`);
    console.log(`🎯 Modo de procesamiento: ${USE_COMBINED_PROMPT ? 'Combined Prompt (Optimizado + Safe JSON)' : 'Multi-Step (Legacy + Safe JSON)'}`);
    console.log("\n🎉 Características híbridas implementadas:");
    console.log("  ✅ Lógica robusta del Dynamic Agent (probada y funcional)");
    console.log(`  ✅ ${USE_COMBINED_PROMPT ? 'Prompt combinado para eficiencia' : 'Procesamiento multi-step'}`);
    console.log("  ✅ Safe JSON parsing con fallbacks robustos");
    console.log("  ✅ Context tracking persistente");
    console.log("  ✅ Performance monitoring");
    console.log("  ✅ Production-ready error handling");
    console.log("  ✅ A/B testing ready");
    console.log("\n✅ HYBRID INTELLIGENT AGENT TEST COMPLETED!");
}
export { HybridIntelligentAlkostoAgent };
// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testHybridIntelligentAgent().catch(console.error);
}
