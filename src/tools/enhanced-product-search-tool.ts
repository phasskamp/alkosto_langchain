// src/tools/enhanced-product-search-tool.ts
import { DynamicTool } from "langchain/tools";
import { loadAndParseProducts } from "../utils/product-loader";
import { safeJsonParse } from "../utils/json-utils";

export const enhancedProductSearchTool = new DynamicTool({
  name: "enhanced_product_search",
  description:
    "Busca productos en el catálogo CSV de Alkosto basado en texto libre o parámetros estructurados como categoría y presupuesto.",
  func: async (input: string): Promise<string> => {
    console.log("🔍 [ProductSearch] Input recibido:", input);

    let userQuery = "";
    const parsed = safeJsonParse<Record<string, any>>(input, {}, "ProductSearchTool.input");
    userQuery =
      typeof parsed === "string" ? parsed : Object.values(parsed).join(" ");

    try {
      console.log("🔄 Loading products from CSV...");
      const products = await loadAndParseProducts();
      console.log(`✅ ${products.length} products loaded and cached`);

      // 🌟 Suche in allen wichtigen Feldern
      const query = userQuery.toLowerCase();
      const matches = products.filter((product) => {
        const combined = [
          product.nombre,
          product.descripcion,
          product.marca,
          product.categoria,
          product.tipo_panel,
          product.tecnologia_smart,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return combined.includes(query);
      });

      if (matches.length === 0) {
        return "😔 No encontré productos que coincidan con tu búsqueda.";
      }

      // 🧠 Maximal 3 Top-Produkte zurückgeben
      const top = matches.slice(0, 3);
      const formatted = top
        .map((p) => `📺 ${p.nombre} – ${p.precio} COP`)
        .join("\n");

      return `🎯 Encontré ${matches.length} productos relevantes:\n${formatted}`;
    } catch (error: any) {
      console.error("❌ [ProductSearch] Error inesperado:", error);
      return "❌ Error interno al buscar productos. Intenta nuevamente.";
    }
  },
});
