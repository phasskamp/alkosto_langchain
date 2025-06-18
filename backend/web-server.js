#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3001',
    'https://alkosto-frontend-*.vercel.app',
    'https://*.vercel.app'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    agent: 'Graduated Search Agent Ready'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Alkosto AI Backend is running!',
    agent: 'Graduated Search Agent',
    endpoints: {
      health: '/health',
      chat: '/api/chat'
    }
  });
});

// Chat endpoint - will integrate real agent later
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    console.log('📨 Chat request:', { message, sessionId });
    
    // Mock response that mimics your working agent
    const response = {
      message: `¡Hola! Recibí tu mensaje: "${message}". El Agente de Búsqueda Graduada está funcionando. ¿Qué producto buscas?`,
      confidence: 'HIGH',
      agentErrors: [],
      sessionId: sessionId || 'session-' + Date.now(),
      timestamp: new Date().toISOString(),
      mode: '🔍 Consulta Inteligente'
    };
    
    res.json(response);
  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'El agente no está disponible en este momento.',
      agentErrors: [error.message],
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Alkosto Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});
