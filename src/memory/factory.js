/**
 * Memory Factory - Dependency Injection for Memory System
 * Creates and wires memory components with proper dependencies
 */
import { cache } from './cache.js';
import { ConversationMemory, EnhancedConversationMemory } from './conversation-memory.js';

class MemoryFactory {
  constructor() {
    this.cache = null;
    this.conversationMemory = null;
  }

  // Initialize all memory components with dependency injection
  initialize() {
    console.log('🧠 Initializing memory system...');

    // Initialize cache first
    this.cache = cache;

    // Initialize conversation memory with cache
    this.conversationMemory = new EnhancedConversationMemory(this.cache);


    console.log('✅ Memory system initialized with:');
    console.log('   - In-memory cache (node-cache)');
    console.log('   - Enhanced conversation memory');

    return {
      cache: this.cache,
      conversationMemory: this.conversationMemory,
    };
  }

  // Get cache instance
  getCache() {
    return this.cache || cache;
  }

  // Get conversation memory instance
  getConversationMemory() {
    if (!this.conversationMemory) {
      this.conversationMemory = new EnhancedConversationMemory(this.getCache());
    }
    return this.conversationMemory;
  }


  // Health check for memory system
  healthCheck() {
    const stats = {
      cache: {
        keys: this.getCache().keys().length,
        stats: this.getCache().getStats(),
      },
      timestamp: new Date().toISOString(),
    };

    console.log('🩺 Memory system health:', stats);
    return stats;
  }
}

// Export singleton instance
const memoryFactory = new MemoryFactory();

export { memoryFactory, MemoryFactory };
export default memoryFactory;