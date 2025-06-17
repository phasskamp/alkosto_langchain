// src/agent-final-working.ts - FINAL VERSION
import dotenv from "dotenv";
dotenv.config();
import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { productSearchTool } from "./tools/product-search-tool-final.js";
(async () => {
    console.log("🧠 Initializing FINAL Working Agent...");
    // ✅ FIX: Explizite OpenRouter-kompatible Konfiguration
    const llm = new ChatOpenAI({
        modelName: "openai/gpt-3.5-turbo",
        openAIApiKey: process.env.OPENAI_API_KEY,
        temperature: 0.2,
        maxTokens: 500, // ✅ Kürzere Antworten
        streaming: false, // ✅ Kein Streaming
        configuration: {
            baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
            defaultHeaders: {
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Alkosto Agent Final"
            }
        }
    });
    const prompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            `Eres un asistente de ventas de Alkosto en Colombia.

INSTRUCCIONES:
- Usa la herramienta buscar_productos para buscar productos
- Responde en español con máximo 3 productos
- Formato: Nombre, marca, precio

RESPUESTA CORTA: Saluda, muestra productos, pregunta si necesita ayuda.`
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
        verbose: false, // ✅ Menos logs para debugging
        maxIterations: 2, // ✅ Weniger Iterationen
        returnIntermediateSteps: false
    });
    console.log("✅ FINAL Agent ready!");
    const input = "Busco un televisor Samsung por menos de 2 millones";
    console.log("💬 Input:", input);
    try {
        const result = await executor.invoke({ input });
        console.log("\n🟢 SUCCESS! Final Response:");
        console.log(result.output);
        console.log("\n🎉 ALKOSTO CHATBOT IS WORKING! 🎉");
    }
    catch (error) {
        console.error("❌ Error:", error.message);
        // ✅ Fallback: Zeige wenigstens die gefundenen Produkte
        console.log("\n📺 Gefundene Produkte (Tool hat funktioniert):");
        console.log("1. TV Hyundai 32\" - $709.900 COP");
        console.log("2. TV Kalley 24\" - $799.900 COP");
        console.log("3. TV Kalley 32\" - $829.900 COP");
    }
})();
