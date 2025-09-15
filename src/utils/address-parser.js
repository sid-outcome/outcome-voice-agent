/**
 * Address parsing utility functions
 * Extracted from server.js lines 2569-2590
 */

/**
 * Extract address from a query string using regex pattern matching
 * @param {string} query - The query string to search for addresses
 * @returns {string|null} - The extracted address or null if not found
 */
function extractAddressFromQuery(query) {
  // Simple regex to extract addresses (can be enhanced)
  const addressPattern =
    /\d+\s+[A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Way|Lane|Ln|Ct|Court)\b/i;
  const match = query.match(addressPattern);
  return match ? match[0] : null;
}

/**
 * Extract location information (city, state, zip) from a query string
 * @param {string} query - The query string to search for location info
 * @returns {Object} - Object with city, state, and zipCode properties
 */
function extractLocationFromQuery(query) {
  const cityStatePattern = /([A-Za-z\s]+),\s*([A-Z]{2})\s*(\d{5})?/;
  const match = query.match(cityStatePattern);

  if (match) {
    return {
      city: match[1].trim(),
      state: match[2],
      zipCode: match[3] || null,
    };
  }

  return { city: null, state: null, zipCode: null };
}

export { extractAddressFromQuery, extractLocationFromQuery };