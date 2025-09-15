/**
 * SMS Tools for RentCast Rental Data API
 * Extracted from server.js SMS tool definitions
 */

const rentcastToolsSMS = [
  {
    name: 'rentcast_property_details_sms',
    description: `🏠 Get residential property details via SMS using RentCast API (Residential Only).

WHEN TO USE:
- Residential property details
- Rental market analysis (use rentcast_*_sms)
- Property specifications for homes/condos/apartments

WORKFLOW:
1. User asks about residential property
2. Check if they mean their own property → use smart_data_query_sms first
3. Call rentcast_property_details_sms with complete address

NOTE: RentCast is RESIDENTIAL ONLY. Use ATTOM for commercial properties.`,
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Complete residential property address',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'rentcast_rent_estimate_sms',
    description: `💰 Get residential rental price estimates via SMS using RentCast API.

WHEN TO USE:
- "What's the rent for [address]?"
- "Rental estimate for [address]"
- Property details (use rentcast_property_details_sms)

WORKFLOW:
1. User asks about rental prices
2. Check smart_data_query_sms for user's properties first
3. Call rentcast_rent_estimate_sms with enriched data

RentCast provides accurate rental estimates for residential properties.`,
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Complete residential property address',
        },
        propertyType: {
          type: 'string',
          description: 'Type of property (apartment, house, condo)',
          enum: ['apartment', 'house', 'condo', 'townhouse'],
        },
        bedrooms: {
          type: 'number',
          description: 'Number of bedrooms',
        },
        bathrooms: {
          type: 'number',
          description: 'Number of bathrooms',
        },
        squareFeet: {
          type: 'number',
          description: 'Square footage',
        },
      },
      required: ['address'],
    },
  },
];

export { rentcastToolsSMS };
export default rentcastToolsSMS;