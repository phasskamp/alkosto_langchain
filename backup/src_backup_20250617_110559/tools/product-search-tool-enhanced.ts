import { DynamicTool } from "@langchain/core/tools";
import { z } from "zod";
import { loadAndParseProducts } from "../utils/product-loader";
import { safeJsonParse } from "../utils/json-utils";

export const enhancedProductSearchTool = new DynamicTool({
  name: "buscar_productos",
  description: "Busca productos en el catálogo de Alkosto según texto o filtros.",
  schema: z.object({
    input: z.string().optional()
  }),
  func: async (input: string): Promise<string> => {
    const parsed = safeJsonParse<{ input: string }>(input, { input: "" }, "tool_input");
    const inputData = parsed.input;

    if (!inputData) {
      return "Por favor, proporciona un término de búsqueda válido.";
    }

    const allProducts = await loadAndParseProducts();
    const searchTerm = inputData.toLowerCase();

    const matched = allProducts.filter((p) =>
      p.name.toLowerCase().includes(searchTerm)
    );

    if (matched.length === 0) {
      return `Lo siento, no encontré productos relacionados con "${inputData}".`;
    }

    const responseLines = matched.slice(0, 3).map((p) => {
      return `📦 ${p.name} - $${p.price} COP`;
    });

    return `🔍 Resultados para "${inputData}":\n` + responseLines.join("\n");
  }
});
