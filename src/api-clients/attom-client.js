/**
 * ATTOM API Client - Commercial & Residential Property Data
 * Extracted from server.js lines 5357-5647
 */
import { withTimeout } from '../utils/timeout.js';

class AttomAPIClient {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async callAttomAPI(endpoint, params = {}) {
    if (!this.apiKey) {
      return {
        error:
          'Property data service is not available right now. Please contact support.',
      };
    }

    try {
      // Convert camelCase to lowercase for ATTOM API compatibility
      const attomParams = {};
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Convert all camelCase parameter names to lowercase for ATTOM API
          const attomKey =
            key === 'postalCode'
              ? 'postalcode'
              : key === 'attomId'
              ? 'attomid'
              : key === 'propertyType'
              ? 'propertytype'
              : key === 'geoIdV4'
              ? 'geoidv4'
              : key.toLowerCase(); // Generic conversion for all other camelCase parameters
          attomParams[attomKey] = value;
        }
      });

      const queryParams = new URLSearchParams(attomParams);
      const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;

      console.log(`🏢 ATTOM API Call: ${endpoint}`);
      console.log(`   Parameters:`, attomParams);

      const response = await withTimeout(
        fetch(url, {
          headers: {
            Accept: 'application/json',
            apikey: this.apiKey,
          },
        }),
        2500,
        `ATTOM API ${endpoint}`
      );

      if (response.ok) {
        const data = await response.json();

        // Check ATTOM's custom status codes
        if (data.status && data.status.code === 0) {
          console.log(`✅ ATTOM API Success: ${data.status.total || 0} results`);
          return data;
        } else if (data.status && data.status.code === 400) {
          console.log(`⚠️ ATTOM API: No results found - ${data.status.msg}`);
          return {
            error: `No property data found for the provided address. This could mean the property is not in the ATTOM database or the address format needs adjustment.`,
            noResults: true,
            details: data.status.msg,
          };
        } else {
          console.log(
            `❌ ATTOM API Error Code: ${data.status?.code} - ${data.status?.msg}`
          );
          return { error: `ATTOM API: ${data.status?.msg || 'Unknown error'}` };
        }
      }

      console.log(
        `❌ ATTOM API HTTP Error: ${response.status} ${response.statusText}`
      );
      return { error: `ATTOM API failed: ${response.statusText}` };
    } catch (error) {
      console.error(`❌ ATTOM API Error:`, error.message);
      return { error: `Failed to call ATTOM API: ${error.message}` };
    }
  }

  // ATTOM Property Detail (Commercial & Residential)
  async getAttomPropertyDetail(params, userQuery = '', context = '') {
    // Apply LLM optimization if available
    // Note: optimizeAttomPropertyParams function would need to be imported if used

    // Try snapshot first (more reliable), then detail
    let result = await this.callAttomAPI('/property/snapshot', params);
    if (result.error || result.noResults) {
      console.log('🔍 Trying detail endpoint as fallback...');
      result = await this.callAttomAPI('/property/detail', params);
    }
    return result;
  }

  // ATTOM Property Assessment
  async getAttomPropertyAssessment(params, userQuery = '', context = '') {
    return this.callAttomAPI('/property/assessment', params);
  }

  // ATTOM AVM (Automated Valuation Model)
  async getAttomAVM(params, userQuery = '', context = '') {
    return this.callAttomAPI('/avm', params);
  }

  // ATTOM Sales History
  async getAttomSalesHistory(params, userQuery = '', context = '') {
    return this.callAttomAPI('/saleshistory/snapshot', params);
  }

  // ATTOM Market Trends
  async getAttomMarketTrends(params, userQuery = '', context = '') {
    return this.callAttomAPI('/market/snapshot', params);
  }
}

export { AttomAPIClient };