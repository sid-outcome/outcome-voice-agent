import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variables with validation and defaults
const config = {
  // Core API Keys
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  RENTCAST_API_KEY: process.env.RENTCAST_API_KEY,
  ATTOM_API_KEY: process.env.ATTOM_API_KEY,

  // Outcome Workspace API
  OUTCOME_API_KEY: process.env.OUTCOME_API_KEY,
  OUTCOME_API_URL: process.env.OUTCOME_API_URL,

  // SMS/Voice functionality
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,

  // Server configuration
  PORT: +(process.env.PORT || 5000),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // API URLs
  ATTOM_BASE_URL: 'https://api.gateway.attomdata.com/propertyapi/v1.0.0',
};

// Validation function - throws error instead of exiting process
function validateConfig() {
  const required = ['OPENAI_API_KEY', 'OUTCOME_API_KEY', 'OUTCOME_API_URL'];
  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}`;
    console.error('❌ ' + errorMessage);
    missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    // Throw error instead of process.exit for better testability
    throw new Error(errorMessage);
  }

  return true;
}

// Mask sensitive URLs for logging
function maskUrl(url) {
  if (!url) return 'NOT SET';
  try {
    const urlObj = new URL(url);
    // Show only the protocol and hostname, mask the rest
    return `${urlObj.protocol}//${urlObj.hostname}/***`;
  } catch {
    // If not a valid URL, just mask it
    return url.substring(0, 10) + '***';
  }
}

// Display configuration status
function displayConfig() {
  console.log('🔑 API Keys loaded:');
  console.log('  OpenAI API Key:', config.OPENAI_API_KEY ? 'SET' : 'NOT SET');
  console.log('  Tavily API Key:', config.TAVILY_API_KEY ? 'SET' : 'NOT SET');
  console.log('  RentCast API Key:', config.RENTCAST_API_KEY ? 'SET (Residential Only)' : 'NOT SET');
  console.log('  ATTOM API Key:', config.ATTOM_API_KEY ? 'SET (Commercial & Residential)' : 'NOT SET');
  console.log('  Outcome API Key:', config.OUTCOME_API_KEY ? 'SET' : 'NOT SET');
  console.log('  Outcome API URL:', maskUrl(config.OUTCOME_API_URL));
  console.log('\n📱 SMS Configuration:');
  console.log('  Twilio Account SID:', config.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');
  console.log('  Twilio Auth Token:', config.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET');
  console.log('  Twilio Phone Number:', config.TWILIO_PHONE_NUMBER ? 'SET' : 'NOT SET');
  console.log('  Memory Store: In-Memory (node-cache)');
  console.log('  SMS Functionality:',
    config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN ? 'ENABLED' : 'DISABLED (missing Twilio credentials)'
  );
}

// Don't validate on module import - let the application handle it
// This makes the module testable and reusable

export { config, validateConfig, displayConfig };
export default config;