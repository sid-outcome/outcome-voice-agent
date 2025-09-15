/**
 * Smart Property Search with Multi-API Routing
 * Extracted from server.js lines 6880-7037
 */
import { AttomAPIClient } from '../api-clients/attom-client.js';
import { RentCastAPIClient } from '../api-clients/rentcast-client.js';
import { TavilyAPIClient } from '../api-clients/tavily-client.js';
import { QueryOptimizer } from './query-optimizer.js';

class SmartPropertySearch {
  constructor(attomClient, rentcastClient, tavilyClient, openaiClient) {
    this.attomClient = attomClient;
    this.rentcastClient = rentcastClient;
    this.tavilyClient = tavilyClient;
    this.queryOptimizer = new QueryOptimizer(openaiClient);
  }

  // Execute smart property search with automatic API selection and fallback
  async executeSmartPropertySearch({
    query,
    address,
    city,
    state,
    zipCode,
  }) {
    const toolStartTime = Date.now();
    console.log(`\n🏠 ===== SMART PROPERTY SEARCH STARTED =====`);
    console.log(`🔍 Query: "${query}"`);
    console.log(`📍 Address: ${address || 'Not specified'}`);
    console.log(`🏙️ Location: ${city || ''} ${state || ''} ${zipCode || ''}`);

    // Step 1: Generate optimal ATTOM parameters using LLM
    console.log(`\n🤖 Step 1: Generating optimal ATTOM parameters using LLM...`);
    const attomSearchParams = await this.generateAttomParameters(
      query,
      address,
      city,
      state,
      zipCode
    );

    // Step 2: Try ATTOM Property Search first
    console.log(
      `\n📊 Step 2: Trying ATTOM Property Search (Commercial & Residential)...`
    );

    try {
      const attomResult = await this.searchAttomProperties(
        '/property/snapshot',
        attomSearchParams
      );

      if (
        attomResult &&
        !attomResult.error &&
        attomResult.property &&
        attomResult.property.length > 0
      ) {
        const toolEndTime = Date.now();
        const responseTime = ((toolEndTime - toolStartTime) / 1000).toFixed(2);

        console.log(
          `✅ ATTOM search successful! Found ${attomResult.property.length} properties`
        );
        console.log(`⏱️ Total response time: ${responseTime}s`);
        console.log(`🏠 ===== SMART PROPERTY SEARCH COMPLETED =====\n`);

        return {
          success: true,
          properties: attomResult.property,
          propertyCount: attomResult.property.length,
          source: 'ATTOM Data (Commercial & Residential)',
          responseTime: responseTime,
          message: `Found ${attomResult.property.length} properties using ATTOM Data.`,
        };
      } else {
        console.log(
          `⚠️ ATTOM: No results or error - ${attomResult?.error || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.log(`❌ ATTOM API error: ${error.message}`);
    }

    // Step 3: Try RentCast for residential properties
    if (this.isResidentialQuery(query)) {
      console.log(`\n🏠 Step 3: Trying RentCast for residential rental data...`);

      try {
        const fullAddress = this.constructFullAddress(address, city, state, zipCode);
        const rentcastResult = await this.rentcastClient.getPropertyDetails(fullAddress);

        if (rentcastResult && !rentcastResult.error) {
          const toolEndTime = Date.now();
          const responseTime = ((toolEndTime - toolStartTime) / 1000).toFixed(2);

          console.log(`✅ RentCast search successful!`);
          console.log(`⏱️ Total response time: ${responseTime}s`);
          console.log(`🏠 ===== SMART PROPERTY SEARCH COMPLETED =====\n`);

          return {
            success: true,
            properties: [rentcastResult],
            propertyCount: 1,
            source: 'RentCast (Residential)',
            responseTime: responseTime,
            message: 'Found residential property data using RentCast.',
          };
        } else {
          console.log(`⚠️ RentCast: ${rentcastResult?.error || 'No results'}`);
        }
      } catch (error) {
        console.log(`❌ RentCast API error: ${error.message}`);
      }
    }

    // Step 4: Fallback to web search
    console.log(`\n🌐 Step 4: Falling back to web search...`);

    try {
      const searchQuery = this.constructWebSearchQuery(query, address, city, state, zipCode);
      const webResult = await this.tavilyClient.searchWeb(searchQuery);

      if (webResult && !webResult.error && webResult.results.length > 0) {
        const toolEndTime = Date.now();
        const responseTime = ((toolEndTime - toolStartTime) / 1000).toFixed(2);

        console.log(`✅ Web search successful! Found ${webResult.results.length} results`);
        console.log(`⏱️ Total response time: ${responseTime}s`);
        console.log(`🏠 ===== SMART PROPERTY SEARCH COMPLETED =====\n`);

        return {
          success: true,
          webResults: webResult.results,
          resultCount: webResult.results.length,
          source: 'Web Search',
          responseTime: responseTime,
          message: `Found ${webResult.results.length} web results about the property.`,
          answer: webResult.answer,
        };
      }
    } catch (error) {
      console.log(`❌ Web search error: ${error.message}`);
    }

    // All methods failed
    const toolEndTime = Date.now();
    const responseTime = ((toolEndTime - toolStartTime) / 1000).toFixed(2);

    console.log(`❌ All search methods failed`);
    console.log(`⏱️ Total response time: ${responseTime}s`);
    console.log(`🏠 ===== SMART PROPERTY SEARCH COMPLETED =====\n`);

    return {
      success: false,
      error: 'Unable to find property information using any available data source.',
      responseTime: responseTime,
      message: 'Sorry, I could not find information about that property. Please try with a more specific address or check if the address is correct.',
    };
  }

  // Generate ATTOM API parameters using LLM
  async generateAttomParameters(query, address, city, state, zipCode) {
    const params = {};

    if (address) {
      params.address = address;
    }
    if (city && state) {
      params.city = city;
      params.state = state;
    }
    if (zipCode) {
      params.zipCode = zipCode;
    }

    return await this.queryOptimizer.optimizeAttomPropertyParams(
      'Property Search',
      params,
      query,
      `Property search for: ${address || ''} ${city || ''} ${state || ''} ${zipCode || ''}`
    );
  }

  // Search ATTOM properties with error handling
  async searchAttomProperties(endpoint, params) {
    return await this.attomClient.callAttomAPI(endpoint, params);
  }

  // Check if query is residential-focused
  isResidentialQuery(query) {
    const residentialKeywords = [
      'rent', 'rental', 'apartment', 'condo', 'house', 'residential',
      'bedroom', 'bathroom', 'tenant', 'lease', 'monthly'
    ];

    const lowerQuery = query.toLowerCase();
    return residentialKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  // Construct full address string
  constructFullAddress(address, city, state, zipCode) {
    const parts = [];
    if (address) parts.push(address);
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (zipCode) parts.push(zipCode);
    return parts.join(', ');
  }

  // Construct web search query
  constructWebSearchQuery(query, address, city, state, zipCode) {
    const locationParts = [];
    if (address) locationParts.push(address);
    if (city) locationParts.push(city);
    if (state) locationParts.push(state);
    if (zipCode) locationParts.push(zipCode);

    const location = locationParts.join(' ');
    return `${query} ${location} property real estate`.trim();
  }
}

export { SmartPropertySearch };