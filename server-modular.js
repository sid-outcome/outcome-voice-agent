/**
 * Modular Server Entry Point
 * Drop-in replacement for the original server.js
 */
import { main } from './src/server.js';

// Start the modular server
main().catch(error => {
  console.error('❌ Modular server startup error:', error);
  process.exit(1);
});