/**
 * Conversation Memory System
 * Extracted from server.js lines 1480-1596
 */

class ConversationMemory {
  constructor(cache) {
    this.cache = cache;
  }

  getConversationHistory(phoneNumber, limit = 20) {
    const key = `sms:conversation:${phoneNumber}`;
    const messages = this.cache.get(key) || [];
    return messages.slice(-limit); // Get last N messages (most recent)
  }

  addMessage(phoneNumber, role, content, metadata = {}) {
    const key = `sms:conversation:${phoneNumber}`;
    const message = {
      role,
      content,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    let messages = this.cache.get(key) || [];
    messages.push(message);

    // Keep only last 50 messages per conversation
    if (messages.length > 50) {
      messages = messages.slice(-50);
    }

    this.cache.set(key, messages);
  }

  getUserContext(phoneNumber) {
    const key = `sms:user_context:${phoneNumber}`;
    return this.cache.get(key) || null;
  }

  setUserContext(phoneNumber, context) {
    const key = `sms:user_context:${phoneNumber}`;
    this.cache.set(key, context);
  }

  clearConversation(phoneNumber) {
    const conversationKey = `sms:conversation:${phoneNumber}`;
    const contextKey = `sms:user_context:${phoneNumber}`;
    this.cache.del([conversationKey, contextKey]);
  }
}

// Enhanced Conversation Memory for tracking pending tasks
class EnhancedConversationMemory extends ConversationMemory {
  constructor(cache) {
    super(cache);
  }

  // Track pending fulfillment tasks
  setPendingTask(phoneNumber, task) {
    const key = `pending_task:${phoneNumber}`;
    this.cache.set(
      key,
      {
        ...task,
        createdAt: new Date().toISOString(),
        status: 'pending',
      },
      7200
    ); // 2 hours TTL
  }

  getPendingTask(phoneNumber) {
    const key = `pending_task:${phoneNumber}`;
    return this.cache.get(key) || null;
  }

  updatePendingTask(phoneNumber, updates) {
    const existing = this.getPendingTask(phoneNumber);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      const key = `pending_task:${phoneNumber}`;
      this.cache.set(key, updated, 7200);
      return updated;
    }
    return null;
  }

  clearPendingTask(phoneNumber) {
    const key = `pending_task:${phoneNumber}`;
    this.cache.del(key);
  }

  // Track missing data requirements
  setMissingData(phoneNumber, missingData) {
    const key = `missing_data:${phoneNumber}`;
    this.cache.set(
      key,
      {
        missing: missingData,
        timestamp: new Date().toISOString(),
      },
      7200
    );
  }

  getMissingData(phoneNumber) {
    const key = `missing_data:${phoneNumber}`;
    const data = this.cache.get(key);
    return data ? data.missing : [];
  }

  clearMissingData(phoneNumber) {
    const key = `missing_data:${phoneNumber}`;
    this.cache.del(key);
  }
}

export { ConversationMemory, EnhancedConversationMemory };