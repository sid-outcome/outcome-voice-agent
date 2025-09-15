/**
 * Tool Registry - Central registry for all tools (SMS and Voice)
 */
import { outcomeToolsSMS } from './sms/outcome-tools.js';
import { attomToolsSMS } from './sms/attom-tools.js';
import { rentcastToolsSMS } from './sms/rentcast-tools.js';
import { webToolsSMS } from './sms/web-tools.js';

class ToolRegistry {
  constructor() {
    this.smsTools = new Map();
    this.voiceTools = new Map();
    this.initialized = false;
  }

  // Initialize all tool registries
  initialize() {
    if (this.initialized) {
      return;
    }

    console.log('🛠️ Initializing tool registry...');

    // Register SMS tools
    this.registerSMSTools();

    // TODO: Register voice tools when needed
    // this.registerVoiceTools();

    this.initialized = true;
    console.log('✅ Tool registry initialized');
    this.printToolSummary();
  }

  // Register all SMS tools
  registerSMSTools() {
    // Outcome workspace tools
    outcomeToolsSMS.forEach(tool => {
      this.smsTools.set(tool.name, tool);
    });

    // ATTOM property tools
    attomToolsSMS.forEach(tool => {
      this.smsTools.set(tool.name, tool);
    });

    // RentCast rental tools
    rentcastToolsSMS.forEach(tool => {
      this.smsTools.set(tool.name, tool);
    });

    // Web search tools
    webToolsSMS.forEach(tool => {
      this.smsTools.set(tool.name, tool);
    });
  }

  // Get all SMS tools as array (already deduplicated by Map)
  getAllSMSTools() {
    // Map already handles deduplication by key (tool name)
    return Array.from(this.smsTools.values());
  }

  // Get SMS tools by category
  getSMSToolsByCategory(category) {
    const allTools = this.getAllSMSTools();

    switch (category) {
      case 'outcome':
        return allTools.filter(tool => tool.name.includes('outcome') || tool.name.includes('smart_data'));
      case 'property':
        return allTools.filter(tool => tool.name.includes('attom') || tool.name.includes('property'));
      case 'rental':
        return allTools.filter(tool => tool.name.includes('rentcast'));
      case 'web':
        return allTools.filter(tool => tool.name.includes('web'));
      default:
        return allTools;
    }
  }

  // Get business intelligence tools (for BusinessAgent) - ONLY user's workspace data
  getBusinessTools() {
    const tools = this.getSMSToolsByCategory('outcome');
    return this.deduplicateTools(tools);
  }

  // Get real estate tools (for RealEstateAgent) - ONLY external property data
  getRealEstateTools() {
    const tools = this.getSMSToolsByCategory('property').concat(
      this.getSMSToolsByCategory('rental')
    );
    return this.deduplicateTools(tools);
  }

  // Get general tools (for GeneralAgent) - ONLY web search and general queries
  getGeneralTools() {
    const tools = this.getSMSToolsByCategory('web');
    return this.deduplicateTools(tools);
  }

  // Deduplicate tools by name
  deduplicateTools(tools) {
    const seen = new Set();
    const deduplicated = [];

    for (const tool of tools) {
      if (!seen.has(tool.name)) {
        seen.add(tool.name);
        deduplicated.push(tool);
      }
    }

    return deduplicated;
  }

  // Get tool by name
  getTool(toolName) {
    return this.smsTools.get(toolName) || this.voiceTools.get(toolName);
  }

  // Check if tool exists
  hasTool(toolName) {
    return this.smsTools.has(toolName) || this.voiceTools.has(toolName);
  }

  // Print tool summary
  printToolSummary() {
    console.log('📋 Tool Summary:');
    console.log(`   SMS Tools: ${this.smsTools.size}`);
    console.log(`   Voice Tools: ${this.voiceTools.size}`);
    console.log('');
    console.log('📱 SMS Tool Categories:');
    console.log(`   - Outcome Workspace: ${this.getSMSToolsByCategory('outcome').length} tools`);
    console.log(`   - Property Data: ${this.getSMSToolsByCategory('property').length} tools`);
    console.log(`   - Rental Data: ${this.getSMSToolsByCategory('rental').length} tools`);
    console.log(`   - Web Search: ${this.getSMSToolsByCategory('web').length} tools`);
  }

  // Health check
  healthCheck() {
    const health = {
      initialized: this.initialized,
      smsToolCount: this.smsTools.size,
      voiceToolCount: this.voiceTools.size,
      totalTools: this.smsTools.size + this.voiceTools.size,
      categories: {
        outcome: this.getSMSToolsByCategory('outcome').length,
        property: this.getSMSToolsByCategory('property').length,
        rental: this.getSMSToolsByCategory('rental').length,
        web: this.getSMSToolsByCategory('web').length,
      },
      timestamp: new Date().toISOString(),
    };

    console.log('🛠️ Tool registry health:', health);
    return health;
  }
}

// Export singleton instance
const toolRegistry = new ToolRegistry();

export { toolRegistry, ToolRegistry };
export default toolRegistry;