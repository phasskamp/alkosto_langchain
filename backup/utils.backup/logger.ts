import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📁 Log-Ordner erstellen
const logDir = path.join(__dirname, '../../logs');

// 🎨 Custom Format für bessere Lesbarkeit
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? 
      `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
  })
);

// 🏗️ Logger-Konfiguration
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: customFormat,
  defaultMeta: { 
    service: 'alkosto-chatbot',
    version: '1.0.0'
  },
  transports: [
    // 📄 Error-Logs in separate Datei
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // 📄 Alle Logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
    
    // 🖥️ Console für Development
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// 🔧 Spezielle Logging-Funktionen für verschiedene Bereiche

export const agentLogger = {
  started: (config: any) => {
    logger.info('🤖 Agent started', {
      model: config.model,
      temperature: config.temperature,
      maxIterations: config.maxIterations
    });
  },
  
  query: (input: string, userId?: string) => {
    logger.info('💬 User query received', {
      query: input,
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString()
    });
  },
  
  response: (input: string, output: string, duration: number, metadata?: any) => {
    logger.info('✅ Agent response generated', {
      input_length: input.length,
      output_length: output.length,
      response_time_ms: duration,
      ...metadata
    });
  },
  
  error: (error: Error, context?: any) => {
    logger.error('❌ Agent error occurred', {
      error: error.message,
      stack: error.stack,
      context
    });
  },
  
  toolCall: (toolName: string, input: any, output: any, duration: number) => {
    logger.debug('🔧 Tool called', {
      tool: toolName,
      input_preview: JSON.stringify(input).substring(0, 100),
      output_preview: JSON.stringify(output).substring(0, 200),
      execution_time_ms: duration
    });
  }
};

export const performanceLogger = {
  searchPerformance: (query: string, resultsCount: number, searchTime: number, cacheHit: boolean) => {
    logger.info('🔍 Search performance', {
      query,
      results_found: resultsCount,
      search_time_ms: searchTime,
      cache_hit: cacheHit,
      performance_tier: searchTime < 20 ? 'excellent' : searchTime < 50 ? 'good' : 'needs_optimization'
    });
  },
  
  memoryUsage: () => {
    const usage = process.memoryUsage();
    logger.debug('💾 Memory usage', {
      rss_mb: Math.round(usage.rss / 1024 / 1024),
      heap_used_mb: Math.round(usage.heapUsed / 1024 / 1024),
      external_mb: Math.round(usage.external / 1024 / 1024)
    });
  },
  
  cacheStats: (stats: any) => {
    logger.info('📦 Cache statistics', stats);
  }
};

export const businessLogger = {
  productInterest: (products: any[], query: string) => {
    logger.info('🛒 Product interest tracked', {
      query,
      products_shown: products.length,
      price_range: products.length > 0 ? {
        min: Math.min(...products.map(p => p.price)),
        max: Math.max(...products.map(p => p.price)),
        avg: Math.round(products.reduce((sum, p) => sum + p.price, 0) / products.length)
      } : null,
      categories: [...new Set(products.map(p => p.category))]
    });
  },
  
  conversionEvent: (eventType: 'product_view' | 'comparison' | 'purchase_intent', data: any) => {
    logger.info(`💰 Conversion event: ${eventType}`, {
      event: eventType,
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

// 🚨 Uncaught Exception Handler
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection', {
    reason,
    promise
  });
});

// 📊 Startup Log
logger.info('🚀 Winston Logger initialized', {
  environment: process.env.NODE_ENV || 'development',
  log_level: logger.level,
  log_directory: logDir
});

export default logger;