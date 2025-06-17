// web-server.js - Enhanced Alkosto Web Server mit Agent Router Integration
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { agentRouter, agentManager, SUPPORTED_AGENT_TYPES } from './agent-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// MIDDLEWARE & CONFIGURATION
// =============================================================================

// Body parsing middleware - CRITICAL!
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'https://alkosto-frontend.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Request Logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.requestId = requestId;
  req.startTime = Date.now();
  
  console.log(`${timestamp} [${requestId}] ${req.method} ${req.url}`);
  
  // Response time logging
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - req.startTime;
    console.log(`${timestamp} [${requestId}] Response: ${res.statusCode} (${responseTime}ms)`);
    originalSend.call(this, data);
  };
  
  next();
});

// =============================================================================
// ROUTES
// =============================================================================

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    const systemInfo = agentManager.getSystemInfo();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: 'Alkosto AI Assistant',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      agents: systemInfo,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Agent Info Endpoint
app.get('/api/agents', (req, res) => {
  try {
    const systemInfo = agentManager.getSystemInfo();
    
    res.json({
      supportedTypes: SUPPORTED_AGENT_TYPES,
      agents: systemInfo.agentConfigs,
      loadedAgents: systemInfo.loadedAgents,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get agent information',
      message: error.message
    });
  }
});

// Agent Status Endpoint
app.get('/api/agents/:agentType/status', (req, res) => {
  try {
    const { agentType } = req.params;
    const status = agentManager.getAgentStatus(agentType);
    
    res.json({
      agentType,
      ...status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get agent status',
      message: error.message
    });
  }
});

// Main Chat Endpoint - Uses Agent Router
app.post('/api/chat', async (req, res) => {
  try {
    console.log(`🎯 [${req.requestId}] Processing chat with agent: ${req.body?.agentType || 'graduated'}`);
    
    // Validate request body
    if (!req.body) {
      return res.status(400).json({
        error: 'Request body is required',
        code: 'MISSING_BODY',
        requestId: req.requestId,
        success: false
      });
    }

    // Use the agent router directly
    await agentRouter(req, res);
    
  } catch (error) {
    console.error(`❌ [${req.requestId}] Chat API Error:`, error);
    
    // Only send response if not already sent
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        message: "Lo siento, hubo un problema procesando tu consulta. Por favor intenta de nuevo.",
        code: "INTERNAL_ERROR",
        requestTime: Date.now() - req.startTime,
        requestId: req.requestId
      });
    }
  }
});

// Agent Management Endpoints
app.post('/api/agents/:agentType/load', async (req, res) => {
  try {
    const { agentType } = req.params;
    
    if (!SUPPORTED_AGENT_TYPES.includes(agentType)) {
      return res.status(400).json({
        error: `Unsupported agent type: ${agentType}`,
        supportedTypes: SUPPORTED_AGENT_TYPES
      });
    }

    const agent = await agentManager.loadAgent(agentType);
    const info = agent.getInfo();
    
    res.json({
      message: `Agent ${agentType} loaded successfully`,
      agent: info,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: `Failed to load agent ${req.params.agentType}`,
      message: error.message
    });
  }
});

app.delete('/api/agents/:agentType', (req, res) => {
  try {
    const { agentType } = req.params;
    agentManager.unloadAgent(agentType);
    
    res.json({
      message: `Agent ${agentType} unloaded successfully`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: `Failed to unload agent ${req.params.agentType}`,
      message: error.message
    });
  }
});

// Metrics Endpoint
app.get('/metrics', (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    
    res.json({
      server: {
        uptime: process.uptime(),
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
          external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
        },
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      agents: agentManager.getSystemInfo(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error.message
    });
  }
});

// Static Frontend (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// Development Frontend Info
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return; // Will be handled by static middleware above
  }
  
  res.json({
    name: 'Alkosto AI Assistant API',
    version: '1.0.0',
    status: 'running',
    environment: 'development',
    endpoints: {
      chat: `http://localhost:${PORT}/api/chat`,
      health: `http://localhost:${PORT}/health`,
      agents: `http://localhost:${PORT}/api/agents`,
      metrics: `http://localhost:${PORT}/metrics`
    },
    frontend: {
      development: `http://localhost:3001`,
      note: 'Start frontend with: cd alkosto-frontend && npm run dev -- -p 3001'
    },
    supportedAgents: SUPPORTED_AGENT_TYPES,
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'POST /api/chat',
      'GET /health',
      'GET /api/agents',
      'GET /metrics'
    ]
  });
});

// Global Error Handler
app.use((error, req, res, next) => {
  console.error(`❌ Global Error Handler:`, error);
  
  if (res.headersSent) {
    return next(error);
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on our end',
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer() {
  try {
    console.log('🤖 AgentManager initialized');
    console.log(`📋 Supported agent types: ${SUPPORTED_AGENT_TYPES.join(', ')}`);
    console.log('🚀 Starting Enhanced Alkosto Web Server...');
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🛡️ Security: API Key Required = false`);
    console.log(`🌐 CORS: Enabled`);
    console.log(`🤖 Supported Agents: ${SUPPORTED_AGENT_TYPES.join(', ')}`);
    console.log('🤖 Initializing agents...');
    
    // Agent router is ready (no initialization needed)
    console.log('✅ Agent router ready');

    // Start Express Server
    const server = app.listen(PORT, () => {
      console.log('✅ Server started successfully!');
      console.log(`📱 Frontend: http://localhost:${PORT}`);
      console.log(`🔌 API: http://localhost:${PORT}/api/chat`);
      console.log(`💚 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log('');
      console.log('🎯 Ready to serve customers!');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();