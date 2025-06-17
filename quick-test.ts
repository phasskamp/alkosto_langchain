import { enhancedProductSearchTool } from "./src/tools/enhanced-product-search-tool.js";

async function quickTest() {
  console.log("🧪 Testing enhanced tool...");
  const result = await enhancedProductSearchTool.func("televisor Samsung");
  console.log("📋 Ergebnis:", result);
}

quickTest().catch(console.error);
