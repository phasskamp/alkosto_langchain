import { DynamicTool } from "langchain/tools";
import { z } from "zod";
import { safeJsonParse } from "../utils/json-utils";
import { loadProductsFromCSV, searchProducts } from "../utils/product-loader";
import path from "path";
import { AlkostoProduct, ProductQuery } from "../utils/product-loader";

// Dynamisches Produktsuch-Tool
export const enhancedProductSearchTool = new DynamicTool({
  name: "ProductSearch",
  description:
    "Busca productos del catálogo Alkosto basado en criterios como categoría, presupuesto, tamaño de pantalla, resolución, tipo de panel, etc.",
  schema: z.object({
    input: z.union([
      z.string(),
      z.object({
        kategorie: z.string().optional(),
        presupuesto_max: z.number().optional(),
        resolucion: z.string().optional(),
        tamaño_pantalla: z.string().optional(),
        tipo_panel: z.string().optional(),
        frecuencia_actualizacion: z.string().optional(),
        marca: z.string().optional(),
        uso_principal: z.string().optional(),
      }),
    ]),
  }),
  func: async ({ input }) => {
    try {
      let query: ProductQuery;

      // Typprüfung & Konvertierung
      if (typeof input === "string") {
        const parsed = safeJsonParse(input, "ProductSearchToolInput");
        if (!parsed) return "Error: No se pudo interpretar el input para búsqueda.";
        query = parsed as ProductQuery;
      } else {
        query = input as ProductQuery;
      }

      const csvPath = path.resolve(process.cwd(), "final_merged_all_categories_updated.csv");
      const allProducts: AlkostoProduct[] = await loadProductsFromCSV(csvPath);
      const resultados = searchProducts(query, allProducts);

      if (resultados.length === 0) {
        return "No encontré productos que coincidan con los criterios proporcionados.";
      }

      const destacados = resultados.slice(0, 2).map((p) => `🔹 ${p.nombre} – $${p.precio}`).join("\n");
      return `Aquí tienes algunas recomendaciones:\n${destacados}`;
    } catch (error: any) {
      return `Error durante la búsqueda: ${error.message}`;
    }
  },
});
