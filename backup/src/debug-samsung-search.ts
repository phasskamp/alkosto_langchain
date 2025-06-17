// Debug Samsung TV Search
import { productSearchTool } from "./tools/product-search-tool-final.js";

async function debugSamsungSearch() {
  console.log("🔍 DEBUG: Samsung TV Search\n");
  
  // Test 1: Normale TV-Suche
  console.log("1️⃣ Testing normal TV search:");
  const result1 = await productSearchTool.invoke({ 
    input: JSON.stringify({kategorie: "televisor", presupuesto_max: 2000000}) 
  });
  const data1 = JSON.parse(result1);
  console.log(`Found ${data1.total_found} TVs`);
  data1.productos.forEach((p: any, i: number) => {
    console.log(`${i+1}. ${p.brand} - ${p.title}`);
  });
  
  // Test 2: Samsung-spezifische Suche
  console.log("\n2️⃣ Testing Samsung-specific search:");
  const result2 = await productSearchTool.invoke({ 
    input: JSON.stringify({
      kategorie: "televisor", 
      presupuesto_max: 2000000,
      marca: "samsung"  // Versuche Marken-Filter
    }) 
  });
  const data2 = JSON.parse(result2);
  console.log(`Found ${data2.total_found} Samsung TVs`);
  data2.productos.forEach((p: any, i: number) => {
    console.log(`${i+1}. ${p.brand} - ${p.title}`);
  });
  
  // Test 3: Alle verfügbaren TV-Marken anzeigen
  console.log("\n3️⃣ All TV brands available:");
  const allBrands = new Set();
  data1.productos.forEach((p: any) => allBrands.add(p.brand));
  console.log("Available brands:", Array.from(allBrands).join(", "));
}

debugSamsungSearch().catch(console.error);
