/**
 * SMS Tools for Outcome Workspace Integration
 * Extracted from server.js SMS tool definitions
 */

const outcomeToolsSMS = [
  {
    name: 'lookup_outcome_user_sms',
    description:
      'Look up user by phone number to access their Outcome workspace data',
    parameters: {
      type: 'object',
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'Phone number in format +1234567890',
        },
      },
      required: ['phoneNumber'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_user_outcomes_sms',
    description: "Get user's projects/outcomes from Outcome workspace via SMS",
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status: PENDING, RUNNING, COMPLETED',
          enum: ['PENDING', 'RUNNING', 'COMPLETED'],
        },
        limit: {
          type: 'number',
          description: 'Limit number of results',
          default: 5,
        },
      },
    },
  },
  {
    name: 'smart_data_query_sms',
    description: `📊 WHEN TO USE: Use this tool when user asks about THEIR OWN DATA in their workspace, outcomes, or projects.

🎯 SPECIFIC USE CASES:
- "Show me my data" / "What data do I have?" / "My workspace data"
- "My outcomes" / "My projects" / "What am I working on?"
- "My leases" / "My properties" / "My contracts" (user's own data)
- "Tell me about my business" / "My company data"
- "What's in my workspace?" / "My recent activity"

⚠️ DO NOT USE for external property searches or market data - use ATTOM/RentCast tools instead.

This tool provides context-aware data analysis and intelligent querying across all user data sources.

🚨 CRITICAL: You MUST always pass the "query" parameter. Extract the user's actual request text.
Examples:
- User: "tell me about property performance based on box score" → {"query": "property performance based on box score"}
- User: "show me my data" → {"query": "show me my data"}
- User: "what properties do I own" → {"query": "what properties do I own"}`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'REQUIRED: The exact user query text. You MUST extract this from the user\'s message. Do not leave this empty.',
        },
        category: {
          type: 'string',
          description: 'Data category to focus on',
          enum: ['outcomes', 'properties', 'contracts', 'general'],
        },
        includeDetails: {
          type: 'boolean',
          description: 'Include detailed data in response',
          default: true,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_data_tables_sms',
    description: "Get user's data tables for a specific outcome/project via SMS",
    parameters: {
      type: 'object',
      properties: {
        outcomeId: {
          type: 'string',
          description: 'The outcome/project ID to get data tables for',
        },
      },
      required: ['outcomeId'],
    },
  },
  {
    name: 'get_table_data_sms',
    description: 'Get actual data records from a specific data table via SMS',
    parameters: {
      type: 'object',
      properties: {
        tableId: {
          type: 'string',
          description: 'The data table ID to retrieve data from',
        },
        limit: {
          type: 'number',
          description: 'Limit number of records returned',
          default: 10,
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination',
          default: 0,
        },
      },
      required: ['tableId'],
    },
  },
  {
    name: 'get_chat_history_sms',
    description:
      "Get user's previous AI chat conversations from Outcome workspace via SMS",
    parameters: {
      type: 'object',
      properties: {
        outcomeId: {
          type: 'string',
          description:
            'Optional: Specific outcome ID to get chat history for',
        },
        limit: {
          type: 'number',
          description: 'Limit number of conversations returned',
          default: 5,
        },
      },
    },
  },
];

export { outcomeToolsSMS };
export default outcomeToolsSMS;