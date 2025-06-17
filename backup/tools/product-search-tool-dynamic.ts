// src/tools/product-search-tool-dynamic.ts
// Zurück zu DynamicTool um Zod-Probleme zu umgehen

import { DynamicTool } from "@langchain/core/tools";
import { loadAndParseProducts } from "../utils/product-loader.js";

// Kategorie-Synonyme
const CATEGORY_SYNONYMS: Record<string, string> = {
  televisor: "televisor",
  tv: "televisor", 
  television: "televisor",
  "smart tv": "televisor",

  celular: "celular",
  telefono: "celular",
  smartphone: "celular",
  movil: "celular",

  computador: "computador",
  laptop: "computador",
  portatil: "computador",

  microondas: "microondas",
  horno: "microondas",

  lavadora: "lavadora"
};

function normalizeCategory(raw: string): string {
  const key = raw.trim().toLowerCase();
  return CATEGORY_SYNONYMS[key] || key;
}

export const productSearchTool = new DynamicTool({
  name: "buscar_productos",
  description: `Busca productos por categoría y presupuesto en el catálogo de Alkosto.
  
Input: JSON string con formato:
{
  "kategorie": "string - categoría del producto (televisor, celular, computador, etc)",
  "presupuesto_max": "number - presupuesto máximo en COP (opcional)",
  "usar_vector_search": "boolean - usar búsqueda vectorial (opcional)"
}

Ejemplo: {"kategorie": "televisor", "presupuesto_max": 1500000}`,
  
  func: async (input: string): Promise<string> => {
    console.log("🔍 DynamicTool - raw input received:", input);
    
    const t0 = Date.now();
    
    try {
      // 1. Parse JSON input manually
      let parsedInput;
      try {
        parsedInput = JSON.parse(input);
      } catch (parseError) {
        console.error("🚨 JSON parse error:", parseError);
        return JSON.stringify({
          success: false,
          error: "Input debe ser JSON válido",
          example: '{"kategorie": "televisor", "presupuesto_max": 1500000}',
          total_found: 0,
          productos: []
        });
      }

      const kategorie = parsedInput.kategorie || parsedInput.category || "";
      const presupuesto_max = parsedInput.presupuesto_max || parsedInput.budget || Number.MAX_SAFE_INTEGER;
      const usar_vector_search = parsedInput.usar_vector_search || false;

      console.log("🔍 Parsed input:", { kategorie, presupuesto_max, usar_vector_search });

      if (!kategorie) {
        return JSON.stringify({
          success: false,
          error: "kategoría es requerida",
          total_found: 0,
          productos: []
        });
      }
      
      // 2. Produkte laden (synchron!)
      console.log("🔄 Loading products from CSV...");
      const products = loadAndParseProducts();
      console.log(`📦 Loaded ${products.length} products`);
      
      if (products.length === 0) {
        return JSON.stringify({
          success: false,
          error: "No hay productos disponibles",
          total_found: 0,
          productos: []
        });
      }

      // 3. Kategorie normalisieren
      const canonicalCategory = normalizeCategory(kategorie);
      console.log(`🔍 Searching for normalized category: "${canonicalCategory}"`);

      // 4. Kategorien aus Produktdaten analysieren 
      const categoryStats: Record<string, number> = {};
      products.forEach(p => {
        // Versuche verschiedene Felder für Kategorie
        const category = p.category || p.tipo || p.type || 'unknown';
        const cat = category.toString().toLowerCase();
        categoryStats[cat] = (categoryStats[cat] || 0) + 1;
      });
      
      console.log("📊 Available categories:", 
        Object.entries(categoryStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([c, n]) => `${c}(${n})`)
          .join(", ")
      );

      // 5. Nach Kategorie filtern - mehrere Strategien
      let filteredProducts = [];
      
      // Strategie 1: Direkte Kategorie-Übereinstimmung
      filteredProducts = products.filter(product => {
        const productCategory = (product.category || product.tipo || '').toLowerCase();
        return productCategory.includes(canonicalCategory);
      });
      
      console.log(`🏷️ Direct category match: ${filteredProducts.length} products`);

      // Strategie 2: Wenn keine direkten Treffer, suche im Titel
      if (filteredProducts.length === 0) {
        console.log("🔄 No direct matches, searching in titles...");
        
        const searchTerms = {
          'televisor': ['tv', 'smart tv', 'television', 'led', 'oled'],
          'celular': ['celular', 'smartphone', 'iphone', 'samsung galaxy', 'movil'],
          'computador': ['computador', 'laptop', 'pc', 'portatil', 'notebook'],
          'lavadora': ['lavadora', 'washing'],
          'microondas': ['microondas', 'horno']
        };

        const terms = searchTerms[canonicalCategory] || [canonicalCategory];
        
        for (const term of terms) {
          filteredProducts = products.filter(product => {
            const title = (product.title || '').toLowerCase();
            const category = (product.category || product.tipo || '').toLowerCase();
            return title.includes(term) || category.includes(term);
          });
          
          if (filteredProducts.length > 0) {
            console.log(`🎯 Found ${filteredProducts.length} products with term: "${term}"`);
            break;
          }
        }
      }

      // 6. Budget-Filter
      if (presupuesto_max && presupuesto_max > 0 && presupuesto_max < Number.MAX_SAFE_INTEGER) {
        const beforeBudget = filteredProducts.length;
        filteredProducts = filteredProducts.filter(product => {
          const price = parseFloat(product.price || product.precio || '0');
          return price <= presupuesto_max;
        });
        console.log(`💰 Budget filter: ${beforeBudget} → ${filteredProducts.length} products under ${presupuesto_max}`);
      }

      // 7. Nach Preis sortieren
      filteredProducts.sort((a, b) => {
        const priceA = parseFloat(a.price || a.precio || '0');
        const priceB = parseFloat(b.price || b.precio || '0');
        return priceA - priceB;
      });

      // 8. Vector Search (optional)
      if (usar_vector_search || process.env.USE_VECTOR_SEARCH === 'true') {
        console.log("🎯 Vector Search enabled (mock implementation)");
        // Mock vector search - in real implementation, this would rerank results
      }

      const searchTime = Date.now() - t0;
      console.log(`✅ Search completed: ${filteredProducts.length} total in ${searchTime}ms`);

      // 9. Ergebnis formatieren
      const result = {
        success: filteredProducts.length > 0,
        total_found: filteredProducts.length,
        productos: filteredProducts.slice(0, 3).map(product => ({
          title: product.title || 'Sin título',
          price: product.price || product.precio || '0',
          brand: product.brand || product.marca || 'Sin marca',
          features: (product.features || product.descripcion || 'Sin descripción').slice(0, 100) + "...",
          availability: "in_stock"
        })),
        search_time_ms: searchTime,
        query_info: {
          kategorie: canonicalCategory,
          presupuesto_max: presupuesto_max === Number.MAX_SAFE_INTEGER ? 'Sin límite' : presupuesto_max
        }
      };

      if (result.productos.length > 0) {
        console.log(`🎯 First result: "${result.productos[0].title}" - $${result.productos[0].price}`);
      }

      return JSON.stringify(result, null, 2);

    } catch (error) {
      console.error("🚨 Error in product search:", error);
      return JSON.stringify({
        success: false,
        error: `Error al buscar productos: ${error.message}`,
        total_found: 0,
        productos: []
      });
    }
  }
});
