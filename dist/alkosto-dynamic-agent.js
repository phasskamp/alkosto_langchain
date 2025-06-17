// Dynamic Hybrid Alkosto Agent - Based on Colleague's Analysis
import dotenv from "dotenv";
dotenv.config();
import { ChatOpenAI } from "@langchain/openai";
import { enhancedProductSearchTool } from "./tools/product-search-tool-enhanced.js";
class DynamicAlkostoAgent {
    llm;
    context;
    constructor() {
        this.llm = new ChatOpenAI({
            modelName: "openai/gpt-3.5-turbo",
            openAIApiKey: process.env.OPENAI_API_KEY,
            temperature: 0.4, // Más creativo para conversación
            maxTokens: 300,
            streaming: false,
            configuration: {
                baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
                defaultHeaders: {
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "Alkosto Dynamic Agent"
                }
            }
        });
        this.context = { conversation_history: [] };
    }
    async processMessage(userMessage) {
        try {
            // 📝 Add to conversation history
            this.context.conversation_history.push(`Cliente: ${userMessage}`);
            // 🧠 Step 1: Understand user intent and extract info
            await this.updateContext(userMessage);
            // 🤔 Step 2: Decide if we have enough info for product search
            const needsMoreInfo = this.needsMoreInformation();
            if (needsMoreInfo) {
                // 💬 Ask clarifying questions
                const response = await this.askClarifyingQuestion();
                this.context.conversation_history.push(`Alkosto: ${response}`);
                return response;
            }
            else {
                // 🔍 We have enough info - search products
                const response = await this.searchAndRecommend();
                this.context.conversation_history.push(`Alkosto: ${response}`);
                return response;
            }
        }
        catch (error) {
            console.error("❌ Dynamic Agent Error:", error.message);
            return "😅 Disculpa, tuve un pequeño problema. ¿Podrías repetir tu pregunta?";
        }
    }
    async updateContext(userMessage) {
        const analysisPrompt = `Analiza este mensaje del cliente y extrae información específica:

Mensaje: "${userMessage}"
Contexto previo: ${JSON.stringify(this.context, null, 2)}

Extrae SOLO si está claramente mencionado:
- categoria: (televisor, celular, computador, lavadora, o null)
- presupuesto_max: (número en COP, o null)
- marca: (samsung, lg, sony, hyundai, etc, o null)
- user_name: (nombre del cliente si se presenta, o null)

Responde SOLO con JSON válido:
{"categoria": "...", "presupuesto_max": 1000000, "marca": "...", "user_name": "..."}

Si algo no está claro, usa null.`;
        try {
            const analysis = await this.llm.invoke(analysisPrompt);
            const extracted = JSON.parse(analysis.content);
            // Update context with new info
            if (extracted.categoria)
                this.context.kategorie = extracted.categoria;
            if (extracted.presupuesto_max)
                this.context.presupuesto_max = extracted.presupuesto_max;
            if (extracted.marca)
                this.context.marca = extracted.marca;
            if (extracted.user_name)
                this.context.user_name = extracted.user_name;
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
        // For some categories, we might want to ensure we have budget
        if (this.context.kategorie === 'computador' && !this.context.presupuesto_max) {
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
- Nombre: ${this.context.user_name || 'no conocido'}

Historial reciente:
${this.context.conversation_history.slice(-3).join('\n')}

Haz UNA pregunta específica y útil para poder ayudar mejor. Sé amigable y profesional.`;
        const response = await this.llm.invoke(questionPrompt);
        return response.content;
    }
    async searchAndRecommend() {
        try {
            // 🔍 Search products using our reliable tool
            const toolInput = JSON.stringify({
                kategorie: this.context.kategorie,
                presupuesto_max: this.context.presupuesto_max || this.getDefaultBudget(),
                marca: this.context.marca
            });
            console.log("🔍 Searching with:", toolInput);
            const toolResult = await enhancedProductSearchTool.func({ input: toolInput });
            const productData = JSON.parse(toolResult);
            if (!productData.success || productData.productos.length === 0) {
                return await this.handleNoResults();
            }
            // 🎯 Generate personalized recommendation
            const recommendationPrompt = `Eres un vendedor experto de Alkosto. Presenta estos productos de manera atractiva y personalizada:

Cliente busca: ${this.context.kategorie}${this.context.marca ? ` de marca ${this.context.marca}` : ''}
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
    // 📊 Get conversation context (for debugging)
    getContext() {
        return { ...this.context };
    }
}
// 🧪 Interactive Test Function
async function testDynamicAgent() {
    console.log("🎉 TESTING DYNAMIC ALKOSTO AGENT\n");
    const agent = new DynamicAlkostoAgent();
    const conversation = [
        "Hola",
        "Busco algo para mi mamá",
        "Un televisor",
        "Samsung, menos de 2 millones",
        "¿Qué me recomiendas del más barato?"
    ];
    console.log("🗣️ SIMULANDO CONVERSACIÓN REAL:\n");
    for (let i = 0; i < conversation.length; i++) {
        const userMessage = conversation[i];
        console.log(`👤 Cliente: ${userMessage}`);
        console.log("🤔 Procesando...");
        const response = await agent.processMessage(userMessage);
        console.log(`🤖 Alkosto: ${response}`);
        console.log(`📊 Context: ${JSON.stringify(agent.getContext(), null, 2)}`);
        console.log("\n" + "─".repeat(80) + "\n");
    }
    console.log("✅ DYNAMIC CONVERSATION COMPLETE!");
}
export { DynamicAlkostoAgent };
if (import.meta.url === `file://${process.argv[1]}`) {
    testDynamicAgent().catch(console.error);
}
