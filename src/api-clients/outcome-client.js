/**
 * OutcomeAPIClient - Workspace API Integration
 * Extracted from server.js lines 88-329
 */
import { withTimeout } from '../utils/timeout.js';

class OutcomeAPIClient {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async makeRequest(
    endpoint,
    userId,
    organizationId,
    method = 'GET',
    body = null
  ) {
    const headers = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };

    // Add user context headers if available
    if (userId) {
      headers['X-User-Id'] = userId;
      headers['X-Voice-User-Id'] = userId; // Keep both for compatibility
    }
    if (organizationId) {
      headers['X-Organization-Id'] = organizationId;
    }

    console.log(`📡 Outcome API: ${method} ${this.baseUrl}${endpoint}`);

    try {
      const response = await withTimeout(
        fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        }),
        2500,
        `Outcome API ${method} ${endpoint}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `❌ Outcome API Error: ${response.status} ${response.statusText}`
        );
        return {
          error: `API Error: ${response.statusText}`,
          details: errorText,
        };
      }

      const responseData = await response.json();
      console.log(`✅ Outcome API Success: Retrieved data`);
      console.log(
        `📊 Response Summary: ${
          responseData.data
            ? `${
                Array.isArray(responseData.data)
                  ? responseData.data.length
                  : Object.keys(responseData.data).length
              } items`
            : 'data received'
        }`
      );
      return responseData;
    } catch (error) {
      console.error(`❌ Outcome API Request Failed:`, error.message);
      return { error: error.message };
    }
  }

  // User lookup by phone number
  async lookupUserByPhone(phoneNumber) {
    console.log(`🔍 === OUTCOME USER LOOKUP START ===`);
    console.log(`📞 Phone lookup initiated for: ${phoneNumber}`);

    // URL encode the phone number to handle the + sign properly
    const encodedPhone = encodeURIComponent(phoneNumber);
    const lookupUrl = `${this.baseUrl}/user/by-phone/${encodedPhone}`;
    console.log(`🌐 Making API request to: ${lookupUrl}`);

    const headers = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };

    console.log(`🔑 Request headers:`, {
      'X-API-Key': this.apiKey ? 'SET' : 'NOT SET',
      'Content-Type': 'application/json',
    });

    try {
      console.log(`📡 Making API request to Outcome...`);
      const response = await withTimeout(
        fetch(lookupUrl, {
          method: 'GET',
          headers,
        }),
        2500,
        `User lookup by phone ${phoneNumber}`
      );

      console.log(
        `📊 Response status: ${response.status} ${response.statusText}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ API Response successful`);
        console.log(`📄 Response received and parsed`);

        const user = data.data?.user || null;
        if (user) {
          console.log(`👤 User found!`);
        } else {
          console.log(`❌ No user found in response data`);
        }

        console.log(`🔍 === OUTCOME USER LOOKUP END ===`);

        if (user) {
          return {
            userId: user.id,
            organizationId: data.data.primaryOrganizationId,
            name: user.fullName,
            email: user.email,
            phoneNo: user.phoneNo,
          };
        } else {
          return null;
        }
      } else {
        console.log(
          `❌ API request failed: ${response.status} ${response.statusText}`
        );
        const errorText = await response.text();
        console.log(`📄 Error response:`, errorText);
        console.log(`🔍 === OUTCOME USER LOOKUP END ===`);
        return null;
      }
    } catch (error) {
      console.error(`❌ User lookup failed with exception:`, error.message);
      console.error(`📄 Error details:`, error);
      console.log(`🔍 === OUTCOME USER LOOKUP END ===`);
      return null;
    }
  }

  // Get user's outcomes
  async getUserOutcomes(userId, organizationId) {
    if (!organizationId) {
      return {
        error:
          'I need to identify your account first. Please contact support if this continues.',
      };
    }
    return this.makeRequest(
      `/outcomes/${organizationId}?limit=50&offset=0`,
      userId,
      organizationId
    );
  }

  // Get specific outcome
  async getOutcomeById(outcomeId, userId, organizationId) {
    if (!organizationId) {
      return {
        error:
          'I need to identify your account first. Please contact support if this continues.',
      };
    }
    return this.makeRequest(
      `/outcomes/${organizationId}/${outcomeId}`,
      userId,
      organizationId
    );
  }

  // Get chat history
  async getChatHistory(userId, organizationId, outcomeId) {
    if (!organizationId) {
      return {
        error:
          'I need to identify your account first. Please contact support if this continues.',
      };
    }
    const endpoint = outcomeId
      ? `/outcomes/${organizationId}/chat/history/${outcomeId}`
      : `/outcomes/${organizationId}/chat/list`;
    return this.makeRequest(endpoint, userId, organizationId);
  }

  // Get data tables
  async getDataTables(userId, organizationId, outcomeId) {
    if (!organizationId) {
      return {
        error:
          'I need to identify your account first. Please contact support if this continues.',
      };
    }
    if (!outcomeId) {
      return {
        error:
          "I need to know which project you're asking about. Please be more specific.",
      };
    }
    const endpoint = `/data-tables/${organizationId}/${outcomeId}`;
    return this.makeRequest(endpoint, userId, organizationId);
  }

  // Get workflows
  async getWorkflows(userId, organizationId, outcomeId) {
    if (!organizationId) {
      return {
        error:
          'I need to identify your account first. Please contact support if this continues.',
      };
    }
    const endpoint = outcomeId
      ? `/outcomes/${organizationId}/workflows?outcomeId=${outcomeId}`
      : `/outcomes/${organizationId}/workflows`;
    return this.makeRequest(endpoint, userId, organizationId);
  }

  // Get table data (actual records)
  async getTableData(userId, organizationId, tableId, limit = 100, offset = 0) {
    if (!organizationId) {
      return {
        error:
          'I need to identify your account first. Please contact support if this continues.',
      };
    }
    if (!tableId) {
      return {
        error:
          'I need to know which specific data you want. Please be more specific.',
      };
    }
    const endpoint = `/table-data/${organizationId}/${tableId}?limit=${limit}&offset=${offset}`;
    return this.makeRequest(endpoint, userId, organizationId);
  }
}

export { OutcomeAPIClient };