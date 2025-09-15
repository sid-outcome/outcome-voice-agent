# Voice Agent Architecture

## System Overview

The Voice Agent is a modular Node.js application that processes SMS and voice communications through intelligent AI agents. It was refactored from a monolithic 8,322-line file into 32 clean modules with zero functionality loss.

## Core Architecture

### Module Organization (32 files)

```
src/
├── config/                 # Configuration management
│   └── index.js           # Environment variables and validation
│
├── utils/                  # Utility functions
│   ├── address-parser.js  # Address parsing and normalization
│   ├── sms.js             # SMS formatting and chunking
│   ├── timeout.js         # Promise timeout wrapper
│   └── pii-masking.js     # PII data masking for logs
│
├── api-clients/           # External API integrations
│   ├── outcome-client.js  # Outcome Workspace API
│   ├── attom-client.js    # ATTOM property data
│   ├── rentcast-client.js # RentCast rental estimates
│   └── tavily-client.js   # Tavily web search
│
├── memory/                # Memory and caching
│   ├── cache.js           # node-cache initialization
│   ├── conversation-memory.js  # Conversation storage
│   └── factory.js         # Memory dependency injection
│
├── ai/                    # AI enhancement layer
│   ├── semantic-search.js       # Embedding-based search
│   ├── query-optimizer.js       # LLM query optimization
│   └── smart-property-search.js # Multi-API routing
│
├── agents/                # Sub-agent system
│   ├── base-agent.js      # Base agent class
│   ├── router-agent.js    # Message routing (gpt-5-nano)
│   ├── business-agent.js  # Business intelligence (gpt-5)
│   ├── real-estate-agent.js # Property analysis (gpt-5)
│   ├── general-agent.js   # General queries (gpt-5-mini)
│   └── factory.js         # Agent creation and management
│
├── tools/                 # Tool definitions
│   ├── sms/               # SMS-optimized tools (15 tools)
│   │   ├── outcome-tools.js    # Outcome workspace tools
│   │   ├── attom-tools.js      # ATTOM property tools
│   │   ├── rentcast-tools.js   # RentCast rental tools
│   │   ├── web-tools.js        # Web search tools
│   │   └── executor.js         # Tool execution engine
│   ├── voice/             # Voice tools (future)
│   └── registry.js        # Tool registration
│
├── sms/                   # SMS processing
│   └── processor.js       # Message processing pipeline
│
├── routes/                # HTTP/WebSocket routes
│   ├── health.js          # Health check endpoints
│   ├── sms.js             # SMS webhook handlers
│   └── voice.js           # Voice WebSocket handlers
│
├── state/                 # Global state management
│   └── global-state.js    # Centralized state manager
│
└── server.js              # Main application entry
```

## Key Components

### 1. Global State Manager

Centralizes all dependencies and initialization:

```javascript
class GlobalStateManager {
  // Phase 1: Initialize core clients (OpenAI, Twilio)
  // Phase 2: Initialize memory system (node-cache)
  // Phase 3: Initialize AI enhancement (semantic search, query optimizer)
  // Phase 4: Initialize tool system (15 SMS tools)
  // Phase 5: Initialize agent system (4 specialized agents)
  // Phase 6: Initialize processing & routes
}
```

### 2. Memory System

In-memory conversation storage using node-cache:

- **TTL**: 2 hours per conversation
- **Cleanup**: Every 18 hours
- **Capacity**: 50 messages per conversation
- **Features**: User context, conversation history, semantic search

### 3. Agent Architecture

#### Router Agent (gpt-5-nano)

- **Purpose**: Ultra-fast message routing
- **Reasoning**: Minimal (few reasoning tokens)
- **Response Time**: <500ms
- **Routes to**: BUSINESS_AGENT | REAL_ESTATE_AGENT | GENERAL_AGENT

#### Business Agent (gpt-5)

- **Purpose**: Outcome workspace integration
- **Tools**: 4 (user lookup, outcomes, data tables, workflows)
- **Reasoning**: Medium depth
- **Handles**: "my data", "my properties", workspace queries

#### Real Estate Agent (gpt-5)

- **Purpose**: Property analysis and market data
- **Tools**: 9 (ATTOM, RentCast, smart search)
- **Reasoning**: Medium depth
- **Handles**: Property searches, valuations, market trends

#### General Agent (gpt-5-mini)

- **Purpose**: Web search and general queries
- **Tools**: 1 (web search)
- **Reasoning**: Low depth
- **Handles**: General questions, web research

### 4. Tool System

15 SMS-optimized tools organized by category:

**Outcome Workspace Tools (4)**

- getCurrentUserTool - Current user info
- lookupUserTool - Phone → user mapping
- getUserOutcomesTool - Projects and outcomes
- smartDataQueryTool - Intelligent data queries

**Property Analysis Tools (9)**

- smartPropertySearchTool - Primary entry point
- ATTOM suite (7 tools) - Property details, valuations, trends
- RentCast suite (2 tools) - Rental estimates

**Research Tools (1)**

- webSearchTool - Tavily-powered web search

### 5. Processing Pipeline

```
SMS Received → Store Message → User Lookup → Route Message → Execute Agent → Call Tools → Generate Response → Send SMS
```

Each step includes:

- Error handling with graceful fallbacks
- User-friendly error messages
- Comprehensive logging
- Performance monitoring

## API Integration

### External APIs Called

1. **OpenAI API** (Required)

   - GPT-5 models via Responses API
   - Embeddings for semantic search
   - ~2-5 API calls per message

2. **Outcome Workspace API** (Required for business data)

   - User lookup by phone
   - Outcomes and projects
   - Data tables and workflows
   - Chat history

3. **ATTOM Property API** (Optional)

   - Property details and assessments
   - Automated valuations (AVM)
   - Sales history
   - Market trends

4. **RentCast API** (Optional)

   - Residential rental estimates
   - Property details
   - Comparable rentals

5. **Tavily Search API** (Optional)
   - Web search for current information
   - Market trends and news
   - General research

## Performance Characteristics

- **Startup Time**: <3 seconds
- **SMS Response**: 2-5 seconds average
- **Voice Latency**: <200ms with Realtime API
- **Memory Usage**: ~100MB baseline
- **Concurrent Users**: 100+ with current architecture
- **API Calls**: 2-10 per message depending on tools

## Security & Isolation

- **Multi-tenant**: Organization-level data isolation
- **Phone Verification**: Twilio-validated numbers only
- **API Key Protection**: Environment-based, masked in logs
- **Memory Isolation**: Per-phone conversation storage
- **Error Handling**: No sensitive data in error messages

## Deployment Architecture

### Development

```bash
node src/server.js
# or with auto-restart
npm run start:monitor
```

### Production

```bash
# PM2 (recommended)
pm2 start src/server.js --name voice-agent

# Docker
docker build -t voice-agent .
docker run -p 5000:5000 --env-file .env voice-agent

# Kubernetes
kubectl apply -f k8s/deployment.yaml
```

### Scaling Strategy

1. **Horizontal Scaling**: Multiple instances behind load balancer
2. **Memory Sharing**: Redis for distributed conversation storage
3. **API Rate Limiting**: Built-in throttling and retry logic
4. **Geographic Distribution**: Multi-region deployment ready

## Monitoring & Observability

### Health Checks

- `/health` - Basic health status
- `/health/detailed` - Component-level status

### Logging

- Structured JSON logging
- Component-level log isolation
- Performance metrics included
- Error tracking with context

### Metrics Tracked

- Response times
- API call counts
- Error rates
- Memory usage
- Active conversations

## Design Principles

1. **Dependency Injection**: All modules use DI, no global state
2. **Single Responsibility**: Each module has one clear purpose
3. **Error Isolation**: Component failures don't cascade
4. **Graceful Degradation**: Fallbacks for all external dependencies
5. **User-First**: Always return helpful responses, even on errors

## Future Enhancements

- Redis support for distributed memory
- WebSocket support for real-time updates
- Additional agent types (Marketing, Support, Analytics)
- Voice tool implementations
- GraphQL API layer
- Event-driven architecture with message queues
