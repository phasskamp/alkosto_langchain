// Enhanced Product Search Tool mit Brand Intelligence
import { DynamicTool } from "@langchain/core/tools";
import { z } from "zod";
import { loadAndParseProducts } from "../utils/product-loader.js";
// ✅ Enhanced Input Schema mit Brand Support
const productSearchSchema = z.object({
    kategorie: z.string().describe("Produktkategorie (televisor, celular, computador, lavadora)"),
    presupuesto_max: z.number().optional().describe("Maximales Budget in COP"),
    marca: z.string().optional().describe("Spezifische Marke (samsung, lg, sony, hyundai, kalley, etc.)"),
    mostrar_alternativas: z.boolean().optional().default(false).describe("Soll auch andere Marken gezeigt werden?")
});
// 🎯 Enhanced Product Search Tool
export const enhancedProductSearchTool = new DynamicTool({
    name: "buscar_productos_enhanced",
    description: `Busca productos en el catálogo de Alkosto con inteligencia de marca.
  
  Características:
  - Si el usuario busca una marca específica, muestra SOLO esa marca primero
  - Puede mostrar alternativas si se solicita explícitamente
  - Sorteo inteligente: marca solicitada primero, luego por precio
  - Respuesta contextual basada en disponibilidad de marca`,
    schema: z.object({
        input: z.string().describe("JSON string con los parámetros de búsqueda")
    }),
    func: async ({ input }) => {
        console.log("🔍 EnhancedTool - raw input received:", typeof input, input);
        try {
            // ✅ Parse and validate input
            let searchParams;
            if (typeof input === 'string') {
                try {
                    searchParams = productSearchSchema.parse(JSON.parse(input));
                }
                catch (parseError) {
                    return JSON.stringify({
                        success: false,
                        error: "Invalid JSON input format",
                        total_found: 0,
                        productos: []
                    });
                }
            }
            else {
                return JSON.stringify({
                    success: false,
                    error: "Input must be a JSON string",
                    total_found: 0,
                    productos: []
                });
            }
            console.log("🔍 Enhanced search params:", searchParams);
            // ✅ Load products
            const startTime = Date.now();
            const products = await loadAndParseProducts();
            console.log(`📦 Loaded ${products.length} products`);
            // ✅ Category filtering
            const categoryNormalized = searchParams.kategorie.toLowerCase();
            console.log(`🔍 Searching for category: "${categoryNormalized}"`);
            let filteredProducts = products.filter(product => {
                const title = (product.title || '').toLowerCase();
                const searchTerms = {
                    'televisor': ['tv', 'televisor', 'smart tv'],
                    'celular': ['celular', 'smartphone', 'móvil'],
                    'computador': ['computador', 'laptop', 'portátil'],
                    'lavadora': ['lavadora'],
                    'otros': []
                };
                const terms = searchTerms[categoryNormalized] || [categoryNormalized];
                return terms.some(term => title.includes(term));
            });
            console.log(`🎯 Found ${filteredProducts.length} products for category "${categoryNormalized}"`);
            // ✅ Budget filtering
            if (searchParams.presupuesto_max) {
                const beforeBudget = filteredProducts.length;
                filteredProducts = filteredProducts.filter(product => {
                    const price = parseFloat(product.price?.toString().replace(/[^\d.]/g, '') || '0');
                    return price <= searchParams.presupuesto_max;
                });
                console.log(`💰 Budget filter: ${beforeBudget} → ${filteredProducts.length} products under ${searchParams.presupuesto_max}`);
            }
            // 🎯 BRAND INTELLIGENCE - The key enhancement!
            let finalProducts = [];
            let brandResponse = {
                requested_brand: searchParams.marca,
                brand_found: false,
                brand_products: 0,
                alternative_products: 0,
                suggestion: ""
            };
            if (searchParams.marca) {
                // ✅ User requested specific brand
                const requestedBrand = searchParams.marca.toLowerCase();
                console.log(`🏷️ Searching for specific brand: "${requestedBrand}"`);
                // Filter for requested brand
                const brandProducts = filteredProducts.filter(product => {
                    const brand = (product.brand || '').toLowerCase();
                    const title = (product.title || '').toLowerCase();
                    return brand.includes(requestedBrand) || title.includes(requestedBrand);
                });
                brandResponse.brand_products = brandProducts.length;
                brandResponse.brand_found = brandProducts.length > 0;
                if (brandProducts.length > 0) {
                    // ✅ Brand found - show brand products first
                    console.log(`✅ Found ${brandProducts.length} products for brand "${requestedBrand}"`);
                    // Sort brand products by price
                    const sortedBrandProducts = brandProducts.sort((a, b) => {
                        const priceA = parseFloat(a.price?.toString().replace(/[^\d.]/g, '') || '0');
                        const priceB = parseFloat(b.price?.toString().replace(/[^\d.]/g, '') || '0');
                        return priceA - priceB;
                    });
                    finalProducts = sortedBrandProducts.slice(0, 5); // Show up to 5 brand products
                    // ✅ Check if user wants alternatives
                    if (searchParams.mostrar_alternativas && filteredProducts.length > brandProducts.length) {
                        const alternativeProducts = filteredProducts
                            .filter(product => !brandProducts.includes(product))
                            .sort((a, b) => {
                            const priceA = parseFloat(a.price?.toString().replace(/[^\d.]/g, '') || '0');
                            const priceB = parseFloat(b.price?.toString().replace(/[^\d.]/g, '') || '0');
                            return priceA - priceB;
                        })
                            .slice(0, 3);
                        finalProducts = [...finalProducts, ...alternativeProducts];
                        brandResponse.alternative_products = alternativeProducts.length;
                    }
                    brandResponse.suggestion = searchParams.mostrar_alternativas
                        ? `Mostrando productos de ${searchParams.marca} y alternativas`
                        : `¿Te gustaría ver alternativas de otras marcas además de ${searchParams.marca}?`;
                }
                else {
                    // ❌ Brand not found - show alternatives with explanation
                    console.log(`❌ No products found for brand "${requestedBrand}"`);
                    const availableBrands = [...new Set(filteredProducts.map(p => p.brand))].filter(Boolean);
                    // Show best alternatives
                    const alternatives = filteredProducts
                        .sort((a, b) => {
                        const priceA = parseFloat(a.price?.toString().replace(/[^\d.]/g, '') || '0');
                        const priceB = parseFloat(b.price?.toString().replace(/[^\d.]/g, '') || '0');
                        return priceA - priceB;
                    })
                        .slice(0, 5);
                    finalProducts = alternatives;
                    brandResponse.alternative_products = alternatives.length;
                    brandResponse.suggestion = `No tenemos productos de ${searchParams.marca} disponibles. Marcas disponibles: ${availableBrands.join(', ')}`;
                }
            }
            else {
                // ✅ No specific brand requested - show diverse selection
                console.log(`🎯 No specific brand requested - showing diverse selection`);
                // Group by brand and show 1-2 products per brand for diversity
                const brandGroups = new Map();
                filteredProducts.forEach(product => {
                    const brand = product.brand || 'Unknown';
                    if (!brandGroups.has(brand)) {
                        brandGroups.set(brand, []);
                    }
                    brandGroups.get(brand).push(product);
                });
                // Sort within each brand by price, then take top products from each brand
                const diverseProducts = [];
                for (const [brand, products] of brandGroups) {
                    const sortedBrandProducts = products.sort((a, b) => {
                        const priceA = parseFloat(a.price?.toString().replace(/[^\d.]/g, '') || '0');
                        const priceB = parseFloat(b.price?.toString().replace(/[^\d.]/g, '') || '0');
                        return priceA - priceB;
                    });
                    // Take top 2 products from each brand
                    diverseProducts.push(...sortedBrandProducts.slice(0, 2));
                }
                // Sort final selection by price and take top 8
                finalProducts = diverseProducts
                    .sort((a, b) => {
                    const priceA = parseFloat(a.price?.toString().replace(/[^\d.]/g, '') || '0');
                    const priceB = parseFloat(b.price?.toString().replace(/[^\d.]/g, '') || '0');
                    return priceA - priceB;
                })
                    .slice(0, 8);
                brandResponse.suggestion = "Mostrando variedad de marcas disponibles";
            }
            // ✅ Format response
            const searchTime = Date.now() - startTime;
            console.log(`✅ Enhanced search completed: ${finalProducts.length} products in ${searchTime}ms`);
            if (finalProducts.length > 0) {
                console.log(`🎯 First result: "${finalProducts[0].title}" - ${finalProducts[0].price} COP`);
            }
            const formattedProducts = finalProducts.map(product => ({
                title: product.title,
                price: `${product.price} COP`,
                brand: product.brand || 'Unknown'
            }));
            return JSON.stringify({
                success: true,
                total_found: filteredProducts.length,
                showing: finalProducts.length,
                productos: formattedProducts,
                brand_intelligence: brandResponse,
                categoria: searchParams.kategorie,
                presupuesto: searchParams.presupuesto_max ? `${searchParams.presupuesto_max} COP` : "Sin límite",
                search_time_ms: searchTime
            });
        }
        catch (error) {
            console.error("❌ Enhanced tool error:", error);
            return JSON.stringify({
                success: false,
                error: error.message,
                total_found: 0,
                productos: []
            });
        }
    }
});
