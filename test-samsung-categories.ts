import { enhancedProductSearchTool } from "./src/tools/enhanced-product-search-tool.js";

async function testSamsungProducts() {
  console.log("🔍 Testing Samsung Produktkategorien...");
  
  const tests = [
    "samsung",
    "lavadora", 
    "samsung secadora",
    "samsung electrodomestico"
  ];
  
  for (const test of tests) {
    console.log(`\nTeste: "${test}"`);
    const result = await enhancedProductSearchTool.func(test);
    const lines = result.split("\n");
    console.log(lines[0]); // Erste Zeile mit Anzahl
    if (lines.length > 2) console.log(lines[2]); // Erstes Produkt
  }
}

testSamsungProducts().catch(console.error);
