import { enhancedProductSearchTool } from "./src/tools/enhanced-product-search-tool.js";

async function testRealCSV() {
  console.log("🧪 Testing mit echten CSV-Feldern...");
  
  const tests = [
    "Samsung",          // Sollte Samsung Produkte finden
    "televisor",        // Sollte TVs finden  
    "SAMSUNG lavadora", // Sollte Samsung Waschmaschinen finden
    "celular"           // Sollte Handys finden
  ];
  
  for (const test of tests) {
    console.log(`
🔍 Teste: "${test}"`);
    const result = await enhancedProductSearchTool.func(test);
    console.log(`📋 Ergebnis: ${result.substring(0, 300)}...`);
    console.log("-".repeat(50));
  }
}

testRealCSV().catch(console.error);
