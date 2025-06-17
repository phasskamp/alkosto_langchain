// src/alkosto-chatbot-smart.ts - SMART CHATBOT mit Brand-Awareness
import dotenv from "dotenv";
dotenv.config();

import { productSearchTool } from "./tools/product-search-tool-final.js";

// 🎯 Smart Alkosto Chatbot mit Brand-Intelligence
async function smartAlkostoChatbot(userInput: string) {
  console.log("🛍️ Alkosto Chatbot - ¡Hola! Soy tu asistente de ventas");
  console.log("💬 Tu consulta:", userInput);
  
  try {
    // ✅ Brand Detection
    const brandRequested = detectBrand(userInput);
    const category = detectCategory(userInput);
    const budget = detectBudget(userInput);
    
    console.log("🔍 Buscando productos...");
    
    // ✅ Tool-Aufruf
    const toolInput = JSON.stringify({
      kategorie: category,
      presupuesto_max: budget
    });
    
    const result = await productSearchTool.invoke({ input: toolInput });
    const data = JSON.parse(result);
    
    if (data.success && data.productos.length > 0) {
      // ✅ Smart Brand Filtering NACH der Suche
      let filteredProducts = data.productos;
      
      if (brandRequested) {
        const brandFiltered = filteredProducts.filter((p: any) => 
          p.brand.toLowerCase().includes(brandRequested.toLowerCase()) ||
          p.title.toLowerCase().includes(brandRequested.toLowerCase())
        );
        
        if (brandFiltered.length > 0) {
          filteredProducts = brandFiltered;
        } else {
          // ✅ Keine Marke gefunden - ehrliche Antwort
          console.log(`\n😅 Lo siento, no tenemos productos de ${brandRequested} disponibles en este momento.`);
          console.log("\n💡 Pero te puedo mostrar excelentes alternativas:");
          
          // Zeige verfügbare Marken
          const availableBrands = [...new Set(data.productos.map((p: any) => p.brand))];
          console.log(`🏷️ Marcas disponibles: ${availableBrands.join(", ")}`);
        }
      }
      
      // ✅ Produkte anzeigen
      console.log(`\n🎯 ${brandRequested ? (filteredProducts.length === data.productos.length ? `Productos de ${brandRequested}:` : "Alternativas recomendadas:") : "Productos encontrados:"}\n`);
      
      filteredProducts.slice(0, 3).forEach((producto: any, index: number) => {
        const precio = parseFloat(producto.price.replace(" COP", ""));
        const precioFormateado = precio.toLocaleString('es-CO');
        
        console.log(`${index + 1}. 📺 ${producto.title}`);
        console.log(`   💰 Precio: $${precioFormateado} COP`);
        console.log(`   🏷️ Marca: ${producto.brand}`);
        
        // ✅ Smart Recommendations
        if (precio < budget * 0.7) {
          console.log(`   💚 ¡Excelente precio! Te ahorras dinero`);
        }
        console.log("");
      });
      
      if (brandRequested && filteredProducts.length < data.productos.length) {
        console.log(`🔍 ¿Te interesan las alternativas de ${filteredProducts[0]?.brand || "otras marcas"}?`);
      }
      
      console.log("💬 ¿Necesitas más información sobre algún producto?");
      
    } else {
      console.log("😕 No encontré productos que coincidan con tu búsqueda.");
      console.log("💡 ¿Podrías ajustar tu presupuesto o categoría?");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("😅 Disculpa, tuve un problema. ¿Podrías intentar de nuevo?");
  }
}

// 🔍 Brand Detection
function detectBrand(input: string): string | null {
  const brands = ["samsung", "lg", "sony", "hyundai", "kalley", "xiaomi", "huawei", "apple"];
  const lowerInput = input.toLowerCase();
  
  for (const brand of brands) {
    if (lowerInput.includes(brand)) {
      return brand;
    }
  }
  return null;
}

// 📱 Category Detection  
function detectCategory(input: string): string {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes("televisor") || lowerInput.includes("tv")) return "televisor";
  if (lowerInput.includes("celular") || lowerInput.includes("móvil") || lowerInput.includes("smartphone")) return "celular";
  if (lowerInput.includes("computador") || lowerInput.includes("laptop") || lowerInput.includes("portátil")) return "computador";
  if (lowerInput.includes("lavadora")) return "lavadora";
  
  return "televisor"; // default
}

// 💰 Budget Detection
function detectBudget(input: string): number {
  const millionMatch = input.match(/(\d+\.?\d*)\s*(millón|millones)/i);
  if (millionMatch) return parseInt(millionMatch[1]) * 1000000;
  
  const thousandMatch = input.match(/(\d+)\s*mil/i);
  if (thousandMatch) return parseInt(thousandMatch[1]) * 1000;
  
  return 2000000; // default 2M
}

// 🚀 TESTS
async function runSmartTests() {
  console.log("🎉 TESTING SMART ALKOSTO CHATBOT\n");
  
  const testQueries = [
    "Busco un televisor Samsung por menos de 2 millones de pesos",
    "Necesito un TV Hyundai económico",
    "¿Tienen celulares Xiaomi baratos?",
    "Computadores portátiles disponibles"
  ];
  
  for (let i = 0; i < testQueries.length; i++) {
    console.log("=".repeat(70));
    console.log(`🧪 TEST ${i + 1}:`);
    console.log("=".repeat(70));
    
    await smartAlkostoChatbot(testQueries[i]);
    
    if (i < testQueries.length - 1) {
      console.log("\n" + "⏸️".repeat(15) + " NEXT TEST " + "⏸️".repeat(15) + "\n");
    }
  }
  
  console.log("\n" + "🎉".repeat(20));
  console.log("✅ SMART ALKOSTO CHATBOT COMPLETE!");
  console.log("🎯 Handles brand requests intelligently!");
  console.log("🎉".repeat(20));
}

runSmartTests().catch(console.error);
