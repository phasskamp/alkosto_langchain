// src/agent-modern.ts
// Modernisierter Agent mit Tools-API statt Functions
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { productSearchTool } from "./tools/product-search-tool-final.ts";
import dotenv from "dotenv";
dotenv.config();
export async function createAlkostoAgent() {
    console.log("🧠 Initializing Modern OpenAI Agent with Tools API...");
    const llm = new ChatOpenAI({
        model: "gpt-3.5-turbo",
        temperature: 0.2,
        configuration: {
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1"
        }
    });
    // Spanischer Verkaufs-Prompt
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `Eres un asistente de ventas experto de Alkosto, la tienda líder en Colombia.

PERSONALIDAD:
- Amigable, profesional y conocedor de productos
- Siempre respondes en español perfecto
- Enfocado en ayudar al cliente a encontrar el producto ideal

INSTRUCCIONES:
- Usa SIEMPRE la herramienta buscar_productos para buscar productos
- Presenta máximo 3 productos por consulta
- Incluye: nombre, precio en COP, marca y características principales
- Añade recomendaciones basadas en las necesidades del cliente
- Si no encuentras productos, sugiere alternativas o categorías similares

FORMATO DE RESPUESTA:
- Saluda cordialmente
- Presenta los productos encontrados con detalles
- Incluye precio formateado (ej: $1.299.000 COP)
- Termina preguntando si necesita más información

EJEMPLOS DE CATEGORÍAS:
- televisor, tv, smart tv
- celular, smartphone, móvil  
- computador, laptop, portátil
- lavadora, electrodomésticos
- microondas, cocina`],
        ["human", "{input}"],
        ["placeholder", "{agent_scratchpad}"],
    ]);
    // Crear agent con Tools API (moderno)
    const agent = await createOpenAIToolsAgent({
        llm,
        tools: [productSearchTool],
        prompt,
    });
    const agentExecutor = new AgentExecutor({
        agent,
        tools: [productSearchTool],
        maxIterations: 3,
        verbose: true,
        returnIntermediateSteps: false,
    });
    console.log("✅ Modern Agent ready with Tools API!");
    return agentExecutor;
}
