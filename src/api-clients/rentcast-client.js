/**
 * RentCast API Client - Residential Property Rental Data
 * Extracted from server.js lines 6051-6150+
 */
import { withTimeout } from '../utils/timeout.js';

class RentCastAPIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  // Get property details
  async getPropertyDetails(address) {
    if (!this.apiKey) {
      return {
        error:
          'Rental data service is not available right now. Please contact support.',
      };
    }

    try {
      const url = `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(
        address
      )}`;
      console.log(`🏠 [RESIDENTIAL] Getting property details for: ${address}`);

      const response = await withTimeout(
        fetch(url, {
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }),
        2500,
        `RentCast property details`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          console.log(`✅ [RESIDENTIAL] Property details found`);
          return data[0];
        } else {
          console.log(`❌ No property found for address: ${address}`);
          return {
            error:
              "I couldn't find that property. Please check the address and try again.",
          };
        }
      }

      return { error: `RentCast API failed: ${response.statusText}` };
    } catch (error) {
      console.error(`❌ Property details error:`, error.message);
      return {
        error: "I couldn't get property details right now. Please try again.",
      };
    }
  }

  // Get rent estimate
  async getRentEstimate(address, options = {}, userQuery = '', context = '') {
    if (!this.apiKey) {
      return {
        error:
          'Rental data service is not available right now. Please contact support.',
      };
    }

    // Apply LLM optimization if available
    // Note: optimizeRentCastParams function would need to be imported if used
    const finalAddress = address;
    const finalOptions = { ...options };

    try {
      const queryParams = new URLSearchParams({ address: finalAddress });
      Object.entries(finalOptions).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });

      const url = `https://api.rentcast.io/v1/avm/rent/long-term?${queryParams.toString()}`;
      console.log(`🏠 [RESIDENTIAL] Getting rent estimate for: ${address}`);

      const response = await withTimeout(
        fetch(url, {
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }),
        2500,
        `RentCast rent estimate`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.rent) {
          console.log(
            `✅ [RESIDENTIAL] Rent estimate: $${data.rent}/month for ${address}`
          );
          return data;
        } else {
          console.log(`❌ No rent estimate available for: ${address}`);
          return {
            error:
              "I couldn't get a rent estimate for that property. This might be because it's not a residential rental property or the address needs to be more specific.",
          };
        }
      }

      return { error: `RentCast API failed: ${response.statusText}` };
    } catch (error) {
      console.error(`❌ Rent estimate error:`, error.message);
      return {
        error: "I couldn't get rent estimate right now. Please try again.",
      };
    }
  }
}

export { RentCastAPIClient };