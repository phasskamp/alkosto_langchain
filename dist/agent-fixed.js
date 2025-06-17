// src/agent-fixed.ts
import dotenv from "dotenv";
dotenv.config();
import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { productSearchTool } from "./tools/product-search-tool-final.js";
(async () => {
    console.log("🧠 Initializing Fixed Agent with OpenAI Tools API...");
    const llm = new ChatOpenAI({
        modelName: "openai/gpt-3.5-turbo",
        openAIApiKey: process.env.OPENAI_API_KEY,
        temperature: 0.2,
        maxTokens: 800,
        configuration: process.env.OPENAI_BASE_URL
            ? { baseURL: process.env.OPENAI_BASE_URL }
            : undefined
    });
    const prompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            `Eres un asistente de ventas experto de Alkosto, la tienda líder en Colombia.

INSTRUCCIONES:
- Usa SIEMPRE la herramienta buscar_productos con el parámetro "input"
- El input debe ser un JSON string válido
- Ejemplo de formato: kategorie televisor, presupuesto_max 2000000
- Devuelve máximo 3 productos por consulta
- Siempre responde en español

FORMATO DE RESPUESTA:
- Nombre, marca, precio (ej: $1.299.000 COP)
- Saludo y pregunta si desea más ayuda`
        ],
        ["human", "{input}"],
        ["placeholder", "{agent_scratchpad}"]
    ]);
    const agent = await createOpenAIToolsAgent({
        llm,
        tools: [productSearchTool],
        prompt
    });
    const executor = new AgentExecutor({
        agent,
        tools: [productSearchTool],
        verbose: true,
        maxIterations: 3
    });
    console.log("✅ Fixed Agent ready!");
    const input = "Busco un televisor Samsung por menos de 2 millones de pesos";
    console.log("💬 Input:", input);
    try {
        const result = await executor.invoke({ input });
        console.log("🟢 Final Agent Response:\n", result.output);
    }
    catch (error) {
        console.error("❌ Error:", error.message);
    }
})();
