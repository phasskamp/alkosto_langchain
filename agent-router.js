// agent-router.js - TypeScript-kompatibler Import mit echtem Agent Support
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// CONFIGURATION & CONSTANTS
// =============================================================================

// Supported Agent Configurations
const AGENT_CONFIGS = {
  graduated: {
    name: 'Graduated Search Agent',
    description: 'Smart early search with graduated readiness logic',
    module: './src/alkosto-graduated-search-agent.ts',
    className: 'GraduatedSearchAgent',
    version: '5.0',
    features: ['early-search', 'confidence-levels', 'dynamic-criteria']
  },
  dynamic: {
    name: 'Dynamic Criteria Agent',
    description: 'Dynamic criteria discovery and adaptation',
    module: './src/alkosto-dynamic-agent.ts',
    className: 'DynamicAgent',
    version: '4.0',
    features: ['dynamic-criteria', 'adaptive-questions']
  },
  sophisticated: {
    name: 'Sophisticated Agent',
    description: 'Advanced conversational AI with memory',
    module: './src/alkosto-sophisticated-agent.ts',
    className: 'SophisticatedAgent',
    version: '3.0',
    features: ['memory', 'context-aware', 'personalization']
  }
};

// Get list of supported agent types
const SUPPORTED_AGENT_TYPES = Object.keys(AGENT_CONFIGS);

// =============================================================================
// AGENT MANAGER CLASS
// =============================================================================

class AgentManager {
  constructor() {
    this.agents = new Map();
    this.agentConfigs = new Map();
    this.fallbackAgent = null;
    
    console.log('🤖 AgentManager initialized');
    console.log(`📋 Supported agent types: ${SUPPORTED_AGENT_TYPES.join(', ')}`);
  }

  /**
   * Get available agent types
   */
  getSupportedTypes() {
    return SUPPORTED_AGENT_TYPES;
  }

  /**
   * Get agent configuration
   */
  getAgentConfig(agentType) {
    return this.agentConfigs.get(agentType) || AGENT_CONFIGS[agentType];
  }

  /**
   * Load and initialize agent by type
   */
  async loadAgent(agentType) {
    if (!SUPPORTED_AGENT_TYPES.includes(agentType)) {
      throw new Error(`Unsupported agent type: ${agentType}. Supported: ${SUPPORTED_AGENT_TYPES.join(', ')}`);
    }

    if (this.agents.has(agentType)) {
      console.log(`♻️ Agent ${agentType} already loaded, reusing instance`);
      return this.agents.get(agentType);
    }

    const config = AGENT_CONFIGS[agentType];
    
    try {
      console.log(`🔄 Loading ${config.name}...`);
      
      // Für TypeScript-Dateien: Verwende tsx zur Laufzeit
      if (config.module.endsWith('.ts')) {
        const agentInstance = await this._loadTypeScriptAgent(config);
        
        // Wrapper für einheitliche Interface
        const agentWrapper = this._createAgentWrapper(agentInstance, agentType, config);
        
        // Agent und Config speichern
        this.agents.set(agentType, agentWrapper);
        this.agentConfigs.set(agentType, config);
        
        console.log(`✅ ${config.name} loaded successfully`);
        return agentWrapper;
        
      } else {
        // Für JavaScript-Dateien: Normaler Import
        const AgentClass = await this._importJavaScriptModule(config.module);
        const agentInstance = new AgentClass();
        
        const agentWrapper = this._createAgentWrapper(agentInstance, agentType, config);
        this.agents.set(agentType, agentWrapper);
        this.agentConfigs.set(agentType, config);
        
        console.log(`✅ ${config.name} loaded successfully`);
        return agentWrapper;
      }
      
    } catch (error) {
      console.error(`❌ Failed to load agent ${agentType}:`, error);
      
      // Fallback zu Mock-Agent
      console.log(`🔄 Creating fallback agent for ${agentType}...`);
      const fallbackAgent = await this._createFallbackAgent(agentType, config);
      this.agents.set(agentType, fallbackAgent);
      
      return fallbackAgent;
    }
  }

  /**
   * Load TypeScript agent with real agent support
   */
  async _loadTypeScriptAgent(config) {
    try {
      console.log(`🔍 Loading REAL TypeScript agent: ${config.module}`);
      
      // Dynamischer Import des echten TypeScript-Agents
      const fullPath = path.resolve(process.cwd(), config.module);
      console.log(`📂 Full path: ${fullPath}`);
      
      const module = await import(`file://${fullPath}`);
      console.log(`✅ Successfully loaded agent module`);
      
      // Check if the class exists
      const AgentClass = module[config.className];
      if (!AgentClass) {
        throw new Error(`Class ${config.className} not found in module ${config.module}`);
      }
      
      console.log(`🏗️ Creating instance of ${config.className}...`);
      const agentInstance = new AgentClass();
      
      console.log(`✅ ${config.className} instance created successfully`);
      return agentInstance;
      
    } catch (error) {
      console.error(`❌ Failed to load TypeScript agent:`, error);
      console.log(`🔄 Falling back to mock agent...`);
      throw error; // Let the caller handle fallback
    }
  }

  /**
   * Load JavaScript agent (for future use)
   */
  async _importJavaScriptModule(modulePath) {
    const fullPath = path.resolve(process.cwd(), modulePath);
    const module = await import(`file://${fullPath}`);
    return module.default || module;
  }

  /**
   * Create agent wrapper with unified interface
   */
  _createAgentWrapper(agentInstance, agentType, config) {
    return {
      instance: agentInstance,
      type: agentType,
      config: config,
      
      async processMessage(message, sessionId = null) {
        try {
          console.log(`🤖 [${config.name}] Processing: "${message.slice(0, 50)}..."`);
          
          const startTime = Date.now();
          const result = await agentInstance.processMessage(message);
          const processingTime = Date.now() - startTime;
          
          // Ensure agentErrors field exists
          if (!result.hasOwnProperty('agentErrors')) {
            result.agentErrors = [];
          }
          
          console.log(`⚡ [${config.name}] Response time: ${processingTime}ms`);
          console.log(`🧠 [${config.name}] Mode: ${result.consultation_mode ? 'Consultation' : 'Search'}`);
          console.log(`📊 [${config.name}] Readiness: ${result.search_readiness || 'N/A'}`);
          
          return {
            ...result,
            agentType,
            agentVersion: config.version,
            processingTime
          };
          
        } catch (error) {
          console.error(`❌ Agent processing error:`, error);
          
          return {
            response: "Lo siento, hubo un problema procesando tu consulta. Por favor intenta de nuevo.",
            context: {},
            processing_time: 0,
            consultation_mode: false,
            agentErrors: [`Processing error: ${error.message}`],
            agentType,
            agentVersion: config.version
          };
        }
      },
      
      getInfo() {
        return {
          name: config.name,
          description: config.description,
          version: config.version,
          features: config.features,
          type: agentType
        };
      }
    };
  }

  /**
   * Create fallback mock agent when real agent fails
   */
  async _createFallbackAgent(agentType, config) {
    console.log(`🎭 Creating fallback mock agent for ${agentType}...`);
    
    // Enhanced mock agent with proper agentErrors
    class MockAgent {
      constructor() {
        console.log(`🎯 Creating mock ${config.name}...`);
      }

      async processMessage(message) {
        console.log(`🎭 Mock processing: "${message}"`);
        
        // More intelligent mock responses based on message content
        let response;
        let searchReadiness = 'insufficient';
        let consultationMode = true;
        
        if (message.toLowerCase().includes('hola') || message.toLowerCase().includes('hi')) {
          response = "¡Hola! Soy tu asistente de Alkosto. ¿En qué tipo de producto estás interesado? Puedo ayudarte con televisores, celulares, computadores y mucho más.";
        } else if (message.toLowerCase().includes('televisor')) {
          response = "Perfecto, te ayudo con televisores. ¿Cuál es tu presupuesto aproximado?";
          searchReadiness = 'viable';
        } else if (message.toLowerCase().includes('celular')) {
          response = "Excelente, busquemos el celular ideal para ti. ¿Para qué lo vas a usar principalmente?";
          searchReadiness = 'viable';
        } else if (message.toLowerCase().includes('presupuesto') || message.toLowerCase().includes('millones')) {
          response = "Perfecto, con esa información puedo mostrarte algunas opciones. ¿Hay alguna marca de tu preferencia?";
          searchReadiness = 'ready';
          consultationMode = false;
        } else {
          response = `Entiendo que buscas algo relacionado con "${message}". ¿Podrías ser más específico sobre qué tipo de producto necesitas?`;
        }
        
        return {
          response,
          context: { conversation_history: [message] },
          processing_time: Math.floor(Math.random() * 1000) + 500, // Random 500-1500ms
          consultation_mode: consultationMode,
          search_readiness: searchReadiness,
          category_analysis: `Mock analysis for: ${message}`,
          criteria_analysis: { 
            status: 'mock',
            confidence: searchReadiness === 'ready' ? 'high' : 'medium',
            missing_info: searchReadiness === 'insufficient' ? ['category', 'budget'] : []
          },
          agentErrors: [] // ← FIXED: Always include agentErrors
        };
      }
    }

    const mockInstance = new MockAgent();
    return this._createAgentWrapper(mockInstance, agentType, {
      ...config,
      name: `${config.name} (Mock)`,
      version: `${config.version}-mock`
    });
  }

  /**
   * Process message with specific agent
   */
  async processMessage(agentType, message, sessionId = null) {
    try {
      const agent = await this.loadAgent(agentType);
      return await agent.processMessage(message, sessionId);
      
    } catch (error) {
      console.error(`❌ Error processing message with ${agentType}:`, error);
      
      return {
        response: "Lo siento, hubo un problema procesando tu consulta. Por favor intenta de nuevo.",
        error: error.message,
        agentType,
        success: false,
        consultation_mode: false,
        agentErrors: [`Agent error: ${error.message}`]
      };
    }
  }

  /**
   * Get agent status and info
   */
  getAgentStatus(agentType) {
    if (!SUPPORTED_AGENT_TYPES.includes(agentType)) {
      return { status: 'unsupported', message: `Agent type ${agentType} not supported` };
    }

    if (this.agents.has(agentType)) {
      const agent = this.agents.get(agentType);
      return {
        status: 'loaded',
        info: agent.getInfo(),
        loadedAt: new Date().toISOString()
      };
    }

    return {
      status: 'not_loaded',
      config: AGENT_CONFIGS[agentType]
    };
  }

  /**
   * Unload agent (for memory management)
   */
  unloadAgent(agentType) {
    if (this.agents.has(agentType)) {
      this.agents.delete(agentType);
      this.agentConfigs.delete(agentType);
      console.log(`🗑️ Agent ${agentType} unloaded`);
    }
  }

  /**
   * Get system info
   */
  getSystemInfo() {
    return {
      supportedTypes: SUPPORTED_AGENT_TYPES,
      loadedAgents: Array.from(this.agents.keys()),
      agentConfigs: Object.fromEntries(
        Object.entries(AGENT_CONFIGS).map(([type, config]) => [
          type, 
          { name: config.name, version: config.version, features: config.features }
        ])
      )
    };
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

// Create global agent manager instance
const agentManager = new AgentManager();

/**
 * Main router function for agent selection and message processing
 */
async function agentRouter(req, res) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`\n🚀 [${requestId}] New request received`);
    
    // Extract request data
    const { message, agentType = 'graduated', sessionId = null } = req.body;
    
    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message is required and must be a non-empty string',
        requestId,
        success: false
      });
    }

    if (!SUPPORTED_AGENT_TYPES.includes(agentType)) {
      return res.status(400).json({
        error: `Unsupported agent type: ${agentType}`,
        supportedTypes: SUPPORTED_AGENT_TYPES,
        requestId,
        success: false
      });
    }

    console.log(`📝 [${requestId}] Message: "${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"`);
    console.log(`🤖 [${requestId}] Agent: ${agentType}`);
    console.log(`🔗 [${requestId}] Session: ${sessionId || 'new'}`);

    // Process message with selected agent
    const result = await agentManager.processMessage(agentType, message, sessionId);
    
    const responseTime = Date.now() - startTime;
    
    // Enhanced response with metadata
    const response = {
      message: result.response,
      confidence: result.search_readiness === 'ready' ? 'HIGH' : 
                 result.search_readiness === 'viable' ? 'MEDIUM' : 'LOW',
      responseTime,
      timestamp: new Date().toISOString(),
      agentType,
      success: true,
      phase: result.consultation_mode ? 'consultation' : 'search',
      suggestions: result.suggestions || [
        "Intenta reformular tu pregunta",
        "¿Puedes ser más específico?",
        "Escribe \"ayuda\" para ver ejemplos"
      ],
      requestTime: result.processing_time || responseTime,
      requestId,
      supportedTypes: SUPPORTED_AGENT_TYPES,
      agentErrors: result.agentErrors || [] // ← FIXED: Always include agentErrors
    };

    console.log(`✅ [${requestId}] Response sent in ${responseTime}ms`);
    console.log(`📊 [${requestId}] Confidence: ${response.confidence}`);
    console.log(`🔄 [${requestId}] Phase: ${response.phase}`);
    
    res.json(response);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error(`❌ [${requestId}] Router error:`, error);
    
    res.status(500).json({
      message: "Lo siento, hubo un problema procesando tu consulta. Por favor intenta de nuevo.",
      error: error.message,
      responseTime,
      timestamp: new Date().toISOString(),
      agentType: req.body?.agentType || 'unknown',
      success: false,
      confidence: "LOW",
      phase: "error",
      suggestions: [
        "Intenta reformular tu pregunta",
        "¿Puedes ser más específico?", 
        "Escribe \"ayuda\" para ver ejemplos"
      ],
      requestTime: responseTime,
      requestId,
      supportedTypes: SUPPORTED_AGENT_TYPES,
      agentErrors: [`Router error: ${error.message}`] // ← FIXED: Include agentErrors in error case
    });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { agentRouter, agentManager, SUPPORTED_AGENT_TYPES, AGENT_CONFIGS };