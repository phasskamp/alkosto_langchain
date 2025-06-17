import { DynamicStructuredTool } from "langchain/tools";
import { safeJsonParse } from "../utils/json-utils";
import { searchProducts } from "../utils/product-loader";

export const enhancedProductSearchTool: DynamicStructuredTool = {
  name: "ProductSearch",
  description:
    "Busca productos recomendados según criterios como categoría, precio, tipo de uso, etc.",
  func: async (input: any) => {
    const parsedInput =
      typeof input === "string" ? safeJsonParse(input) : input;

    const { kategorie, presupuesto_max, uso_principal } = parsedInput;

    if (!kategorie || !presupuesto_max) {
      return "Faltan criterios esenciales como 'kategorie' o 'presupuesto_max'";
    }

    const resultados = await searchProducts({
      kategorie,
      presupuesto_max,
      uso_principal,
    });

    return resultados.length
      ? resultados
      : "No se encontraron productos que coincidan con los criterios.";
  },
};
