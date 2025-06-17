// Direct Tool Test - Debug
import { enhancedProductSearchTool } from "./tools/product-search-tool-enhanced.js";

async function debugToolDirect() {
  console.log("🔍 DIRECT TOOL DEBUG\n");
  
  // Test 1: Direct function call
  console.log("1️⃣ Testing tool.func directly:");
  
  const testInput = JSON.stringify({
    kategorie: "televisor", 
    presupuesto_max: 2000000,
    marca: "samsung"
  });
  
  console.log("Input being sent:", testInput);
  
  try {
    // ✅ Direct func call
    const result = await enhancedProductSearchTool.func({ input: testInput });
    console.log("✅ Direct result:", result);
    
    const data = JSON.parse(result);
    console.log("📊 Parsed data:", {
      success: data.success,
      total_found: data.total_found,
      showing: data.showing,
      products_count: data.productos?.length || 0
    });
    
    if (data.success && data.productos?.length > 0) {
      console.log("\n📺 First few products:");
      data.productos.slice(0, 3).forEach((p, i) => {
        console.log(`${i+1}. ${p.brand} - ${p.title} - ${p.price}`);
      });
    }
    
  } catch (error) {
    console.error("❌ Direct test failed:", error);
  }
  
  // Test 2: Invoke method
  console.log("\n2️⃣ Testing tool.invoke:");
  
  try {
    const result2 = await enhancedProductSearchTool.invoke({ input: testInput });
    console.log("✅ Invoke result length:", result2.length);
    
  } catch (error) {
    console.error("❌ Invoke test failed:", error);
  }
}

debugToolDirect().catch(console.error);
