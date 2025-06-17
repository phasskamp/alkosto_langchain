// alkosto-sophisticated-agent.ts
// Enhanced with Category-Specific Consultation Logic
import dotenv from "dotenv";
dotenv.config();
import { ChatOpenAI } from "@langchain/openai";
import { enhancedProductSearchTool } from "./tools/product-search-tool-enhanced.js";
// 🔒 Safe JSON Parsing
function safeJsonParse(input, fallback, context = "") {
    try {
        const parsed = JSON.parse(input);
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
class SophisticatedAlkostoAgent {
    llm;
    context;
    constructor() {
        this.llm = new ChatOpenAI({
            modelName: "openai/gpt-3.5-turbo",
            openAIApiKey: process.env.OPENAI_API_KEY,
            temperature: 0.3,
            maxTokens: 500,
            streaming: false,
            configuration: {
                baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
                defaultHeaders: {
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "Alkosto Sophisticated Agent"
                }
            }
        });
        this.context = { conversation_history: [] };
    }
    async processMessage(userMessage) {
        const startTime = Date.now();
        try {
            this.context.conversation_history.push(`Cliente: ${userMessage}`);
            // 🎯 Enhanced Category-Specific Analysis
            const processResult = await this.processUserInputWithCategoryLogic(userMessage);
            const processingTime = Date.now() - startTime;
            if (!processResult.shouldSearch) {
                // 💬 Category-specific consultation needed
                this.context.conversation_history.push(`Alkosto: ${processResult.response}`);
                return {
                    response: processResult.response || await this.askCategorySpecificQuestion(),
                    context: { ...this.context },
                    processing_time: processingTime,
                    consultation_mode: true,
                    category_analysis: processResult.category_analysis,
                    missing_criteria: processResult.missing_criteria
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
                    category_analysis: processResult.category_analysis
                };
            }
        }
        catch (error) {
            console.error("❌ Sophisticated Agent Error:", error.message);
            return {
                response: "😅 Disculpa, tuve un pequeño problema. ¿Podrías repetir tu pregunta?",
                context: { ...this.context },
                processing_time: Date.now() - startTime,
                consultation_mode: false
            };
        }
    }
    // 🎯 Enhanced Category-Specific Multitask Processing
    async processUserInputWithCategoryLogic(userMessage) {
        const historyString = this.context.conversation_history.slice(-3).join('\n');
        const sophisticatedPrompt = `Eres un asesor experto de Alkosto con profundo conocimiento de consulta por categorías. Analiza la entrada del cliente y realiza TODAS estas tareas en UN SOLO JSON:

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
  "busqueda_viable": "true solo si la información crítica para la categoría específica está completa. Criterios por categoría: - Televisor: necesita 'kategorie' + ('uso_principal' O 'espacio_disponible') + 'presupuesto_max' - Lavadora: necesita 'kategorie' + ('tamano_hogar' O 'espacio_disponible') + 'presupuesto_max' - Celular: necesita 'kategorie' + 'uso_principal' + 'presupuesto_max' - Computador: necesita 'kategorie' + 'uso_principal' + 'presupuesto_max' - Nevera: necesita 'kategorie' + 'tamano_hogar' + 'presupuesto_max' - Para otras categorías: necesita 'kategorie' + 'presupuesto_max'. Indica false si falta información crítica específica de la categoría.",
  "analisis_categoria": "breve explicación sobre qué información específica de la categoría está completa o faltante",
  "criterios_faltantes": ["array", "específico", "de", "campos", "faltantes", "para", "la", "categoría"],
  "pregunta_siguiente": "si busqueda_viable es false, una pregunta natural y específica para la categoría en español colombiano"
}

IMPORTANTE: 
- nueva_info: Solo incluye campos EXPLÍCITAMENTE mencionados por el cliente
- busqueda_viable: Aplicar criterios específicos por categoría - ser estricto
- pregunta_siguiente: Debe ser específica para la categoría identificada
- RESPONDE SOLO EN JSON VÁLIDO`;
        try {
            console.log("🧠 Ejecutando análisis sofisticado por categoría...");
            const response = await this.llm.invoke(sophisticatedPrompt);
            const fallbackResult = {
                nueva_info: {},
                busqueda_viable: false,
                analisis_categoria: "Error en análisis - usando modo conservador",
                criterios_faltantes: ["informacion_general"],
                pregunta_siguiente: "¿Podrías contarme qué tipo de producto buscas y para qué lo vas a usar?"
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
            console.log("🎯 Análisis de categoría:", result.analisis_categoria);
            console.log("🔍 Decisión de búsqueda:", result.busqueda_viable);
            if (!result.busqueda_viable && result.criterios_faltantes) {
                console.log("❓ Criterios faltantes:", result.criterios_faltantes);
            }
            return {
                shouldSearch: result.busqueda_viable,
                response: result.pregunta_siguiente,
                category_analysis: result.analisis_categoria,
                missing_criteria: result.criterios_faltantes
            };
        }
        catch (error) {
            console.log("🚨 Error en análisis sofisticado, usando fallback:", error);
            return {
                shouldSearch: false,
                response: "¿Podrías contarme qué tipo de producto buscas y para qué lo vas a usar?",
                category_analysis: "Error técnico - modo fallback activado"
            };
        }
    }
    // 🎯 Category-Specific Question Generation
    async askCategorySpecificQuestion() {
        const questionPrompt = `Eres un vendedor experto de Alkosto especializado en consultas por categoría. 

Contexto actual:
- Categoría: ${this.context.kategorie || 'no especificada'}
- Presupuesto: ${this.context.presupuesto_max ? `$${this.context.presupuesto_max.toLocaleString()} COP` : 'no especificado'}
- Marca: ${this.context.marca || 'no especificada'}
- Uso: ${this.context.uso_principal || 'no especificado'}
- Espacio: ${this.context.espacio_disponible || 'no especificado'}
- Tamaño hogar: ${this.context.tamano_hogar || 'no especificado'}
- Nombre: ${this.context.user_name || 'no conocido'}

Historial reciente:
${this.context.conversation_history.slice(-3).join('\n')}

Basándote en la categoría específica "${this.context.kategorie}", haz UNA pregunta específica y profesional para obtener la información crítica que falta para esa categoría.

Ejemplos de preguntas por categoría:
- Televisor: "¿Para qué vas a usar principalmente el televisor? ¿Ver películas, gaming, TV normal?"
- Lavadora: "¿Para cuántas personas es la lavadora? ¿Familia pequeña o grande?"
- Celular: "¿Para qué vas a usar el celular principalmente? ¿Trabajo, redes sociales, fotos?"
- Computador: "¿Para qué necesitas el computador? ¿Trabajo, gaming, estudio?"

Sé específico para la categoría actual y mantén un tono amigable y profesional.`;
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
            console.log("🔍 Searching with sophisticated criteria:", toolInput);
            const toolResult = await enhancedProductSearchTool.func({ input: toolInput });
            const productData = safeJsonParse(toolResult, { success: false, productos: [] }, "product_search");
            if (!productData.success || productData.productos.length === 0) {
                return await this.handleNoResults();
            }
            // 🎯 Generate category-aware personalized recommendation
            const sophisticatedRecommendationPrompt = `Eres un vendedor experto de Alkosto especializado en ${this.context.kategorie}. Presenta estos productos considerando el contexto específico del cliente:

INFORMACIÓN DEL CLIENTE:
- Busca: ${this.context.kategorie}${this.context.marca ? ` de marca ${this.context.marca}` : ''}
- Uso principal: ${this.context.uso_principal || 'no especificado'}
- Espacio: ${this.context.espacio_disponible || 'no especificado'}
- Tamaño hogar: ${this.context.tamano_hogar || 'no especificado'}
- Presupuesto: $${(this.context.presupuesto_max || this.getDefaultBudget()).toLocaleString()} COP
- Nombre: ${this.context.user_name || 'no especificado'}

PRODUCTOS ENCONTRADOS:
${productData.productos.map((p, i) => `${i + 1}. ${p.title} - ${p.price} - ${p.brand}`).join('\n')}

INSTRUCCIONES ESPECÍFICAS PARA ${this.context.kategorie?.toUpperCase()}:
${this.getCategorySpecificRecommendationInstructions()}

Información adicional:
${productData.brand_intelligence ? `Análisis de marca: ${productData.brand_intelligence.suggestion}` : ''}

FORMATO DE RESPUESTA:
1. Saludo personalizado ${this.context.user_name ? `usando ${this.context.user_name}` : ''}
2. Presenta 2-3 productos destacando características específicas para ${this.context.uso_principal || 'su uso'}
3. Explica por qué son ideales para ${this.context.espacio_disponible || 'sus necesidades'}
4. Menciona precios de forma atractiva
5. Incluye consejos específicos de la categoría
6. Termina preguntando si quiere más detalles
7. Usa emojis apropiados para la categoría
8. Máximo 300 palabras`;
            const recommendation = await this.llm.invoke(sophisticatedRecommendationPrompt);
            return recommendation.content;
        }
        catch (error) {
            console.error("❌ Sophisticated search error:", error);
            return "😅 Tuve un problema buscando productos. ¿Podrías intentar reformular tu búsqueda?";
        }
    }
    // 🎯 Category-Specific Recommendation Instructions
    getCategorySpecificRecommendationInstructions() {
        switch (this.context.kategorie) {
            case 'televisor':
                return `- Enfócate en tamaño de pantalla para ${this.context.espacio_disponible || 'el espacio'}
- Menciona tecnologías relevantes para ${this.context.uso_principal || 'ver contenido'}
- Destaca características de Smart TV y conectividad
- Considera la distancia de visualización`;
            case 'celular':
                return `- Destaca características de cámara y rendimiento
- Enfócate en capacidad de almacenamiento y RAM
- Menciona duración de batería para ${this.context.uso_principal || 'uso diario'}
- Considera el ecosistema de apps`;
            case 'computador':
                return `- Enfócate en especificaciones técnicas para ${this.context.uso_principal || 'uso general'}
- Menciona procesador, RAM y almacenamiento
- Destaca portabilidad si es relevante
- Considera rendimiento para tareas específicas`;
            case 'lavadora':
                return `- Enfócate en capacidad apropiada para ${this.context.tamano_hogar || 'el hogar'}
- Menciona eficiencia energética y programas de lavado
- Considera espacio disponible y tipo de instalación
- Destaca características especiales como carga frontal/superior`;
            case 'nevera':
                return `- Enfócate en capacidad apropiada para ${this.context.tamano_hogar || 'el hogar'}
- Menciona eficiencia energética y tecnología de enfriamiento
- Considera espacio disponible y distribución interna
- Destaca características especiales como dispensador o No Frost`;
            default:
                return `- Enfócate en características principales del producto
- Menciona calidad y durabilidad
- Considera relación precio-calidad
- Destaca beneficios específicos para el usuario`;
        }
    }
    async handleNoResults() {
        const categoryAwareNoResultsPrompt = `El cliente busca ${this.context.kategorie}${this.context.marca ? ` de ${this.context.marca}` : ''} 
${this.context.uso_principal ? `para ${this.context.uso_principal}` : ''} 
pero no encontramos productos disponibles que cumplan exactamente estos criterios.

Como experto en ${this.context.kategorie}, sé honesto pero útil:
1. Explica que no tenemos exactamente lo que busca
2. Sugiere alternativas inteligentes específicas para ${this.context.kategorie}:
   - Otras marcas similares en calidad
   - Ajuste de presupuesto si es apropiado
   - Modelos relacionados o categorías similares
3. Ofrece consulta personalizada
4. Mantén tono positivo y profesional`;
        const response = await this.llm.invoke(categoryAwareNoResultsPrompt);
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
}
// 🧪 Sophisticated Testing with Category Analysis
async function testSophisticatedAgent() {
    console.log("🎉 TESTING SOPHISTICATED ALKOSTO AGENT");
    console.log("🎯 Category-Specific Consultation Logic");
    console.log("=".repeat(70));
    const agent = new SophisticatedAlkostoAgent();
    const conversation = [
        "Hola",
        "Busco un televisor",
        "Para gaming en mi sala",
        "Samsung, menos de 2 millones",
        "¿Cuál me recomiendas para juegos de alta velocidad?"
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
        console.log(`🧠 Modo: ${result.consultation_mode ? '🔍 Consulta Específica' : '🛒 Búsqueda Sofisticada'}`);
        console.log(`⚡ Procesamiento: ${result.processing_time}ms`);
        if (result.category_analysis) {
            console.log(`🎯 Análisis de categoría: ${result.category_analysis}`);
        }
        if (result.missing_criteria && result.missing_criteria.length > 0) {
            console.log(`❓ Criterios faltantes: ${result.missing_criteria.join(', ')}`);
        }
        if (result.context && Object.keys(result.context).filter(k => k !== 'conversation_history').length > 0) {
            const contextDisplay = { ...result.context };
            delete contextDisplay.conversation_history;
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
    console.log("📊 ESTADÍSTICAS DE SOFISTICACIÓN");
    console.log("=".repeat(70));
    console.log(`⚡ Tiempo total: ${totalProcessingTime}ms`);
    console.log(`📈 Tiempo promedio: ${Math.round(totalProcessingTime / conversation.length)}ms`);
    console.log(`🔍 Consultas específicas: ${consultationCount}`);
    console.log(`🛒 Búsquedas sofisticadas: ${searchCount}`);
    console.log("\n🎉 Características sofisticadas implementadas:");
    console.log("  ✅ Criterios específicos por categoría");
    console.log("  ✅ Consulta inteligente televisor: uso_principal + presupuesto");
    console.log("  ✅ Safe JSON parsing robusto");
    console.log("  ✅ Análisis contextual avanzado");
    console.log("  ✅ Recomendaciones personalizadas por categoría");
    console.log("  ✅ Production-ready sophistication");
    console.log("\n✅ SOPHISTICATED AGENT TEST COMPLETED!");
}
export { SophisticatedAlkostoAgent };
if (import.meta.url === `file://${process.argv[1]}`) {
    testSophisticatedAgent().catch(console.error);
}
