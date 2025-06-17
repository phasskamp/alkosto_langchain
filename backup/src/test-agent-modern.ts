// src/test-agent-modern.ts
// Test für den modernisierten Agent

import { createAlkostoAgent } from "./agent-modern.ts";

const run = async () => {
  try {
    console.log("🚀 Testing Modern Alkosto Agent...");
    
    const agent = await createAlkostoAgent();
    
    // Test verschiedene Szenarien
    const testCases = [
      "Busco un televisor Samsung por menos de 2 millones de pesos",
      "Necesito un celular bueno y económico, máximo 800 mil pesos",
      "¿Qué computadores portátiles tienen disponibles?"
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n${"=".repeat(60)}`);
      console.log(`🧪 Test ${i + 1}: ${testCase}`);
      console.log("=".repeat(60));
      
      try {
        const response = await agent.invoke({
          input: testCase
        });
        
        console.log("\n🔽 Respuesta del agente:");
        console.log(response.output);
        
        console.log("\n✅ Test completado exitosamente!");
        
        // Pausa zwischen Tests
        if (i < testCases.length - 1) {
          console.log("\n⏳ Esperando 2 segundos antes del siguiente test...");
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Error en test ${i + 1}:`, error.message);
      }
    }
    
    console.log("\n🎉 Todos los tests completados!");
    
  } catch (error) {
    console.error("🚨 Error fatal:", error);
  }
};

run();
