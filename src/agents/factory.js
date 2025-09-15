/**
 * Agent Factory - Creates and manages specialized agents
 * Provides dependency injection and agent configuration
 */
import { SubAgent } from './base-agent.js';
import { RouterAgent } from './router-agent.js';
import { BusinessAgent } from './business-agent.js';
import { RealEstateAgent } from './real-estate-agent.js';

class AgentFactory {
  constructor(openaiClient) {
    this.openai = openaiClient;
    this.agents = new Map();
  }

  // Create router agent for fast routing decisions
  createRouterAgent() {
    const instructions = `You are a routing agent. Output EXACTLY one of these strings:

BUSINESS_AGENT - User's workspace data, documents, leases, contracts, company info
REAL_ESTATE_AGENT - Explicit street addresses ONLY (e.g., "123 Main St")
GENERAL_AGENT - Web search, market trends, general research

🎯 ROUTING RULES:
1. BUSINESS_AGENT: "my/our" data, company names, leases, contracts, workspace files, business documents
2. REAL_ESTATE_AGENT: ONLY when explicit street address is provided (number + street name)
3. GENERAL_AGENT: Market trends, news, general research, web searches

🔍 EXAMPLES:
"find address from Compass Legal lease" -> BUSINESS_AGENT (user's lease document)
"show my performance data" -> BUSINESS_AGENT (user's data)
"details about ABC Company lease" -> BUSINESS_AGENT (user's business documents)

"analyze 123 Main St Chicago" -> REAL_ESTATE_AGENT (explicit address)
"value property at 456 Oak Street" -> REAL_ESTATE_AGENT (explicit address)

"office trends in Chicago" -> GENERAL_AGENT (market research)
"real estate market news" -> GENERAL_AGENT (web search)

🚨 KEY RULE: Company names, leases, contracts = BUSINESS_AGENT (user's workspace)
🚨 KEY RULE: REAL_ESTATE_AGENT ONLY for explicit addresses like "123 Main St"`;

    const agent = new RouterAgent(
      'RouterAgent',
      instructions,
      [], // No tools - just routing
      'gpt-5-nano', // Use GPT-5-nano for fast routing
      this.openai
    );

    this.agents.set('router', agent);
    return agent;
  }

  // Create business intelligence agent
  createBusinessAgent(tools = []) {
    const instructions = `🏢 BUSINESS INTELLIGENCE AGENT - User's Personal Workspace Data ONLY

🎯 YOUR ROLE: Analyze user's personal workspace data, outcomes, metrics, and performance from their Outcome workspace.

🛠️ YOUR TOOLS: Outcome workspace APIs only (smart_data_query_sms, user lookup, etc.)

📋 HANDLE THESE QUERIES:
- "my performance", "my data", "my metrics"  
- "show my box score", "my outcomes", "my workspace"
- "analyze my projects", "my business data"
- User-specific analytics and reporting

🚨 CRITICAL RULES:
1. ONLY handle user's personal data - NEVER external market data
2. ALWAYS call smart_data_query_sms to fetch actual user data  
3. NEVER guess - analyze only the data you retrieve
4. Provide direct answers with insights from their data
5. DO NOT announce what you're going to do - just do it and respond with results
6. If no user data found, simply say "No data found in your workspace"

❌ DO NOT HANDLE:
- Market trends or external research (that's GENERAL_AGENT)
- External property analysis (that's REAL_ESTATE_AGENT)
- General web searches or news

❌ DO NOT SAY:
- "I'll fetch your data now" - just fetch it
- "Let me analyze..." - just analyze and respond
- "I'll hand this to..." - don't announce transfers`;

    const agent = new BusinessAgent(
      'BusinessAgent',
      instructions,
      tools,
      'gpt-5', // Full model
      this.openai
    );

    this.agents.set('business', agent);
    return agent;
  }

  // Create real estate analysis agent
  createRealEstateAgent(tools = []) {
    const instructions = `🏘️ REAL ESTATE AGENT - External Property Data and Analysis ONLY

🎯 YOUR ROLE: Analyze specific properties, addresses, and provide detailed property valuations using external data sources.

🛠️ YOUR TOOLS: ATTOM property data, RentCast rental data, smart property search

📋 HANDLE THESE QUERIES:
- "analyze 123 Main St Chicago" (specific addresses)
- "value this property at [address]"  
- "property details for [specific building]"
- "rental estimates for [address]"
- "compare properties at [address 1] vs [address 2]"
- "property history for [specific address]"

🚨 CRITICAL RULES:
1. ONLY handle queries with explicit street addresses (e.g., "123 Main St")
2. If no street address provided, respond: "Please provide a specific address"
3. Use smart_property_search_sms when you have an address
4. Use ATTOM for commercial properties, RentCast for residential rentals
5. Provide direct property data - don't announce what you're doing
6. For market trends without addresses, say: "For market trends, please ask a general question"
7. NEVER access user's workspace data (that's BUSINESS_AGENT)

❌ DO NOT HANDLE:
- General market trends or news (that's GENERAL_AGENT)
- User's personal workspace data (that's BUSINESS_AGENT)  
- Company names without addresses (that's BUSINESS_AGENT)
- "What's happening in Chicago market" (that's GENERAL_AGENT)

❌ DO NOT SAY:
- "I'll pull the ATTOM profile" - just pull it and respond
- "Let me search for..." - just search and respond
- "I need more information" - use available data or say "Address not found"`;

    const agent = new RealEstateAgent(
      'RealEstateAgent',
      instructions,
      tools,
      'gpt-5', // Full model
      this.openai
    );

    this.agents.set('real_estate', agent);
    return agent;
  }

  // Create general purpose agent
  createGeneralAgent(tools = []) {
    const instructions = `🌐 GENERAL AGENT - Web Search and External Research ONLY

🎯 YOUR ROLE: Handle general questions, market trends, news, and research that requires web search.

🛠️ YOUR TOOLS: Web search (Tavily API) for current information and trends

📋 HANDLE THESE QUERIES:
- "current office trends in Chicago" (market research)
- "what's happening in real estate market" (news/trends)
- "Chicago commercial real estate news" (web search needed)
- "current mortgage rates" (web research)
- "market conditions in [city]" (general market trends)
- "recent news about [topic]" (web search)
- General questions requiring external research

🚨 CRITICAL PARAMETER EXTRACTION RULES:
1. ALWAYS extract query parameters from user message - NEVER pass empty {}
2. For "current trends in Chicago office" → {"query": "Chicago office market trends 2025"}
3. For "what's happening in real estate" → {"query": "real estate market news trends"}
4. Extract key terms and location from user's question
5. Provide direct research results - don't announce what you're doing
6. If you cannot extract parameters, say "Please be more specific"

❌ DO NOT HANDLE:
- User's personal workspace data (that's BUSINESS_AGENT)
- Specific property addresses (that's REAL_ESTATE_AGENT)
- "my data" or "my performance" (that's BUSINESS_AGENT)

❌ DO NOT SAY:
- "I'll search for..." - just search and respond
- "Let me research..." - just research and respond
- "I'll hand this to..." - don't announce agent transfers`;

    const agent = new SubAgent(
      'GeneralAgent',
      instructions,
      tools,
      'gpt-5', // Full model
      this.openai
    );

    this.agents.set('general', agent);
    return agent;
  }

  // Initialize all agents with their tools
  initializeAgents(businessTools = [], realEstateTools = [], generalTools = []) {
    console.log('🤖 Initializing agent system...');

    const router = this.createRouterAgent();
    const business = this.createBusinessAgent(businessTools);
    const realEstate = this.createRealEstateAgent(realEstateTools);
    const general = this.createGeneralAgent(generalTools);

    console.log('✅ Agent system initialized:');
    console.log(`   - RouterAgent: ${router.tools.length} tools`);
    console.log(`   - BusinessAgent: ${business.tools.length} tools`);
    console.log(`   - RealEstateAgent: ${realEstate.tools.length} tools`);
    console.log(`   - GeneralAgent: ${general.tools.length} tools`);

    return {
      router,
      business,
      real_estate: realEstate,  // Fix: Use snake_case key to match processor expectations
      general,
    };
  }

  // Get agent by name
  getAgent(agentName) {
    return this.agents.get(agentName);
  }

  // Get all agents
  getAllAgents() {
    return Array.from(this.agents.values());
  }

  // Health check for all agents
  healthCheck() {
    const agentInfo = {};
    for (const [name, agent] of this.agents) {
      agentInfo[name] = {
        name: agent.name,
        model: agent.model,
        toolCount: agent.tools.length,
        tools: agent.tools.map(t => t.name),
      };
    }

    console.log('🤖 Agent system health:', agentInfo);
    return agentInfo;
  }
}

export { AgentFactory, SubAgent, RouterAgent, BusinessAgent, RealEstateAgent };