# Voice Agent Tools Documentation

## Overview

The Voice Agent includes 15 SMS-optimized tools that provide access to business data, property information, and web search capabilities.

## Tool Categories

### 1. Business Intelligence Tools (Outcome Workspace)

#### getCurrentUserTool

- **Purpose**: Get current user information
- **Parameters**: None (uses phone context)
- **Returns**: User profile, organization, preferences
- **Example Response**: User name, email, organization details

#### lookupUserTool

- **Purpose**: Find user by phone number
- **Parameters**: `phoneNumber` (string)
- **Returns**: User ID, organization ID, profile
- **Use Case**: Initial user identification for context

#### getUserOutcomesTool

- **Purpose**: Retrieve user's projects and outcomes
- **Parameters**: Uses user context
- **Returns**: List of outcomes with titles and IDs
- **Example**: "You have 3 outcomes: Property Portfolio, Market Analysis, Investment Tracker"

#### smartDataQueryTool

- **Purpose**: Intelligent query of user's business data
- **Parameters**: `query` (string) - natural language query
- **Returns**: Formatted data based on query
- **Example Query**: "show me property performance metrics"

### 2. Property Analysis Tools

#### smartPropertySearchTool

- **Purpose**: Primary entry point for property searches
- **Parameters**: `query` (string) - natural language property query
- **Auto-routes to**: ATTOM, RentCast, or web search
- **Example**: "find commercial properties in Austin under $2M"

#### ATTOM Property Suite (7 tools)

**getAttomPropertyDetailTool**

- **Purpose**: Comprehensive property information
- **Parameters**: `address` (string)
- **Returns**: Property type, size, year built, features

**getAttomPropertyAssessmentTool**

- **Purpose**: Tax assessment data
- **Parameters**: `address` (string)
- **Returns**: Assessed value, tax amount, improvements

**getAttomAVMTool**

- **Purpose**: Automated property valuation
- **Parameters**: `address` (string)
- **Returns**: Estimated value, confidence score, comparables

**getAttomSalesHistoryTool**

- **Purpose**: Property transaction history
- **Parameters**: `address` (string)
- **Returns**: Previous sales, prices, dates

**getAttomMarketTrendsTool**

- **Purpose**: Local market analysis
- **Parameters**: `location` (string), `propertyType` (optional)
- **Returns**: Median prices, inventory, trends

**getAttomComparablesTool**

- **Purpose**: Find similar properties
- **Parameters**: `address` (string), `radius` (number)
- **Returns**: List of comparable properties with details

**getAttomOwnershipTool**

- **Purpose**: Property ownership information
- **Parameters**: `address` (string)
- **Returns**: Owner name, mailing address, ownership type

#### RentCast Suite (2 tools)

**getRentCastPropertyDetailsTool**

- **Purpose**: Residential property details
- **Parameters**: `address` (string)
- **Returns**: Bedrooms, bathrooms, square footage

**getRentCastRentEstimateTool**

- **Purpose**: Rental value estimation
- **Parameters**:
  - `address` (string)
  - `propertyType` (optional)
  - `bedrooms` (optional)
- **Returns**: Rent estimate range, comparable rentals

### 3. Research Tools

#### webSearchTool

- **Purpose**: Current web information via Tavily
- **Parameters**: `query` (string)
- **Returns**: Relevant search results with summaries
- **Example**: "current real estate trends in Chicago 2025"

## Tool Execution Flow

```
User Message
    ↓
Agent Selection (Router)
    ↓
Tool Selection (Agent decides)
    ↓
Parameter Extraction (from message)
    ↓
Tool Execution
    ↓
API Call (External service)
    ↓
Response Formatting (SMS-friendly)
    ↓
Return to Agent
```

## Adding New Tools

### 1. Define the Tool

```javascript
// In src/tools/sms/[category]-tools.js
export const newToolName = {
  name: 'tool_name_sms',
  description: 'Clear description for LLM to understand when to use this',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'What this parameter is for',
      },
    },
    required: ['param1'],
  },
};
```

### 2. Implement the Handler

```javascript
// In same file
export async function executeNewTool(params, dependencies) {
  const { outcomeClient, conversationMemory } = dependencies;

  try {
    // Make API call
    const result = await outcomeClient.someMethod(params.param1);

    // Format for SMS (keep it concise)
    return {
      success: true,
      data: formatForSMS(result),
    };
  } catch (error) {
    console.error('❌ Tool execution failed:', error);
    return {
      success: false,
      error: 'User-friendly error message',
    };
  }
}
```

### 3. Register in Executor

```javascript
// In src/tools/sms/executor.js
case 'tool_name_sms':
  return await executeNewTool(parameters, {
    outcomeClient: this.outcomeClient,
    conversationMemory: this.conversationMemory
  });
```

### 4. Add to Registry

```javascript
// In src/tools/registry.js
const businessTools = [
  // ... existing tools
  newToolName,
];
```

## Tool Response Guidelines

### SMS Formatting Rules

1. **Concise**: Max 160 characters per chunk
2. **Clear**: No technical jargon
3. **Actionable**: Include next steps if relevant
4. **Structured**: Use bullet points for lists
5. **Complete**: Don't truncate important data

### Error Handling

All tools should:

- Catch and log errors
- Return user-friendly messages
- Never expose technical details
- Provide fallback suggestions

### Performance Considerations

- **Timeout**: 2.5 seconds for API calls
- **Caching**: Results cached for 2 hours
- **Retries**: 1 retry on timeout
- **Fallbacks**: Web search if specific API fails

## Tool Selection Strategy

The agent selects tools based on:

1. **Keywords**: "my" → business tools, addresses → property tools
2. **Context**: Previous conversation influences selection
3. **Availability**: Falls back if API key not configured
4. **Cost**: Prefers cheaper APIs when equivalent

## Testing Tools

### Via CLI

```bash
node test-cli-simple.js

# Test business tools
> show me my outcomes
> what data do I have?

# Test property tools
> search for properties in Austin
> what's the value of 123 Main St?

# Test web search
> current market trends in tech industry
```

### Via Direct API

```bash
# Test tool execution directly
curl -X POST http://localhost:5000/sms \
  -d "Body=show me my data&From=+1234567890"
```

## Tool Metrics

Typical performance:

- **Outcome tools**: 200-500ms
- **ATTOM tools**: 500-1500ms
- **RentCast tools**: 300-800ms
- **Web search**: 1000-2000ms

## Common Issues

**Tool Not Found**

- Check tool name matches exactly
- Verify tool is registered in registry
- Ensure executor has case for tool

**Empty Parameters**

- Add explicit parameter extraction examples in description
- Use fallback to conversation history
- Prompt user for missing information

**API Failures**

- Check API key is configured
- Verify API endpoint is accessible
- Review rate limits
- Check error logs for details
