/**
 * SMS Tools for ATTOM Property Data API
 * Extracted from server.js SMS tool definitions
 */

const attomToolsSMS = [
  {
    name: 'attom_property_detail_sms',
    description: `🏢 Get detailed property information via SMS using ATTOM Data API.

⚠️ CRITICAL REQUIREMENTS:
- ONLY use when explicit street address is provided (e.g., "123 Main St, Chicago, IL")
- DO NOT use for company names or business lookups
- DO NOT use to "find" addresses - address must be already known

WHEN TO USE:
- User provides complete street address: "123 Main Street, Chicago, IL"
- Property valuations when address is explicitly given
- Both commercial and residential properties with known addresses

❌ DO NOT USE FOR:
- "Find address for ABC Company" (use BUSINESS_AGENT)
- "Where is XYZ located" (use BUSINESS_AGENT)  
- Company names without addresses (use BUSINESS_AGENT)

✅ CORRECT USAGE:
- "Analyze 456 Oak Street, Boston, MA"
- "Value property at 789 Pine Ave, Denver, CO"

CRITICAL: This tool works for both commercial and residential properties across the entire US, but ONLY when the street address is explicitly provided.`,
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Complete property address',
        },
        city: {
          type: 'string',
          description: 'City name',
        },
        state: {
          type: 'string',
          description: 'State abbreviation (e.g., IL, CA)',
        },
        zipCode: {
          type: 'string',
          description: 'ZIP code',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'attom_assessment_sms',
    description:
      'Get property assessment/tax information via SMS using ATTOM API',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Complete property address',
        },
        city: {
          type: 'string',
          description: 'City name',
        },
        state: {
          type: 'string',
          description: 'State abbreviation',
        },
        zipCode: {
          type: 'string',
          description: 'ZIP code',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'attom_avm_sms',
    description:
      'Get automated property valuation (AVM) via SMS using ATTOM API',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Complete property address',
        },
        city: {
          type: 'string',
          description: 'City name',
        },
        state: {
          type: 'string',
          description: 'State abbreviation',
        },
        zipCode: {
          type: 'string',
          description: 'ZIP code',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'attom_sales_history_sms',
    description:
      'Get property sales history and comparable sales via SMS using ATTOM API',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Complete property address',
        },
        city: {
          type: 'string',
          description: 'City name',
        },
        state: {
          type: 'string',
          description: 'State abbreviation',
        },
        zipCode: {
          type: 'string',
          description: 'ZIP code',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'attom_market_trends_sms',
    description:
      'Get local market trends and statistics via SMS using ATTOM API',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Property address for market area',
        },
        city: {
          type: 'string',
          description: 'City name',
        },
        state: {
          type: 'string',
          description: 'State abbreviation',
        },
        zipCode: {
          type: 'string',
          description: 'ZIP code',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'smart_property_search_sms',
    description: `🔍 INTELLIGENT PROPERTY SEARCH: Automatically tries multiple APIs to find property data.

⚠️ CRITICAL REQUIREMENTS:
- ONLY use when explicit street address is provided (e.g., "123 Main St, Chicago, IL")
- DO NOT use for company names or business lookups
- DO NOT use to "find" addresses from company names

WHEN TO USE:
- User provides complete street address: "Find property at 456 Oak Street, Boston, MA"
- Property information requests with known addresses
- Any property-related query with an explicit address

❌ DO NOT USE FOR:
- "Find address for ABC Company" (use BUSINESS_AGENT workspace tools)
- "Where is XYZ Company located" (use BUSINESS_AGENT workspace tools)
- Company names without street addresses

✅ CORRECT USAGE:
- "Property information for 789 Pine Ave, Denver, CO"
- "Tell me about 123 Main Street, Chicago, IL"

HOW IT WORKS:
1. Tries ATTOM Data API first (commercial & residential)
2. Falls back to RentCast for residential rentals
3. Falls back to web search if needed

This is your GO-TO tool for property searches when you have an explicit street address.`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language property search query',
        },
        address: {
          type: 'string',
          description: 'Property address to search for',
        },
        city: {
          type: 'string',
          description: 'City name',
        },
        state: {
          type: 'string',
          description: 'State abbreviation',
        },
        zipCode: {
          type: 'string',
          description: 'ZIP code',
        },
      },
      required: ['query'],
    },
  },
];

export { attomToolsSMS };
export default attomToolsSMS;