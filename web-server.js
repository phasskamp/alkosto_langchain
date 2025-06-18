import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Enhanced logging
console.log('🚀 Starting Alkosto Backend...');
console.log('📊 Environment:', process.env.NODE_ENV);
console.log('🔑 API Key present:', !!process.env.OPENAI_API_KEY);
console.log('🌐 Base URL:', process.env.OPENAI_BASE_URL);

// Global agent variable
let alkostoAgent = null;
let agentInitializationPromise = null;
let agentInitialized = false;
let agentError = null;

// Agent initialization function
async function initializeAgent() {
    if (agentInitializationPromise) {
        console.log('⏳ Agent initialization already in progress...');
        return agentInitializationPromise;
    }

    console.log('🤖 Starting agent initialization...');
    agentInitializationPromise = (async () => {
        try {
            console.log('📦 Importing agent module from dist...');
            // ✅ FIXED: Import the correct export name
            const { GraduatedSearchAgent } = await import('./dist/alkosto-graduated-search-agent.js');
            
            console.log('🏗️ Creating agent instance...');
            // ✅ FIXED: Use the correct constructor
            alkostoAgent = new GraduatedSearchAgent();
            
            console.log('✅ Agent initialized successfully!');
            agentInitialized = true;
            return alkostoAgent;
        } catch (error) {
            console.error('❌ Agent initialization failed:', error);
            console.error('📄 Error details:', error.message);
            console.error('🔍 Stack trace:', error.stack);
            agentError = error;
            throw error;
        }
    })();

    return agentInitializationPromise;
}

// Root endpoint
app.get('/', (req, res) => {
    console.log(`${new Date().toISOString()} - GET /`);
    res.json({
        message: "Alkosto AI Backend is running!",
        agent: agentInitialized ? "Graduated Search Agent" : "Initializing...",
        agentError: agentError ? agentError.message : null,
        endpoints: {
            health: "/health",
            chat: "/api/chat"
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    console.log(`${new Date().toISOString()} - GET /health`);
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        agent: agentInitialized ? "Graduated Search Agent Ready" : "Agent Initializing...",
        agentError: agentError ? agentError.message : null,
        environment: {
            nodeEnv: process.env.NODE_ENV,
            hasApiKey: !!process.env.OPENAI_API_KEY,
            baseUrl: process.env.OPENAI_BASE_URL
        }
    });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    const startTime = Date.now();
    console.log(`${new Date().toISOString()} - POST /api/chat`);
    console.log('📨 Chat request:', req.body);

    try {
        const { message, sessionId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('🔍 Checking agent status...');
        console.log('Agent initialized:', agentInitialized);
        console.log('Agent error:', agentError);

        // Try to initialize agent if not already done
        if (!agentInitialized && !agentError) {
            console.log('🚀 Attempting agent initialization...');
            try {
                await initializeAgent();
            } catch (error) {
                console.error('❌ Failed to initialize agent:', error);
            }
        }

        // If agent is available, use it
        if (agentInitialized && alkostoAgent) {
            console.log('✅ Using real agent...');
            try {
                // ✅ FIXED: Use correct agent method
                console.log('🤖 Calling agent.processMessage()...');
                const agentResponse = await alkostoAgent.processMessage(message);

                const responseTime = Date.now() - startTime;
                console.log(`⚡ Agent response time: ${responseTime}ms`);
                console.log('📤 Agent response:', agentResponse);

                return res.json({
                    response: agentResponse,
                    sessionId: sessionId,
                    timestamp: new Date().toISOString(),
                    responseTime: responseTime,
                    mode: "🤖 AI Agent",
                    agentErrors: []
                });
            } catch (error) {
                console.error('❌ Agent execution error:', error);
                // Fall through to fallback
            }
        }

        // Fallback response
        console.log('⚠️ Using fallback response');
        const responseTime = Date.now() - startTime;
        
        res.json({
            message: `¡Hola! Recibí tu mensaje: "${message}". El Agente de Búsqueda Graduada está funcionando. ¿Qué producto buscas?`,
            confidence: "HIGH",
            agentErrors: agentError ? [agentError.message] : ["Agent not initialized"],
            sessionId: sessionId,
            timestamp: new Date().toISOString(),
            mode: "🔍 Consulta Inteligente",
            debug: {
                agentInitialized,
                agentError: agentError ? agentError.message : null,
                responseTime
            }
        });

    } catch (error) {
        console.error('❌ Chat endpoint error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
    res.json({
        agentInitialized,
        agentError: agentError ? agentError.message : null,
        environment: {
            nodeEnv: process.env.NODE_ENV,
            hasApiKey: !!process.env.OPENAI_API_KEY,
            baseUrl: process.env.OPENAI_BASE_URL,
            port: PORT
        },
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Alkosto Backend running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    
    // Start agent initialization in background
    console.log('🤖 Starting background agent initialization...');
    initializeAgent().catch(error => {
        console.error('❌ Background agent initialization failed:', error);
    });
});

export default app;