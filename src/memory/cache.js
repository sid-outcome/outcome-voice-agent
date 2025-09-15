/**
 * Cache initialization for the voice agent
 * Using node-cache for in-memory storage
 */
import NodeCache from 'node-cache';
import { maskPhoneNumber } from '../utils/pii-masking.js';

// Initialize cache with optimized settings for production
const cache = new NodeCache({
  stdTTL: 7200, // 2 hours conversation TTL
  checkperiod: 600, // 10 minutes cleanup interval (reduced from 18 hours to prevent memory bloat)
  useClones: false, // Better performance
  deleteOnExpire: true, // Ensure expired keys are deleted
  maxKeys: 10000 // Limit total keys to prevent unbounded growth
});

// Add event listeners for debugging (with PII masking)
function maskCacheKey(key) {
  // Mask phone numbers in cache keys
  if (key && typeof key === 'string') {
    // Check if key contains a phone number pattern
    const phonePattern = /\+?\d{10,15}/g;
    if (phonePattern.test(key)) {
      return key.replace(phonePattern, (match) => maskPhoneNumber(match));
    }
  }
  return key;
}

cache.on('set', (key, value) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`💾 Cache SET: ${maskCacheKey(key)}`);
  }
});

cache.on('del', (key) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🗑️ Cache DEL: ${maskCacheKey(key)}`);
  }
});

cache.on('expired', (key, value) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`⏰ Cache EXPIRED: ${maskCacheKey(key)}`);
  }
});

export { cache };
export default cache;