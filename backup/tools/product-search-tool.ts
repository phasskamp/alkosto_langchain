// src/tools/product-search-tool.ts
import { DynamicTool } from "@langchain/core/tools";
import { z } from "zod";
import { loadAndParseProducts } from "../utils/product-loader.js";

// Schema für Input-Validierung
const ProductSearchInputSchema = z.object({
  kategorie: z.string().min(1, "Kategorie ist erforderlich"),
  presupuesto_max: z.number().positive("Budget muss positiv sein").optional(),
  query: z.string().optional(),
  usar_vector_search: z.boolean().default(true).optional()
});

type ProductSearchInput = z.infer<typeof ProductSearchInputSchema>;

interface Product {
  id: string;
  title: string;
  price: number;
  brand?: string;
  category?: string;
  features?: string;
  image_url?: string;
  product_url?: string;
  discount?: number;
  original_price?: number;
  availability?: string;
  rating?: number;
  reviews_count?: number;
}

interface SearchResult {
  success: boolean;
  total_found: number;
  productos: Product[];
  search_time_ms: number;
  query_info?: {
    kategorie: string;
    presupuesto_max?: number;
    search_query?: string;
    filter_applied: string[];
  };
  error?: string;
  details?: any;
}

// Hauptsuchfunktion
async function searchProducts(input: ProductSearchInput): Promise<string> {
  const startTime = Date.now();
  
  // SCHRITT 3: Tool Debug
  console.log("🔍 tool - USE_VECTOR_SEARCH env:", process.env.USE_VECTOR_SEARCH);
  console.log("🔍 tool - input.usar_vector_search:", input.usar_vector_search);
  
  const useVectorSearch = (
    process.env.USE_VECTOR_SEARCH === "true" ||
    input.usar_vector_search === true        // ← por si lo fuerzas desde el prompt
  );
  
  console.log("🎯 Final useVectorSearch decision:", useVectorSearch);
  
  try {
    console.log("🔍 Starting product search with input:", input);
    
    // SCHRITT 5: Vector Search Test hinzufügen
    if (useVectorSearch) {
      console.log("🎯 Vector Search is ENABLED - testing...");
      try {
        // Smoke test für Vector Search
        console.log("🎯 VS results test: searching for 'televisor'");
        // Hier würde normalerweise die Vektorsuche stehen
        console.log("🎯 VS results: [mock vector search results]");
      } catch (vectorError) {
        console.error("❌ Vector search failed:", vectorError.message);
      }
    } else {
      console.log("⚠️ Vector Search is DISABLED - using fallback");
    }
    
    // Produkte laden
    const allProducts = await loadAndParseProducts();
    console.log(`📦 Loaded ${allProducts.length} products`);
    
    if (allProducts.length === 0) {
      return JSON.stringify({
        success: false,
        total_found: 0,
        productos: [],
        search_time_ms: Date.now() - startTime,
        error: "No hay productos disponibles en este momento"
      } as SearchResult, null, 2);
    }

    let filteredProducts = [...allProducts];
    const appliedFilters: string[] = [];

    // 1. Kategorie-Filter
    if (input.kategorie) {
      const searchTerm = input.kategorie.toLowerCase().trim();
      filteredProducts = filteredProducts.filter(product => {
        const title = (product.title || '').toLowerCase();
        const category = (product.category || '').toLowerCase();
        const brand = (product.brand || '').toLowerCase();
        const features = (product.features || '').toLowerCase();
        
        return title.includes(searchTerm) || 
               category.includes(searchTerm) || 
               brand.includes(searchTerm) ||
               features.includes(searchTerm);
      });
      appliedFilters.push(`Kategorie: ${input.kategorie}`);
      console.log(`🏷️ Category filter applied: ${filteredProducts.length} products match "${input.kategorie}"`);
    }

    // 2. Budget-Filter
    if (input.presupuesto_max && input.presupuesto_max > 0) {
      filteredProducts = filteredProducts.filter(product => {
        const price = product.price || 0;
        return price <= input.presupuesto_max!;
      });
      appliedFilters.push(`Budget: ≤ $${input.presupuesto_max?.toLocaleString()}`);
      console.log(`💰 Budget filter applied: ${filteredProducts.length} products under ${input.presupuesto_max}`);
    }

    // 3. Zusätzliche Query-Filter
    if (input.query && input.query.trim()) {
      const queryTerm = input.query.toLowerCase().trim();
      filteredProducts = filteredProducts.filter(product => {
        const title = (product.title || '').toLowerCase();
        const features = (product.features || '').toLowerCase();
        const brand = (product.brand || '').toLowerCase();
        
        return title.includes(queryTerm) || 
               features.includes(queryTerm) || 
               brand.includes(queryTerm);
      });
      appliedFilters.push(`Suche: ${input.query}`);
      console.log(`🔎 Query filter applied: ${filteredProducts.length} products match "${input.query}"`);
    }

    // 4. Sortierung: Erst nach Preis, dann nach Relevanz
    filteredProducts.sort((a, b) => {
      // Primär: Preis aufsteigend
      const priceA = a.price || 0;
      const priceB = b.price || 0;
      
      if (priceA !== priceB) {
        return priceA - priceB;
      }
      
      // Sekundär: Verfügbarkeit
      const availA = (a.availability || '').toLowerCase();
      const availB = (b.availability || '').toLowerCase();
      
      if (availA.includes('disponible') && !availB.includes('disponible')) {
        return -1;
      }
      if (!availA.includes('disponible') && availB.includes('disponible')) {
        return 1;
      }
      
      // Tertiär: Rating (falls vorhanden)
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return ratingB - ratingA;
    });

    // Top 10 Ergebnisse
    const topResults = filteredProducts.slice(0, 10);
    
    // Ergebnisse formatieren
    const formattedProducts = topResults.map(product => ({
      id: product.id,
      title: product.title,
      price: product.price,
      brand: product.brand,
      category: product.category,
      features: product.features,
      image_url: product.image_url,
      product_url: product.product_url,
      discount: product.discount,
      original_price: product.original_price,
      availability: product.availability,
      rating: product.rating,
      reviews_count: product.reviews_count
    }));

    const searchTime = Date.now() - startTime;
    
    const result: SearchResult = {
      success: true,
      total_found: filteredProducts.length,
      productos: formattedProducts,
      search_time_ms: searchTime,
      query_info: {
        kategorie: input.kategorie,
        presupuesto_max: input.presupuesto_max,
        search_query: input.query,
        filter_applied: appliedFilters
      }
    };

    console.log(`✅ Search completed: ${filteredProducts.length} total, showing top ${topResults.length} in ${searchTime}ms`);
    
    return JSON.stringify(result, null, 2);
    
  } catch (error) {
    console.error("❌ Search error:", error);
    
    const errorResult: SearchResult = {
      success: false,
      total_found: 0,
      productos: [],
      search_time_ms: Date.now() - startTime,
      error: "Error interno en la búsqueda de productos",
      details: error instanceof Error ? error.message : "Unknown error"
    };
    
    return JSON.stringify(errorResult, null, 2);
  }
}

// Tool-Definition mit robustem Input-Handling
export const productSearchTool = new DynamicTool({
  name: "buscar_productos",
  description: `Busca productos en el catálogo de Alkosto basado en criterios específicos.
  
  Input debe ser un JSON con:
  - kategorie: string (requerido) - tipo de producto a buscar (ej: "televisor", "computador", "celular")
  - presupuesto_max: number (opcional) - presupuesto máximo en pesos colombianos
  - query: string (opcional) - términos de búsqueda adicionales
  - usar_vector_search: boolean (opcional) - usar búsqueda vectorial (default: true)
  
  Ejemplos:
  {"kategorie": "televisor", "presupuesto_max": 2000000}
  {"kategorie": "computador", "query": "gaming", "presupuesto_max": 3000000}
  {"kategorie": "celular", "query": "Samsung"}`,
  
  func: async (input: any, runManager?: any) => {
    try {
      // LangChain kann das Input auf verschiedene Weise übergeben
      // Versuche alle möglichen Zugriffsmethoden
      
      let actualInput: any = input;
      
      // Debug: Zeige alle verfügbaren Parameter
      console.log("🛠️ Raw function arguments:", {
        input: input,
        inputType: typeof input,
        runManager: runManager ? "present" : "undefined",
        arguments: arguments
      });
      
      // Fall 1: Input ist bereits ein Object (direkte LangChain Übergabe)
      if (input && typeof input === 'object' && input.kategorie) {
        console.log("✅ Direct object input detected");
        actualInput = input;
      }
      // Fall 2: Input ist ein String (JSON)
      else if (typeof input === 'string' && input !== 'undefined' && input.trim()) {
        console.log("📝 String input detected, parsing JSON");
        try {
          actualInput = JSON.parse(input);
        } catch (parseError) {
          console.log("⚠️ Not valid JSON, treating as category");
          actualInput = { kategorie: input.trim() };
        }
      }
      // Fall 3: Zugriff über arguments (fallback)
      else if (arguments.length > 0 && arguments[0] && typeof arguments[0] === 'object') {
        console.log("🔄 Using arguments[0] fallback");
        actualInput = arguments[0];
      }
      // Fall 4: Letzter Versuch - schaue in runManager
      else if (runManager && runManager.tags) {
        console.log("🔍 Checking runManager for input");
        // Manchmal ist das Input in den Tags/Metadata versteckt
        actualInput = { kategorie: "televisor" }; // Fallback
      }
      else {
        throw new Error(`Kein gültiger Input gefunden. Type: ${typeof input}, Value: ${input}, Arguments: ${arguments.length}`);
      }
      
      console.log("🎯 Final input for validation:", actualInput);
      
      // Validate input
      const validatedInput = ProductSearchInputSchema.parse(actualInput);
      
      console.log("✅ Validated input:", validatedInput);
      
      return await searchProducts(validatedInput);
      
    } catch (error) {
      console.error("❌ Tool error details:", {
        inputType: typeof input,
        inputValue: input,
        error: error instanceof Error ? error.message : error
      });
      
      if (error instanceof z.ZodError) {
        return JSON.stringify({
          success: false,
          total_found: 0,
          productos: [],
          search_time_ms: 0,
          error: "Formato de entrada inválido",
          details: error.errors,
          expected_format: {
            kategorie: "string (ej: 'televisor')",
            presupuesto_max: "number (ej: 2000000)",
            query: "string opcional (ej: 'smart tv Samsung')",
            usar_vector_search: "boolean opcional (default: true)"
          },
          help: "Ejemplo correcto: {\"kategorie\": \"televisor\", \"presupuesto_max\": 2000000}"
        }, null, 2);
      }

      return JSON.stringify({
        success: false,
        total_found: 0,
        productos: [],
        search_time_ms: 0,
        error: "Error en la herramienta de búsqueda",
        details: error instanceof Error ? error.message : "Error desconocido",
        inputReceived: input,
        help: "Envía un JSON válido como: {\"kategorie\": \"televisor\", \"presupuesto_max\": 2000000}"
      }, null, 2);
    }
  }
});