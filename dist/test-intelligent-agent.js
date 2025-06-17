// test-intelligent-agent.ts
import { testIntelligentConsultation } from "./alkosto-intelligent-agent.js";
import * as dotenv from "dotenv";
dotenv.config();
console.log("🚀 Starting Alkosto Intelligent Agent Test...\n");
testIntelligentConsultation().catch(console.error);
