/**
 * Global State Manager
 * Centralizes all global state and dependency management
 */
import OpenAI from 'openai';
import pkg from 'twilio';
const { Twilio } = pkg;

class GlobalStateManager {
  constructor() {
    this.config = null;
    this.openaiClient = null;
    this.twilioClient = null;

    // API Clients
    this.outcomeClient = null;
    this.attomClient = null;
    this.rentcastClient = null;
    this.tavilyClient = null;

    // Memory System
    this.memoryFactory = null;
    this.conversationMemory = null;

    // AI Enhancement
    this.semanticSearch = null;
    this.queryOptimizer = null;
    this.smartPropertySearch = null;

    // Agent System
    this.agentFactory = null;
    this.agents = null;

    // Tool System
    this.toolRegistry = null;
    this.toolExecutor = null;

    // Processing & Routes
    this.smsProcessor = null;
    this.smsRoutes = null;
    this.voiceRoutes = null;
    this.healthRoutes = null;

    // State
    this.currentUserSession = {
      phoneNumber: null,
      userId: null,
      organizationId: null,
      identified: false,
    };

    this.initialized = false;
  }

  // Initialize all components with proper dependency injection
  async initialize(config) {
    console.log('🚀 Initializing global state manager...');

    this.config = config;

    // Phase 1: Initialize core clients
    await this.initializeClients();

    // Phase 2: Initialize memory system
    await this.initializeMemorySystem();

    // Phase 3: Initialize AI enhancement layer
    await this.initializeAIEnhancement();

    // Phase 4: Initialize tool system
    await this.initializeToolSystem();

    // Phase 5: Initialize agent system
    await this.initializeAgentSystem();

    // Phase 6: Initialize processing & routes
    await this.initializeProcessingAndRoutes();

    this.initialized = true;
    console.log('✅ Global state manager initialized successfully');

    return this;
  }

  async initializeClients() {
    console.log('🔧 Initializing API clients...');

    // OpenAI client
    this.openaiClient = new OpenAI({
      apiKey: this.config.OPENAI_API_KEY,
    });

    // Twilio client (if SMS enabled)
    if (this.config.TWILIO_ACCOUNT_SID && this.config.TWILIO_AUTH_TOKEN) {
      this.twilioClient = new Twilio(
        this.config.TWILIO_ACCOUNT_SID,
        this.config.TWILIO_AUTH_TOKEN
      );
    }

    // Import and initialize API clients
    const { OutcomeAPIClient } = await import('../api-clients/outcome-client.js');
    const { AttomAPIClient } = await import('../api-clients/attom-client.js');
    const { RentCastAPIClient } = await import('../api-clients/rentcast-client.js');
    const { TavilyAPIClient } = await import('../api-clients/tavily-client.js');

    this.outcomeClient = new OutcomeAPIClient(
      this.config.OUTCOME_API_KEY,
      this.config.OUTCOME_API_URL
    );

    this.attomClient = new AttomAPIClient(
      this.config.ATTOM_API_KEY,
      this.config.ATTOM_BASE_URL
    );

    this.rentcastClient = new RentCastAPIClient(this.config.RENTCAST_API_KEY);
    this.tavilyClient = new TavilyAPIClient(this.config.TAVILY_API_KEY);

    console.log('✅ API clients initialized');
  }

  async initializeMemorySystem() {
    console.log('🧠 Initializing memory system...');

    const { default: memoryFactory } = await import('../memory/factory.js');
    this.memoryFactory = memoryFactory;

    const memorySystem = this.memoryFactory.initialize();
    this.conversationMemory = memorySystem.conversationMemory;

    console.log('✅ Memory system initialized');
  }

  async initializeAIEnhancement() {
    console.log('🤖 Initializing AI enhancement layer...');

    const { SemanticSearch } = await import('../ai/semantic-search.js');
    const { QueryOptimizer } = await import('../ai/query-optimizer.js');
    const { SmartPropertySearch } = await import('../ai/smart-property-search.js');

    this.semanticSearch = new SemanticSearch(this.openaiClient);
    this.queryOptimizer = new QueryOptimizer(this.openaiClient);
    this.smartPropertySearch = new SmartPropertySearch(
      this.attomClient,
      this.rentcastClient,
      this.tavilyClient,
      this.openaiClient
    );

    console.log('✅ AI enhancement layer initialized');
  }

  async initializeToolSystem() {
    console.log('🛠️ Initializing tool system...');

    const { default: toolRegistry } = await import('../tools/registry.js');
    const { SMSToolExecutor } = await import('../tools/sms/executor.js');

    this.toolRegistry = toolRegistry;
    this.toolRegistry.initialize();

    this.toolExecutor = new SMSToolExecutor(
      this.outcomeClient,
      this.attomClient,
      this.rentcastClient,
      this.tavilyClient,
      this.queryOptimizer,
      this.smartPropertySearch,
      this.semanticSearch,
      this.conversationMemory
    );

    console.log('✅ Tool system initialized');
  }

  async initializeAgentSystem() {
    console.log('🤖 Initializing agent system...');

    const { AgentFactory } = await import('../agents/factory.js');
    this.agentFactory = new AgentFactory(this.openaiClient);

    // Get tools for each agent type
    const businessTools = this.toolRegistry.getBusinessTools();
    const realEstateTools = this.toolRegistry.getRealEstateTools();
    const generalTools = this.toolRegistry.getGeneralTools();

    this.agents = this.agentFactory.initializeAgents(
      businessTools,
      realEstateTools,
      generalTools
    );

    console.log('✅ Agent system initialized');
  }

  async initializeProcessingAndRoutes() {
    console.log('🚦 Initializing processing & routes...');

    const { SMSProcessor } = await import('../sms/processor.js');
    const { SMSRoutes } = await import('../routes/sms.js');
    const { VoiceRoutes } = await import('../routes/voice.js');
    const { HealthRoutes } = await import('../routes/health.js');
    const { sendSMS } = await import('../utils/sms.js');

    // Create SMS utility wrapper
    const smsUtility = { sendSMS };

    this.smsProcessor = new SMSProcessor(
      this.conversationMemory,
      this.outcomeClient,
      this.agentFactory,
      this.toolExecutor,
      smsUtility
    );

    // Set agents on processor
    this.smsProcessor.setAgents(this.agents);

    this.smsRoutes = new SMSRoutes(
      this.conversationMemory,
      this.smsProcessor,
      this.config,
      this.twilioClient
    );

    this.voiceRoutes = new VoiceRoutes(this.config);

    this.healthRoutes = new HealthRoutes(
      this.memoryFactory,
      this.toolRegistry,
      this.agentFactory
    );

    console.log('✅ Processing & routes initialized');
  }

  // Get current user session
  getCurrentUserSession() {
    return this.currentUserSession;
  }

  // Update current user session
  updateCurrentUserSession(session) {
    this.currentUserSession = { ...this.currentUserSession, ...session };
  }

  // Get any component by name
  getComponent(name) {
    return this[name] || null;
  }

  // Register routes with Fastify server
  async registerRoutes(fastify) {
    if (!this.initialized) {
      throw new Error('Global state manager not initialized');
    }

    console.log('🚦 Registering routes...');

    await this.smsRoutes.register(fastify);
    await this.voiceRoutes.register(fastify);
    await this.healthRoutes.register(fastify);

    console.log('✅ Routes registered');
  }

  // Health check for entire system
  healthCheck() {
    const health = {
      initialized: this.initialized,
      timestamp: new Date().toISOString(),
      components: {
        config: !!this.config,
        openaiClient: !!this.openaiClient,
        twilioClient: !!this.twilioClient,
        outcomeClient: !!this.outcomeClient,
        attomClient: !!this.attomClient,
        rentcastClient: !!this.rentcastClient,
        tavilyClient: !!this.tavilyClient,
        memorySystem: !!this.conversationMemory,
        aiEnhancement: !!this.semanticSearch && !!this.queryOptimizer && !!this.smartPropertySearch,
        toolSystem: !!this.toolRegistry && !!this.toolExecutor,
        agentSystem: !!this.agentFactory && !!this.agents,
        processingRoutes: !!this.smsProcessor && !!this.smsRoutes && !!this.voiceRoutes && !!this.healthRoutes,
      },
      currentUserSession: this.currentUserSession,
    };

    console.log('🩺 Global state health check:', health);
    return health;
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🛑 Shutting down global state manager...');

    // Clear caches
    if (this.conversationMemory?.cache) {
      this.conversationMemory.cache.flushAll();
    }

    // Clear semantic search cache
    if (this.semanticSearch) {
      this.semanticSearch.clearCache();
    }

    console.log('✅ Global state manager shutdown complete');
  }
}

// Export singleton instance
const globalState = new GlobalStateManager();

export { globalState, GlobalStateManager };
export default globalState;