// src/test-agent.ts
import { createAlkostoAgent } from "./agent.ts";

const run = async () => {
  const agent = await createAlkostoAgent();
  
  const response = await agent.invoke({
    input: "Busco un televisor Samsung por menos de 2 millones de pesos"
  });
  
  console.log("🔽 Respuesta del agente:");
  console.log(response);
};

run();
