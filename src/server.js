/**
 * Modular Voice Agent Server
 * Replaces the monolithic server.js with a clean, modular architecture
 */
import Fastify from 'fastify';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';

// Import configuration and global state
import { config, displayConfig, validateConfig } from './config/index.js';
import { default as globalState } from './state/global-state.js';

// Initialize Fastify with better configuration for deployment
const fastify = Fastify({
  logger: config.NODE_ENV === 'production' ? true : false,
  trustProxy: true,
});

// Register Fastify plugins
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);

// Application class for better organization
class VoiceAgentServer {
  constructor() {
    this.fastify = fastify;
    this.globalState = globalState;
    this.config = config;
    this.isShuttingDown = false;
  }

  // Initialize the entire application
  async initialize() {
    console.log('🚀 Voice & SMS Agent with Outcome Integration');
    console.log(`Port: ${this.config.PORT}`);

    // Validate configuration before proceeding
    try {
      validateConfig();
    } catch (error) {
      console.error('Configuration validation failed:', error.message);
      process.exit(1);
    }

    // Display configuration
    displayConfig();

    // Initialize global state with all dependencies
    await this.globalState.initialize(this.config);

    // Register all routes
    await this.globalState.registerRoutes(this.fastify);

    // Setup error handlers
    this.setupErrorHandlers();

    // Setup graceful shutdown
    this.setupGracefulShutdown();

    console.log('✅ Application initialized successfully');
  }

  // Setup error handlers
  setupErrorHandlers() {
    // Global error handler
    this.fastify.setErrorHandler((error, request, reply) => {
      console.error('❌ Global error handler:', error);

      // Determine appropriate status code based on error type
      let statusCode = error.statusCode || error.status || 500;

      // Common error mappings
      if (error.validation) {
        statusCode = 400; // Bad Request for validation errors
      } else if (error.name === 'UnauthorizedError') {
        statusCode = 401; // Unauthorized
      } else if (error.name === 'ForbiddenError') {
        statusCode = 403; // Forbidden
      } else if (error.name === 'NotFoundError') {
        statusCode = 404; // Not Found
      } else if (error.name === 'ConflictError') {
        statusCode = 409; // Conflict
      } else if (error.name === 'ValidationError') {
        statusCode = 422; // Unprocessable Entity
      } else if (error.name === 'RateLimitError') {
        statusCode = 429; // Too Many Requests
      }

      // Set the status code
      reply.code(statusCode);

      // Send appropriate error response
      if (statusCode >= 500) {
        // Don't expose internal errors to clients
        reply.send({
          error: 'Internal Server Error',
          message: 'Something went wrong on our end.',
          statusCode
        });
      } else {
        // Client errors can include more details
        reply.send({
          error: error.message || 'Bad Request',
          statusCode,
          ...(error.validation && { validation: error.validation })
        });
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      this.gracefulShutdown();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown();
    });
  }

  // Setup graceful shutdown handlers
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGQUIT'];

    signals.forEach(signal => {
      process.on(signal, () => {
        console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
        this.gracefulShutdown();
      });
    });
  }

  // Graceful shutdown process
  async gracefulShutdown() {
    if (this.isShuttingDown) {
      console.log('⚠️ Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;

    try {
      console.log('🛑 Closing server...');
      await this.fastify.close();

      console.log('🛑 Shutting down global state...');
      await this.globalState.shutdown();

      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  // Start the server
  async start() {
    try {
      await this.fastify.listen({
        port: this.config.PORT,
        host: '0.0.0.0'
      });

      console.log(`\n🎙️ Voice Agent Server Details:`);
      console.log(`   SMS: GPT-5 + Sub-agents + Memory`);
      console.log(`   Voice: Realtime API + WebSocket`);

      // Display system status
      this.displaySystemStatus();

      console.log(`\n✅ Server is ready to accept connections`);
      console.log(`   SMS Webhook: http://localhost:${this.config.PORT}/sms`);
      console.log(`   Voice Webhook: http://localhost:${this.config.PORT}/incoming-call`);
      console.log(`   Health Check: http://localhost:${this.config.PORT}/health`);

    } catch (error) {
      console.error('❌ Error starting server:', error);
      process.exit(1);
    }
  }

  // Display system status
  displaySystemStatus() {
    const health = this.globalState.healthCheck();

    console.log(`\n📊 System Status:`);
    console.log(`   Configuration: ${health.components.config ? '✅' : '❌'}`);
    console.log(`   OpenAI Client: ${health.components.openaiClient ? '✅' : '❌'}`);
    console.log(`   Twilio Client: ${health.components.twilioClient ? '✅' : '❌'}`);
    console.log(`   Memory System: ${health.components.memorySystem ? '✅' : '❌'}`);
    console.log(`   AI Enhancement: ${health.components.aiEnhancement ? '✅' : '❌'}`);
    console.log(`   Tool System: ${health.components.toolSystem ? '✅' : '❌'}`);
    console.log(`   Agent System: ${health.components.agentSystem ? '✅' : '❌'}`);
    console.log(`   Routes: ${health.components.processingRoutes ? '✅' : '❌'}`);

    // Display API availability
    console.log(`\n🔗 APIs Configured:`);
    console.log(`   ✅ Outcome: ${this.config.OUTCOME_API_URL}`);
    console.log(`   ${this.config.ATTOM_API_KEY ? '✅' : '❌'} ATTOM: Commercial & Residential Properties`);
    console.log(`   ${this.config.RENTCAST_API_KEY ? '✅' : '❌'} RentCast: Residential Rentals`);
    console.log(`   ${this.config.TAVILY_API_KEY ? '✅' : '❌'} Tavily: Web Search`);
  }

  // Health check endpoint for the application
  async healthCheck() {
    return this.globalState.healthCheck();
  }
}

// Main application entry point
async function main() {
  const app = new VoiceAgentServer();

  try {
    await app.initialize();
    await app.start();
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Application startup error:', error);
    process.exit(1);
  });
}

export { VoiceAgentServer, main };
export default VoiceAgentServer;