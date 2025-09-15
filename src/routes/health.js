/**
 * Health and Management Routes
 */

class HealthRoutes {
  constructor(memoryFactory, toolRegistry, agentFactory) {
    this.memoryFactory = memoryFactory;
    this.toolRegistry = toolRegistry;
    this.agentFactory = agentFactory;
  }

  // Register health routes with Fastify
  async register(fastify) {
    // Basic health endpoint
    fastify.get('/health', async (request, reply) => {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'voice-agent',
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };

      return reply.status(200).send(health);
    });

    // Detailed health check with all components
    fastify.get('/health/detailed', async (request, reply) => {
      try {
        const memoryHealth = this.memoryFactory.healthCheck();
        const toolHealth = this.toolRegistry.healthCheck();
        const agentHealth = this.agentFactory.healthCheck();

        const detailedHealth = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'voice-agent',
          version: '1.0.0',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          components: {
            memorySystem: {
              status: memoryHealth.cache ? 'healthy' : 'unhealthy',
              details: memoryHealth,
            },
            toolRegistry: {
              status: toolHealth.initialized ? 'healthy' : 'unhealthy',
              details: {
                ...toolHealth,
                smsTools: toolHealth.smsToolCount || 0,
                voiceTools: toolHealth.voiceToolCount || 0,
              },
            },
            agentSystem: {
              status: Object.keys(agentHealth).length > 0 ? 'healthy' : 'unhealthy',
              details: agentHealth,
            },
          },
        };

        return reply.status(200).send(detailedHealth);
      } catch (error) {
        console.error('❌ Detailed health check error:', error);
        return reply.status(500).send({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Ready check (Kubernetes style)
    fastify.get('/ready', async (request, reply) => {
      const isReady = this.toolRegistry.initialized && this.memoryFactory.getCache();

      if (isReady) {
        return reply.status(200).send({ status: 'ready' });
      } else {
        return reply.status(503).send({ status: 'not ready' });
      }
    });

    // Liveness check (Kubernetes style)
    fastify.get('/live', async (request, reply) => {
      return reply.status(200).send({ status: 'alive' });
    });
  }
}

export { HealthRoutes };