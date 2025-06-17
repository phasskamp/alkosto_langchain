// Test Enhanced Product Search Tool
import { enhancedProductSearchTool } from "./tools/product-search-tool-enhanced.js";
async function testEnhancedTool() {
    console.log("🎉 TESTING ENHANCED PRODUCT SEARCH TOOL\n");
    const tests = [
        {
            name: "Samsung TV unter 2M",
            input: JSON.stringify({
                kategorie: "televisor",
                presupuesto_max: 2000000,
                marca: "samsung"
            })
        },
        {
            name: "Samsung TV mit Alternativen",
            input: JSON.stringify({
                kategorie: "televisor",
                presupuesto_max: 2000000,
                marca: "samsung",
                mostrar_alternativas: true
            })
        },
        {
            name: "Keine spezifische Marke - diverse Auswahl",
            input: JSON.stringify({
                kategorie: "televisor",
                presupuesto_max: 2000000
            })
        },
        {
            name: "Nicht-existente Marke (Apple TV)",
            input: JSON.stringify({
                kategorie: "televisor",
                presupuesto_max: 2000000,
                marca: "apple"
            })
        }
    ];
    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        console.log("=".repeat(70));
        console.log(`🧪 TEST ${i + 1}: ${test.name}`);
        console.log("=".repeat(70));
        try {
            // ✅ FIX: Korrekte Parameter-Übergabe
            const result = await enhancedProductSearchTool.invoke({
                input: test.input
            });
            const data = JSON.parse(result);
            console.log(`✅ Success: ${data.success}`);
            console.log(`📊 Total found: ${data.total_found}, Showing: ${data.showing}`);
            if (data.brand_intelligence) {
                const bi = data.brand_intelligence;
                console.log(`🏷️ Brand requested: ${bi.requested_brand || 'None'}`);
                console.log(`🎯 Brand found: ${bi.brand_found}`);
                console.log(`📦 Brand products: ${bi.brand_products}`);
                console.log(`💡 Suggestion: ${bi.suggestion}`);
            }
            console.log("\n📺 Products:");
            if (data.productos && data.productos.length > 0) {
                data.productos.forEach((product, idx) => {
                    console.log(`${idx + 1}. ${product.brand} - ${product.title} - ${product.price}`);
                });
            }
            else {
                console.log("No products found");
            }
        }
        catch (error) {
            console.error(`❌ Test failed:`, error.message);
        }
        console.log("\n");
    }
    console.log("🎉 Enhanced Tool Testing Complete!");
}
testEnhancedTool().catch(console.error);
