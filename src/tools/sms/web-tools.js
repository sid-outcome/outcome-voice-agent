/**
 * SMS Tools for Web Search Integration
 * Extracted from server.js SMS tool definitions
 */

const webToolsSMS = [
  {
    name: 'web_search_sms',
    description: `🌐 Search the web for current information via SMS using Tavily API.

WHEN TO USE:
- General information not in user's workspace
- Current events, news, recent data
- Information not available through ATTOM/RentCast
- Market research and general business information

EXAMPLES:
- "What's happening in the Chicago real estate market?"
- "Recent news about commercial real estate"
- "Current mortgage rates"
- "Company information for [business name]"

🚨 CRITICAL: You MUST always pass the "query" parameter. Extract keywords from the user's message.
Examples:
- User: "what's happening in real estate market" → {"query": "real estate market news"}
- User: "current mortgage rates" → {"query": "current mortgage rates"}
- User: "information about commercial properties" → {"query": "commercial real estate information"}`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'REQUIRED: Search query extracted from user message. Extract key terms and concepts from what the user is asking about.',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 5,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
];

export { webToolsSMS };
export default webToolsSMS;