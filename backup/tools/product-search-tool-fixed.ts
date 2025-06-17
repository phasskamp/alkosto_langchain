// ─────────────────────────────────────────────────────────────────────────────
//  src/tools/product-search-tool-fixed.ts
//  StructuredTool para buscar productos en el CSV de Alkosto
//  Última actualización: 2025‑06‑16
// ─────────────────────────────────────────────────────────────────────────────

import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { loadAndParseProducts } from "../utils/product-loader.js";

/* -------------------------------------------------------------------------- */
/*  1.  Definición del esquema de entrada                                     */
/* -------------------------------------------------------------------------- */
const ProductSearchInputSchema = z.object({
  // Categoría solicitada (obligatoria)
  kategorie: z
    .string({ required_error: "La categoría es obligatoria" })
    .min(2, "La categoría debe tener al menos 2 caracteres"),
  // Presupuesto máximo en COP (opcional)
  presupuesto_max: z
    .number()
    .positive()
    .optional()
    .default(Number.MAX_SAFE_INTEGER),
  // Permite forzar la búsqueda vectorial desde el prompt
  usar_vector_search: z.boolean().optional().default(false),
});

type ProductSearchInput = z.infer<typeof ProductSearchInputSchema>;

/* -------------------------------------------------------------------------- */
/*  2.  Catálogo de sinónimos → categoría canónica                             */
/* -------------------------------------------------------------------------- */
const CATEGORY_SYNONYMS: Record<string, string> = {
  televisor: "televisor",
  tv: "televisor",
  television: "televisor",
  "smart tv": "televisor",
  "smart‑tv": "televisor",

  celular: "celular",
  teléfono: "celular",
  telefono: "celular",
  smartphone: "celular",
  móvil: "celular",
  movil: "celular",

  computador: "computador",
  laptop: "computador",
  portátil: "computador",
  portatil: "computador",

  microondas: "microondas",
  horno: "microondas",

  lavadora: "lavadora",
};

/**
 * Normaliza el término de búsqueda y devuelve la categoría canónica si existe,
 * o el input original en minúsculas.
 */
function normalizeCategory(raw: string): string {
  const key = raw.trim().toLowerCase();
  return CATEGORY_SYNONYMS[key] ?? key;
}

/* -------------------------------------------------------------------------- */
/*  3.  StructuredTool                                                        */
/* -------------------------------------------------------------------------- */
export const productSearchTool = new StructuredTool<
  ProductSearchInput,
  string
>({
  name: "buscar_productos",
  description:
    "Busca productos por categoría y presupuesto en el catálogo CSV " +
    "y devuelve JSON con campos { success, total_found, productos[], " +
    "search_time_ms, query_info }. " +
    "Categorías admitidas: televisor, celular, computador, microondas, lavadora.",
  schema: ProductSearchInputSchema,

  // LangChain garantiza que 'func' recibe el objeto ya validado
  func: async (
    { kategorie, presupuesto_max, usar_vector_search }: ProductSearchInput,
  ): Promise<string> => {
    const t0 = Date.now();

    /* 3.1  Cargar y cachear productos */
    const products = await loadAndParseProducts(); // ← util existente
    console.log(`✅ ${products.length} products loaded and cached`);

    /* 3.2  Normalizar categoría */
    const canonicalCategory = normalizeCategory(kategorie);
    console.log(`🔍 Searching for category: "${canonicalCategory}"`);

    /* 3.3  Mostrar categorías disponibles (debug) */
    const stats: Record<string, number> = {};
    for (const p of products) {
      const cat = (p._category || "otros").toLowerCase();
      stats[cat] = (stats[cat] ?? 0) + 1;
    }
    console.log(
      "📊 Available categories:",
      Object.entries(stats)
        .map(([c, n]) => `${c}(${n})`)
        .join(", "),
    );

    /* 3.4  Filtrar por categoría */
    const catFiltered = products.filter(
      (p) => p._category?.toLowerCase() === canonicalCategory,
    );
    console.log(
      `🏷️  Category filter applied: ${catFiltered.length} products match "${canonicalCategory}"`,
    );

    /* 3.5  Filtrar por presupuesto (precio en COP) */
    const budgetFiltered = catFiltered.filter(
      (p) => Number(p.price_cop) <= presupuesto_max,
    );
    console.log(
      `💰 Budget filter applied: ${budgetFiltered.length} products ≤ ${presupuesto_max}`,
    );

    /* 3.6  Vector search opcional (híbrido) */
    let finalList = budgetFiltered;
    if (usar_vector_search || process.env.USE_VECTOR_SEARCH === "true") {
      try {
        const { vectorSearch } = await import("../utils/vector-search.js");
        console.log("🎯 Vector Search enabled (hybrid)");
        finalList = await vectorSearch(canonicalCategory, budgetFiltered);
      } catch (err) {
        console.warn("⚠️  Vector search module failed → fallback to list only");
      }
    }

    /* 3.7  Resultados y salida */
    const search_time_ms = Date.now() - t0;
    const output = {
      success: finalList.length > 0,
      total_found: finalList.length,
      productos: finalList.slice(0, 3), // máximo 3 según especificación
      search_time_ms,
      query_info: {
        kategorie: canonicalCategory,
        presupuesto_max,
        filter_applied: [
          `Categoría: ${canonicalCategory}`,
          `Presupuesto: ≤ $${presupuesto_max.toLocaleString("es-CO")}`,
        ],
      },
    };

    /* 3.8  Log resumen (debug) */
    console.log(
      `✅ Search completed: ${output.total_found} found in ${search_time_ms} ms`,
    );

    return JSON.stringify(output, null, 2);
  },
});

