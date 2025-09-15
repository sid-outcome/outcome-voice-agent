/**
 * Query Optimization using LLM
 * Extracted from server.js lines 6619-6762
 */
import OpenAI from 'openai';

class QueryOptimizer {
  constructor(openaiClient) {
    this.openai = openaiClient;
  }

  // Generate optimized query for Outcome workspace data
  async generateOutcomeQuery(userQuery, context) {
    // Handle undefined or empty query - try to extract from context
    if (!userQuery) {
      console.log(`⚠️ Query is undefined or empty, checking context`);

      // If context contains the original user message, use that
      if (context && typeof context === 'string' && context.length > 0) {
        console.log(`📝 Using context as query: "${context}"`);
        return context;
      }

      // Fallback to generic query
      console.log(`📝 Using default query`);
      return 'show me my business data and performance metrics';
    }
    // Skip optimization - just return the original query
    // The SQL generation was misleading and unused
    console.log(`🔍 Using original query without SQL conversion`);
    return userQuery.trim();
  }

  // Optimize ATTOM Property API parameters with LLM validation
  async optimizeAttomPropertyParams(
    apiType,
    params,
    userQuery = '',
    context = ''
  ) {
    // First apply deterministic address normalization
    const normalizedParams = this.normalizeAttomParams(params);

    const prompt = `You are an expert at optimizing ATTOM Data API parameters for ${apiType} calls.

ATTOM API Requirements:
- address1: Street number and name ONLY (e.g., "600 W Chicago Ave")
- address2: City and state ONLY (e.g., "Chicago, IL")
- postalcode: ZIP code if available (e.g., "60654")
- NO extra fields like "city" or "state" separately

API Type: ${apiType}
User Query: "${userQuery}"
Context: "${context}"
Current Parameters: ${JSON.stringify(normalizedParams, null, 2)}

Return ONLY a clean JSON object with ATTOM-compliant parameters:`;

    try {
      const response = await this.openai.responses.create({
        model: 'gpt-5',
        input: prompt,
        reasoning: { effort: 'low' }, // Quick parameter optimization
      });

      console.log(
        `🤖 Query Optimizer GPT-5 FULL Response:`,
        JSON.stringify(response, null, 2)
      );

      // Extract from GPT-5 Responses API
      const content = response.output_text ||
        (response.output && response.output.find(item => item.type === 'message')?.content) ||
        '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const optimizedParams = JSON.parse(jsonMatch[0]);

        // Validate and clean ATTOM parameters
        const validatedParams = this.validateAttomParams(optimizedParams);
        console.log(
          `🤖 LLM optimized ATTOM ${apiType} parameters:`,
          validatedParams
        );
        return validatedParams;
      }
    } catch (error) {
      console.log(
        `❌ ATTOM ${apiType} parameter optimization failed: ${error.message}`
      );
    }

    console.log(`🔄 Using normalized ATTOM ${apiType} parameters...`);
    return normalizedParams; // Fallback to normalized
  }

  // Optimize RentCast API parameters
  async optimizeRentCastParams(
    apiType,
    params,
    userQuery = '',
    context = ''
  ) {
    const prompt = `You are an expert at optimizing RentCast API parameters for ${apiType} calls.

RentCast API Requirements:
- address: Complete property address (e.g., "1234 Main St, Chicago, IL 60601")
- propertyType: residential, apartment, condo, etc.
- bedrooms: number of bedrooms if specified
- bathrooms: number of bathrooms if specified

API Type: ${apiType}
User Query: "${userQuery}"
Context: "${context}"
Current Parameters: ${JSON.stringify(params, null, 2)}

Return ONLY a clean JSON object with RentCast-compliant parameters:`;

    try {
      const response = await this.openai.responses.create({
        model: 'gpt-5',
        input: prompt,
        reasoning: { effort: 'low' }, // Quick parameter optimization
      });

      console.log(
        `🤖 Query Optimizer GPT-5 FULL Response:`,
        JSON.stringify(response, null, 2)
      );

      // Extract from GPT-5 Responses API
      const content = response.output_text ||
        (response.output && response.output.find(item => item.type === 'message')?.content) ||
        '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const optimizedParams = JSON.parse(jsonMatch[0]);
        console.log(
          `🤖 LLM optimized RentCast ${apiType} parameters:`,
          optimizedParams
        );
        return optimizedParams;
      }
    } catch (error) {
      console.log(
        `❌ RentCast ${apiType} parameter optimization failed: ${error.message}`
      );
    }

    console.log(`🔄 Using original RentCast ${apiType} parameters...`);
    return params; // Fallback to original
  }

  // Deterministic ATTOM parameter normalization
  normalizeAttomParams(params) {
    const normalized = { ...params };

    // Handle address normalization
    if (normalized.address && !normalized.address1) {
      // Try to split address into components
      const addressMatch = normalized.address.match(
        /^(.+?),\s*([^,]+),?\s*([A-Z]{2})?\s*(\d{5})?/
      );
      if (addressMatch) {
        normalized.address1 = addressMatch[1].trim();
        if (addressMatch[3]) {
          normalized.address2 = `${addressMatch[2].trim()}, ${addressMatch[3]}`;
        } else {
          normalized.address2 = addressMatch[2].trim();
        }
        if (addressMatch[4]) {
          normalized.postalcode = addressMatch[4];
        }
        delete normalized.address;
      }
    }

    // Remove invalid fields
    delete normalized.city; // ATTOM doesn't accept separate city field
    delete normalized.state; // ATTOM doesn't accept separate state field
    delete normalized.zipCode; // Use postalcode instead

    return normalized;
  }

  // Validate ATTOM parameters
  validateAttomParams(params) {
    const validated = {};

    // Only include valid ATTOM fields
    const validFields = ['address1', 'address2', 'postalcode', 'attomid', 'propertytype', 'geoidv4'];

    validFields.forEach(field => {
      if (params[field] && params[field].toString().trim()) {
        validated[field] = params[field].toString().trim();
      }
    });

    return validated;
  }
}

export { QueryOptimizer };