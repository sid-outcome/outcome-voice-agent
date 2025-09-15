# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The voice-agent app is a **dual-mode AI assistant** that combines commercial real estate expertise with personalized business intelligence from the user's Outcome workspace. It supports both **real-time voice conversations** and **asynchronous SMS text messaging** with persistent memory. Built using **modern Node.js modular architecture** with clean separation of concerns and dependency injection patterns.

### Core Technologies

- **Fastify v5** - High-performance web framework with WebSocket support
- **OpenAI Realtime API** for voice conversations (GPT-realtime model)
- **OpenAI GPT-5 Responses API** for text conversations with sub-agent orchestration
- **node-cache** for in-memory conversation storage (TTL: 2hrs, cleanup: 18hrs)
- **Twilio** for phone calls and SMS handling
- **ATTOM Data API** for comprehensive commercial & residential property data
- **RentCast API** for residential property rentals
- **Tavily API** for web search
- **Outcome Workspace API** for user's business data and context

## Architecture

### Modular Structure (Current Architecture)

The application is organized into **32 modular files** with clean separation of concerns and dependency injection:

```
src/
├── config/           # Configuration management
│   └── index.js      # Environment variables and validation
├── utils/            # Utility functions
│   ├── address-parser.js    # Address parsing utilities
│   ├── sms.js              # SMS utility functions
│   ├── timeout.js          # Timeout wrapper
│   └── pii-masking.js      # PII masking for security
├── api-clients/      # External API integrations
│   ├── outcome-client.js   # Outcome Workspace API
│   ├── attom-client.js     # ATTOM property data
│   ├── rentcast-client.js  # RentCast rental data
│   └── tavily-client.js    # Tavily web search
├── memory/           # Memory and caching system
│   ├── cache.js                    # Cache initialization
│   ├── conversation-memory.js      # Conversation storage
│   └── factory.js                  # Memory dependency injection
├── ai/              # AI enhancement layer
│   ├── semantic-search.js          # Semantic similarity search
│   ├── query-optimizer.js          # LLM query optimization
│   └── smart-property-search.js    # Multi-API property routing
├── agents/          # Sub-agent system
│   ├── base-agent.js      # Base agent class
│   ├── router-agent.js    # Fast message routing
│   ├── business-agent.js  # Business intelligence
│   ├── real-estate-agent.js  # Property analysis
│   └── factory.js         # Agent factory
├── tools/           # Tool definitions and execution
│   ├── sms/         # SMS-optimized tools
│   │   ├── outcome-tools.js   # Outcome workspace tools
│   │   ├── attom-tools.js     # ATTOM property tools
│   │   ├── rentcast-tools.js  # RentCast rental tools
│   │   ├── web-tools.js       # Web search tools
│   │   └── executor.js        # Tool execution engine
│   ├── voice/       # Voice tools (empty directory - ready for future implementation)
│   └── registry.js  # Tool registry
├── sms/             # SMS processing pipeline
│   └── processor.js # Message processing orchestration
├── routes/          # HTTP/WebSocket routes
│   ├── health.js    # Health check endpoints
│   ├── sms.js       # SMS webhook handling
│   └── voice.js     # Voice WebSocket handling
├── state/           # Global state management
│   └── global-state.js  # Centralized state manager
└── server.js        # Main application server
server-modular.js    # Entry point (imports src/server.js)
```

### Key Architectural Improvements

1. **Dependency Injection Pattern**: All modules use dependency injection instead of global variables
2. **Separation of Concerns**: Each module has a single, clear responsibility
3. **Tool Deduplication**: Eliminated 20+ duplicate tool implementations
4. **Enhanced Error Handling**: Component-level error isolation with graceful fallbacks
5. **Production-Ready Features**: Health checks, graceful shutdown, comprehensive logging

### Architecture Metrics

- **Structure**: 32 modular files with clean separation of concerns
- **Total Lines**: ~4,870 lines across all modules
- **Main Entry**: `src/server.js` (234 lines) + `server-modular.js` (backward compatibility)
- **Largest Module**: `src/tools/sms/executor.js` (547 lines - tool execution engine)
- **Testability**: High modularity enables comprehensive unit testing
- **Maintainability**: Dependency injection and single-responsibility modules

### Key Components

**Memory System** (Modern In-Memory Approach):

```javascript
// node-cache with optimized settings
const cache = new NodeCache({
  stdTTL: 7200,    // 2 hours conversation TTL
  checkperiod: 64800, // 18 hours cleanup interval
  useClones: false    // Better performance
});

class ConversationMemory {
  // Synchronous operations (no async/await needed)
  addMessage(phoneNumber, role, content, metadata = {})
  getConversationHistory(phoneNumber, limit = 20)
  getUserContext(phoneNumber) / setUserContext(phoneNumber, context)
}
```

**Sub-Agent Architecture** (GPT-5 Responses API):

```javascript
class SubAgent {
  async process(messages, userContext = null) {
    // Convert to responses API format
    const response = await openai.responses.create({
      model: this.model, // gpt-5, gpt-5-mini, or gpt-5-nano
      input: fullInput, // Combined prompt (string or message array)
      reasoning: {
        effort: 'medium', // 'minimal', 'low', 'medium', 'high'
        summary: 'auto', // 'auto', 'concise', 'detailed'
      },
      text: {
        verbosity: 'medium', // 'low', 'medium', 'high'
      },
      // Optional: tools parameter for function calling
      tools: this.tools || undefined,
      // NEVER use max_output_tokens - control length through prompts and verbosity instead
    });
  }
}

// Specialized agents with different models and reasoning:
// RouterAgent: gpt-5-nano + minimal reasoning (ultra-fast routing)
// BusinessAgent: gpt-5 + medium reasoning + medium verbosity (business analysis)
// RealEstateAgent: gpt-5 + medium reasoning + medium verbosity (property analysis)
// GeneralAgent: gpt-5-mini + low reasoning + low verbosity (general queries)
```

**OutcomeAPIClient** (Enhanced Integration):

```javascript
class OutcomeAPIClient {
  // Multi-tenant headers: X-API-Key, X-Voice-User-Id, X-Organization-Id
  // Methods: getUserOutcomes, getChatHistory, getDataTables, getWorkflows, getTableData
  // Automatic user identification via phone number lookup
}
```

## Common Commands

### Development

```bash
# Start the voice agent server
npm start              # Production mode (port 5000) - uses server-modular.js
npm run dev           # Development mode with debugging
PORT=8080 npm start   # Custom port

# Direct module execution
node src/server.js              # Main server entry point
node server-modular.js          # Backward-compatible entry point

# Testing endpoints
curl http://localhost:5000/health          # Basic health check
curl http://localhost:5000/health/detailed # Detailed component status

# Testing
npm test              # Test SMS functionality via CLI (test-cli-simple.js)
```

### Environment Variables

**Core Configuration:**

```bash
# Required - OpenAI APIs
OPENAI_API_KEY=sk-...                    # OpenAI API (Realtime + GPT-5)

# Required - SMS/Voice Functionality
TWILIO_ACCOUNT_SID=...                   # Twilio account ID
TWILIO_AUTH_TOKEN=...                    # Twilio auth token
TWILIO_PHONE_NUMBER=+1...                # Twilio phone number

# Required - Business Intelligence
OUTCOME_API_KEY=VoiceAgent_SecureKey_2024 # Outcome workspace access
OUTCOME_API_URL=https://api.youroutcome.com

# Optional - Enhanced Functionality
TAVILY_API_KEY=...                       # Web search capability
RENTCAST_API_KEY=...                     # Residential property data
ATTOM_API_KEY=...                        # Commercial & residential properties

# Server Configuration
PORT=5000                                # Server port (default: 5000)
NODE_ENV=production                      # Environment mode
```

**Memory Configuration (Automatic):**

- **Storage**: In-memory using node-cache (no external dependencies)
- **TTL**: 2 hours per conversation
- **Cleanup**: Automatic every 18 hours
- **Capacity**: 50 messages per conversation (automatic trimming)

## Dual-Mode Architecture

### Voice Mode (Real-time)

- **Protocol**: WebSocket via Twilio Media Streams
- **Model**: OpenAI Realtime API with "cedar" voice
- **Processing**: Synchronous, low-latency responses
- **Context**: Session-based (lost on call end)
- **Tools**: Full comprehensive suite

### SMS Mode (Asynchronous)

- **Protocol**: HTTP webhooks from Twilio SMS
- **Model**: GPT-5 Responses API with sub-agent routing
- **Processing**: Async pipeline with intelligent routing
- **Context**: Persistent in memory with user identification
- **Tools**: Optimized for text responses

### Unified Features

- **User Identification**: Phone number → Outcome workspace user
- **Business Intelligence**: Access to projects, outcomes, data tables
- **Property Analysis**: ATTOM + RentCast + web search integration
- **Multi-tenant Security**: Organization-level data isolation

## Sub-Agent Routing System

### Router Agent (Ultra-Fast Routing with gpt-5-nano)

```javascript
// Ultra-fast routing decisions using gpt-5-nano
const response = await openai.responses.create({
  model: 'gpt-5-nano', // Fastest model for routing
  input: routingPrompt,
  reasoning: {
    effort: 'minimal', // Minimal reasoning for speed (few or no reasoning tokens)
  },
  text: {
    verbosity: 'low', // Concise routing decisions
  },
  // Use verbosity: 'low' and prompt instructions for brevity
});

// Routes to: BUSINESS_AGENT | REAL_ESTATE_AGENT | GENERAL_AGENT
```

### Business Agent (Medium Reasoning)

```javascript
// Business analysis and workspace integration
const response = await openai.responses.create({
  model: 'gpt-5',
  input: businessQuery,
  reasoning: {
    effort: 'medium', // Analyze business data thoroughly
    summary: 'auto',
  },
  text: {
    verbosity: 'medium', // Balanced detail for business context
  },
  tools: businessTools, // Outcome workspace tools
});

// Handles: Outcome data, projects, workflows, business context
```

### Real Estate Agent (Medium Reasoning)

```javascript
// Property analysis and market insights
const response = await openai.responses.create({
  model: 'gpt-5',
  input: propertyQuery,
  reasoning: {
    effort: 'medium', // Analyze property data thoroughly
    summary: 'auto',
  },
  text: {
    verbosity: 'medium', // Detailed property insights
  },
  tools: propertyTools, // ATTOM, RentCast, web search
});

// Handles: Property searches, valuations, market data
```

## Tool Categories & Smart Routing

### Outcome Workspace Tools (Business Intelligence)

- `getCurrentUserTool` - Current user info
- `lookupUserTool` - Phone number → user mapping
- `getUserOutcomesTool` - Projects and outcomes
- `getOutcomeDetailsTool` - Detailed project data
- `getChatHistoryTool` - Previous AI conversations
- `getDataTablesTool` / `getWorkflowsTool` - Business data
- `smartDataQueryTool` - **Enhanced business data querying**

### Property Analysis Tools (Intelligent Routing)

- `smartPropertySearchTool` - **Primary entry point** with automatic API selection
- **ATTOM Suite**: Property details, valuations, sales history, market trends
- **RentCast Suite**: Residential rental estimates and details
- **Web Fallback**: When specific APIs lack data

### SMS-Specific Optimizations

- **Shorter Responses**: Optimized for SMS character limits
- **Message Chunking**: Automatic splitting for long responses
- **Tool Selection**: Prioritizes most relevant data sources
- **Context Awareness**: Persistent conversation memory

## Advanced Features

### Message Processing Pipeline

1. **Receive SMS** → Store in conversation memory
2. **User Identification** → Phone lookup in Outcome workspace
3. **Route Message** → RouterAgent selects specialist
4. **Process Query** → Selected agent with tool access
5. **Generate Response** → GPT-5 with business context
6. **Chunk & Send** → SMS length optimization
7. **Store Response** → Persistent memory update

### Error Handling & Resilience

```javascript
// All components implement comprehensive error handling
try {
  const result = await processMessage();
  return result;
} catch (error) {
  console.error(`❌ Error:`, error.message);
  // Graceful fallback with user-friendly messages
  return fallbackResponse();
}
```

### Performance Optimizations

- **In-Memory Storage**: node-cache for zero-latency access
- **Async Processing**: SMS processing doesn't block Twilio webhook
- **Smart Caching**: Conversation context and user data
- **Tool Prioritization**: Most relevant APIs first

## Critical Development Principles

### ⚠️ NEVER HARDCODE Domain-Specific Logic

**IMPORTANT**: The voice agent is a general-purpose system that should work with ANY type of data in the user's Outcome workspace.

**DO NOT hardcode:**

- Property-specific logic (Box Score, NOI, cap rate, etc.)
- Real estate terminology or field names
- Business domain assumptions
- Specific outcome names or types
- Field mappings that assume certain data structures

**INSTEAD:**

- Let the LLM interpret data based on context
- Use generic data extraction and formatting
- Allow the semantic search to find relevant outcomes
- Present data as-is without domain assumptions
- Let users describe what they're looking for

**Example of what NOT to do:**

```javascript
// ❌ WRONG - Hardcoded property logic
if (selectedOutcome.title?.toLowerCase().includes('box score')) {
  // Extract NOI, cap rate, etc.
}

// ❌ WRONG - Assuming field names
const fieldMappings = {
  noi: 'Net Operating Income',
  cap_rate: 'Capitalization Rate',
};
```

**Example of what TO do:**

```javascript
// ✅ CORRECT - Generic data handling
const records = await getTableData(tableId);
return formatDataAsReceived(records);

// ✅ CORRECT - Let LLM interpret
const interpretation = await llm.interpret(records, userQuery);
```

This ensures the system works for ANY business domain - healthcare, finance, retail, manufacturing, etc., not just real estate.

## 🚨 CRITICAL: GPT-5 Usage Requirement

### ALWAYS Use GPT-5 for ALL LLM Calls

**MANDATORY**: All LLM API calls in this codebase MUST use GPT-5 models exclusively via the Responses API.

### ⚠️ Key GPT-5 Responses API Requirements

Based on official GPT-5 documentation, these parameters have specific requirements:

1. **Verbosity Parameter**: MUST be nested under `text` object

   - ❌ WRONG: `verbosity: 'low'` (flat parameter)
   - ✅ CORRECT: `text: { verbosity: 'low' }` (nested under text)
   - Values: 'low' (terse), 'medium' (default), 'high' (verbose)

2. **Reasoning Effort Values**: Use 'minimal', 'low', 'medium', 'high'

   - ✅ CORRECT: `reasoning: { effort: 'minimal' }` (few or no reasoning tokens, fastest)
   - ✅ CORRECT: `reasoning: { effort: 'low' }` (some reasoning)
   - ✅ CORRECT: `reasoning: { effort: 'medium' }` (default if not specified)
   - ✅ CORRECT: `reasoning: { effort: 'high' }` (maximum reasoning)

3. **Tool Definition**: ⚠️ IMPORTANT - API behavior differs from documentation!

   **What the docs say (doesn't work):**

   - `tools: [{ type: 'function', function: { name: 'tool_name', description: '...' } }]`

   **What actually works with GPT-5 Responses API:**

   - ✅ CORRECT: `tools: [{ name: 'tool_name', type: 'function', function: { description: '...', parameters: {...} } }]`
   - The `name` MUST be at the top level of the tool object, NOT inside `function`
   - This is confirmed through testing - the API returns "Missing required parameter: 'tools[0].name'" if name is not at top level

4. **Custom Tools**: For freeform function calling (raw text output)

   - Use `type: 'custom'` for raw text payloads (Python, SQL, etc.)
   - Format: `{ type: 'custom', name: 'tool_name', description: '...' }`
   - Custom tools do NOT support parallel tool calling
   - Useful for code execution, SQL queries, config generation

5. **Default Values**:

   - Reasoning effort defaults to 'medium' if not specified
   - Verbosity defaults to 'medium' if not specified

6. **⚠️ NEVER use max_output_tokens**:
   - Do NOT use the `max_output_tokens` parameter - it can cause issues with response generation
   - Instead, control response length through prompts and the `text: { verbosity: 'low' }` parameter
   - For SMS brevity, use explicit prompt instructions like "respond in 2-3 sentences"

### GPT-5 Responses API - Correct Usage

```javascript
// ✅ CORRECT - Basic GPT-5 call (PREFERRED FORMAT)
const response = await openai.responses.create({
  model: 'gpt-5', // 'gpt-5', 'gpt-5-mini', or 'gpt-5-nano'
  input: 'Write a one-sentence bedtime story about a unicorn.',
  reasoning: {
    effort: 'medium', // 'low', 'medium', 'high' (not 'minimal' - invalid)
    summary: 'auto'   // 'auto', 'concise', 'detailed' (optional)
  },
  text: {
    verbosity: 'medium' // MUST be nested under text: 'low', 'medium', 'high' (optional)
  }
});

// ✅ CORRECT - With instructions parameter (alternative to system message)
const response = await openai.responses.create({
  model: 'gpt-5',
  reasoning: { effort: 'low' },
  text: { verbosity: 'low' }, // MUST be nested under text
  instructions: 'Talk like a pirate.',
  input: 'Are semicolons optional in JavaScript?',
});

// ✅ CORRECT - With message roles in input array
const response = await openai.responses.create({
  model: 'gpt-5',
  reasoning: { effort: 'medium' },
  text: { verbosity: 'medium' }, // MUST be nested under text
  input: [
    {
      role: 'system',
      content: 'Talk like a pirate.'
    },
    {
      role: 'user',
      content: 'Are semicolons optional in JavaScript?',
    },
  ],
});

// ✅ CORRECT - With function calling and output limits
const response = await openai.responses.create({
  model: 'gpt-5',
  input: userQuery,
  reasoning: { effort: 'medium' },
  text: { verbosity: 'low' }, // MUST be nested under text for concise SMS
  tools: [{ type: 'function', function: { name: 'search', ... } }]
});

// ✅ CORRECT - Minimal reasoning for speed (GPT-5 specific)
const response = await openai.responses.create({
  model: 'gpt-5-nano',
  input: routingQuery,
  reasoning: { effort: 'minimal' }, // Use 'minimal' for fastest routing with few/no reasoning tokens
  text: { verbosity: 'low' } // MUST be nested under text
});
```

### Model Selection Guide

**GPT-5 Model Variants:**

- `gpt-5-nano` - Ultra-fast routing decisions, simple classification, minimal cost
- `gpt-5-mini` - Fast responses with better capability than nano, balanced cost/performance
- `gpt-5` - Full model for complex business analysis, data processing, maximum capability

**Reasoning Levels:**

- `minimal` - Few or no reasoning tokens, fastest time-to-first-token, ideal for simple tasks
- `low` - Quick responses, simple questions, basic tool calling
- `medium` - Business analysis, data processing, standard queries (default if not specified)
- `high` - Complex analysis, multi-step reasoning, comprehensive explanations

**Verbosity Levels (nested under text parameter):**

The verbosity parameter MUST be nested under the `text` object in GPT-5 Responses API:

- `low` - Terse, minimal prose; concise responses (ideal for SMS)
- `medium` - Balanced detail with explanations (default)
- `high` - Verbose, comprehensive responses with examples and context; great for audits, teaching, or hand-offs

### Extracting Response Text

```javascript
// GPT-5 Responses API returns structured output with multiple items
// The output array can contain tool calls, reasoning tokens, and text

// ✅ PREFERRED - Use SDK convenience property (aggregates all text)
let finalText = response.output_text || '';

// ✅ FALLBACK - Manual parsing of output array
if (!finalText && Array.isArray(response.output)) {
  for (const item of response.output) {
    if (
      item.type === 'message' &&
      item.role === 'assistant' &&
      Array.isArray(item.content)
    ) {
      for (const content of item.content) {
        if (content.type === 'output_text' && content.text) {
          finalText = content.text;
          break;
        }
      }
    }
    if (finalText) break;
  }
}

// Note: The output array often has more than one item!
// It can contain tool calls, reasoning data, and other items
```

### Common Use Cases

```javascript
// Ultra-fast routing (use gpt-5-nano with minimal reasoning)
const routingResponse = await openai.responses.create({
  model: 'gpt-5-nano',
  input: 'Route this message: "Show me my properties"',
  reasoning: { effort: 'minimal' }, // Use 'minimal' for fastest routing with few/no reasoning tokens
});

// SMS responses (use gpt-5 for all text responses)
const smsResponse = await openai.responses.create({
  model: 'gpt-5',
  input: userQuery,
  reasoning: { effort: 'low' },
  text: { verbosity: 'low' }, // MUST be nested under text for concise SMS responses
});

// Complex data analysis (use full gpt-5 with high reasoning)
const analysisResponse = await openai.responses.create({
  model: 'gpt-5',
  input: 'Analyze this data: ' + JSON.stringify(data),
  reasoning: {
    effort: 'high', // Deep analysis
    summary: 'detailed',
  },
  text: { verbosity: 'high' }, // MUST be nested under text for comprehensive explanations
});

// Tool calling with balanced performance
// IMPORTANT: Name MUST be at top level for GPT-5 Responses API (differs from docs)
const toolResponse = await openai.responses.create({
  model: 'gpt-5',
  input: userQuery,
  reasoning: { effort: 'medium' },
  text: { verbosity: 'medium' }, // MUST be nested under text
  tools: [
    {
      name: 'search', // Name MUST be at top level (not inside function)
      type: 'function',
      function: {
        description: 'Search for information',
        parameters: {
          /* JSON Schema */
        },
      },
    },
  ],
});

// Using instructions for system-level guidance
const instructionResponse = await openai.responses.create({
  model: 'gpt-5',
  reasoning: { effort: 'medium' },
  text: { verbosity: 'low' }, // MUST be nested under text for concise responses
  instructions:
    'You are a helpful real estate assistant. Keep responses brief and actionable.',
  input: userQuery,
});
```

### Why GPT-5 Only

- **Reasoning Models**: GPT-5 is a reasoning model that behaves differently from chat models
- **Better Prompting**: Responds better to different prompt styles than traditional models
- **Consistent Capabilities**: Uniform reasoning across all agents
- **Business Context**: Superior understanding of complex business scenarios
- **Tool Calling**: More accurate function calling and parameter extraction
- **Unified API**: Single Responses API interface (recommended for all new projects)
- **Future-Proof**: Latest OpenAI technology with ongoing improvements

## Development Patterns

### ⚠️ CRITICAL: After Every Code Change

**ALWAYS follow this workflow after making code changes:**

1. **Restart the server** - Kill existing process and restart with `npm start`
2. **Test the changes** - Verify the fix works as expected
3. **Commit the code** - Use descriptive commit messages with the changes made

```bash
# Required workflow after each change:
1. Kill existing server (if running)
2. npm start (restart server)
3. Test functionality
4. git add -A && git commit -m "fix: description of change"
```

**This ensures:**

- Changes are immediately active
- No stale code is running
- Version control tracks all iterations
- Easy rollback if issues occur

### 📊 MANDATORY: Continuous Log Monitoring

**Claude must ALWAYS monitor logs in real-time during development:**

1. **Check logs continuously**: Monitor `/Users/sidjain/Documents/Work/OutcomeCode/outcome-workspace/apps/voice-agent/logs/latest.log`
2. **Watch for errors**: Look for patterns like `error|Error|ERROR|❌|failed|Failed`
3. **Auto-fix issues**: When errors are detected:
   - Analyze the error immediately
   - Fix the code
   - Restart the server
   - Commit the fix
4. **Track SMS processing**: Monitor for:
   - "📱 SMS webhook received"
   - "🔧 Executing SMS tool"
   - "📱 SMS sent" or "Would send SMS"
   - Any processing delays or timeouts
5. **Continue monitoring until explicitly told to stop by the user**

```bash
# Monitor logs in real-time:
tail -f logs/latest.log

# Check for errors:
tail -f logs/latest.log | grep -E 'error|Error|ERROR|❌|failed|Failed'

# Monitor SMS activity:
tail -f logs/latest.log | grep -E '📱|🔧|SMS'
```

### Adding New Tools

Tools are now organized in dedicated modules:

```javascript
// Add to src/tools/sms/[category]-tools.js
export const newTool = {
  name: 'tool_name_sms',
  description: 'Concise description for SMS context',
  parameters: {
    type: 'object',
    properties: {
      // JSON Schema parameters
    }
  }
};

// Implementation in same file
export async function executeNewTool(params, dependencies) {
  const { outcomeClient, conversationMemory } = dependencies;
  try {
    const result = await apiCall(params);
    return formatForSMS(result);
  } catch (error) {
    console.error(`❌ Tool execution failed:`, error.message);
    return { error: 'User-friendly message' };
  }
}

// Register in src/tools/sms/executor.js
case 'tool_name_sms':
  return await executeNewTool(params, dependencies);
```

### Memory Management Best Practices

```javascript
// Memory is injected as dependency - no direct cache access
import { createMemoryFactory } from '../memory/factory.js';

// In your module
export function createYourModule(dependencies) {
  const { conversationMemory } = dependencies;

  // Store conversation context
  conversationMemory.addMessage(phoneNumber, 'user', message);

  // Retrieve with automatic TTL handling
  const history = conversationMemory.getConversationHistory(phoneNumber, 10);

  // User context for business data access
  conversationMemory.setUserContext(phoneNumber, {
    userId: userData.id,
    organizationId: userData.organizationId,
    identifiedAt: new Date().toISOString(),
  });
}
```

### Sub-Agent Development

```javascript
// Create new agent in src/agents/
import { BaseAgent } from './base-agent.js';

export class SpecializedAgent extends BaseAgent {
  constructor(dependencies) {
    super('gpt-5', dependencies);
    // Agent-specific configuration
    this.reasoning = { effort: 'high' };
    // Note: No additional text configuration needed - responses API handles formatting
  }

  async process(messages, userContext = null) {
    // Use inherited processing with custom reasoning parameters
    return super.process(messages, userContext);
  }
}

// Register in src/agents/factory.js
case 'SPECIALIZED_AGENT':
  return new SpecializedAgent(dependencies);
```

## Deployment & Production

### Dependencies

```json
{
  "fastify": "^5.5.0",
  "@fastify/formbody": "^8.0.2",
  "@fastify/websocket": "^11.2.0",
  "openai": "^5.20.1",
  "@openai/agents": "^0.1.0",
  "node-cache": "^5.1.2",
  "twilio": "^5.9.0",
  "dotenv": "^17.2.1"
}
```

### Health Monitoring

The server provides comprehensive startup logging:

```
🚀 Voice & SMS Agent with Outcome Integration
Port: 5000
Memory Store: In-Memory (node-cache)
APIs Configured: ✅ Outcome, ❌ ATTOM, ❌ RentCast
SMS: GPT-5 + Sub-agents + Memory
Voice: Realtime API + WebSocket
✅ Server is ready to accept connections
```

### Security Considerations

- **API Keys**: Environment-based with masked logging
- **Multi-tenancy**: Organization-level data isolation
- **Phone Verification**: Twilio-validated phone numbers
- **Memory Isolation**: Per-phone conversation storage

## Migration Notes

### Current Architecture Benefits

1. **Modular Design**: 32 files with clean separation of concerns
2. **Dependency Injection**: All modules use DI instead of global variables
3. **In-Memory Storage**: node-cache eliminates external dependencies
4. **Fastify Performance**: Better performance than Express with native WebSocket support
5. **GPT-5 Integration**: Proper Responses API with reasoning control
6. **Sub-Agent Architecture**: Intelligent routing with specialized processing

### Development Features

- **No External Dependencies**: In-memory storage with automatic cleanup
- **Clean Package Structure**: Minimal, focused dependencies
- **Enhanced Error Handling**: Component-level isolation with graceful fallbacks
- **Comprehensive Logging**: Better debugging and monitoring
- **Health Checks**: Detailed system status endpoints

This voice agent represents a modern, efficient architecture for dual-mode AI assistance with enterprise-grade business intelligence integration.
