// CSV Samsung Analysis
import Papa from 'papaparse';
import { readFileSync } from 'fs';
async function analyzeSamsungInCSV() {
    console.log("🔍 ANALYZING CSV FOR SAMSUNG PRODUCTS\n");
    try {
        // ✅ CSV direkt lesen
        const csvContent = readFileSync('final_merged_all_categories_updated.csv', 'utf8');
        console.log("📊 CSV file loaded successfully");
        // ✅ Parse CSV
        const parsed = Papa.parse(csvContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
        });
        console.log(`📦 Total products in CSV: ${parsed.data.length}`);
        // ✅ Suche nach Samsung in verschiedenen Feldern
        const samsungProducts = parsed.data.filter((product) => {
            const title = (product.title || '').toLowerCase();
            const brand = (product.brand || '').toLowerCase();
            const category = (product.category || '').toLowerCase();
            const description = (product.description || '').toLowerCase();
            return title.includes('samsung') ||
                brand.includes('samsung') ||
                category.includes('samsung') ||
                description.includes('samsung');
        });
        console.log(`🎯 Samsung products found: ${samsungProducts.length}\n`);
        if (samsungProducts.length > 0) {
            console.log("📺 SAMSUNG PRODUCTS FOUND:");
            console.log("=".repeat(60));
            samsungProducts.slice(0, 10).forEach((product, index) => {
                console.log(`${index + 1}. ${product.title}`);
                console.log(`   Brand: ${product.brand}`);
                console.log(`   Price: ${product.price}`);
                console.log(`   Category: ${product.category || 'N/A'}`);
                console.log("");
            });
            if (samsungProducts.length > 10) {
                console.log(`... und ${samsungProducts.length - 10} weitere Samsung Produkte`);
            }
        }
        else {
            console.log("❌ Keine Samsung-Produkte gefunden");
            // ✅ Zeige alle verfügbaren Marken
            console.log("\n🏷️ ALLE VERFÜGBAREN MARKEN:");
            const allBrands = new Set();
            parsed.data.forEach((product) => {
                if (product.brand) {
                    allBrands.add(product.brand);
                }
            });
            const brandArray = Array.from(allBrands).sort();
            console.log(brandArray.join(", "));
        }
        // ✅ Suche speziell nach TVs
        console.log("\n📺 TV ANALYSIS:");
        console.log("=".repeat(40));
        const tvProducts = parsed.data.filter((product) => {
            const title = (product.title || '').toLowerCase();
            return title.includes('tv') || title.includes('televisor');
        });
        console.log(`📺 Total TV products: ${tvProducts.length}`);
        const tvBrands = new Set();
        tvProducts.forEach((product) => {
            if (product.brand) {
                tvBrands.add(product.brand);
            }
        });
        console.log(`🏷️ TV Brands: ${Array.from(tvBrands).sort().join(", ")}`);
        // ✅ Speziell Samsung TVs
        const samsungTVs = tvProducts.filter((product) => {
            const title = (product.title || '').toLowerCase();
            const brand = (product.brand || '').toLowerCase();
            return title.includes('samsung') || brand.includes('samsung');
        });
        console.log(`🎯 Samsung TVs specifically: ${samsungTVs.length}`);
        if (samsungTVs.length > 0) {
            console.log("\n📺 SAMSUNG TVS FOUND:");
            samsungTVs.forEach((tv, index) => {
                console.log(`${index + 1}. ${tv.title} - ${tv.price}`);
            });
        }
    }
    catch (error) {
        console.error("❌ Error reading CSV:", error.message);
    }
}
analyzeSamsungInCSV();
