#!/usr/bin/env node

/**
 * Simple CLI Test Interface for SMS Voice Agent
 *
 * This provides a command-line interface to test the actual SMS processing
 * pipeline by directly calling the SMS processor without needing Twilio.
 */

import readline from 'readline';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Import the actual SMS processing components
import { globalState } from './src/state/global-state.js';
import { config } from './src/config/index.js';

// Load environment variables
dotenv.config();

// ANSI color codes for better CLI experience
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m',
};

// Global state for the SMS agent system
let globalStateManager = null;
let testPhoneNumber = '+13126872770'; // Test phone number

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `${colors.cyan}You > ${colors.reset}`,
});

// Process message using the actual SMS pipeline
async function processMessage(message) {
  try {
    if (!globalStateManager) {
      console.log(
        `${colors.red}❌ Global state not initialized${colors.reset}`
      );
      return 'System error: Agent not initialized';
    }

    // Get the SMS processor from global state
    const smsProcessor = globalStateManager.smsProcessor;
    if (!smsProcessor) {
      console.log(`${colors.red}❌ SMS processor not available${colors.reset}`);
      return 'System error: SMS processor not available';
    }

    console.log(
      `${colors.dim}📱 Processing via actual SMS pipeline...${colors.reset}`
    );

    // Create a mock SMS event similar to what Twilio would send
    const mockSMSEvent = {
      From: testPhoneNumber,
      To: '+15551230001', // Mock Twilio number
      Body: message,
    };

    // Process the message through the actual SMS pipeline
    // This will trigger user lookup, routing, agent processing, and tool execution
    const result = await smsProcessor.process(
      testPhoneNumber,    // fromNumber (sender's phone)
      '+15551230001',     // toNumber (recipient's phone)
      message,            // messageBody (the actual message text)
      null,               // twilioClient (not needed for testing)
      testPhoneNumber     // fromPhoneNumber (same as fromNumber)
    );

    return result || 'Message processed successfully';
  } catch (error) {
    console.error(
      `${colors.red}Error processing SMS:${colors.reset}`,
      error.message
    );
    return `Error: ${error.message}`;
  }
}

// Display help
function showHelp() {
  console.log(
    `${colors.bright}${colors.cyan}Available Commands:${colors.reset}`
  );
  console.log(
    `  ${colors.yellow}/help${colors.reset}     - Show this help message`
  );
  console.log(
    `  ${colors.yellow}/phone${colors.reset}    - Change test phone number`
  );
  console.log(
    `  ${colors.yellow}/status${colors.reset}   - Show system status`
  );
  console.log(`  ${colors.yellow}/exit${colors.reset}     - Exit the CLI`);
  console.log();
  console.log(
    `${colors.dim}Type any message to test the SMS pipeline${colors.reset}`
  );
  console.log(`${colors.dim}Examples:${colors.reset}`);
  console.log(
    `  ${colors.dim}- "tell me about my property performance"${colors.reset}`
  );
  console.log(
    `  ${colors.dim}- "search for real estate trends in Chicago"${colors.reset}`
  );
  console.log(`  ${colors.dim}- "what data do I have?"${colors.reset}`);
  console.log();
}

// Handle user input
async function handleInput(input) {
  // Handle commands
  if (input.startsWith('/')) {
    const command = input.toLowerCase().trim();

    switch (command) {
      case '/help':
        showHelp();
        break;

      case '/phone':
        console.log(
          `${colors.yellow}Current test phone number: ${testPhoneNumber}${colors.reset}`
        );
        console.log(
          `${colors.dim}Enter new phone number (or press Enter to keep current):${colors.reset}`
        );
        const newPhone = await new Promise(resolve => {
          rl.question('Phone: ', resolve);
        });
        if (newPhone.trim()) {
          testPhoneNumber = newPhone.trim();
          console.log(
            `${colors.green}✅ Phone number updated to: ${testPhoneNumber}${colors.reset}\n`
          );
        } else {
          console.log(`${colors.dim}Phone number unchanged${colors.reset}\n`);
        }
        break;

      case '/status':
        console.log(
          `${colors.bright}${colors.cyan}System Status:${colors.reset}`
        );
        console.log(
          `  ${colors.yellow}Global State:${colors.reset} ${
            globalStateManager ? '✅ Initialized' : '❌ Not initialized'
          }`
        );
        console.log(
          `  ${colors.yellow}Test Phone:${colors.reset} ${testPhoneNumber}`
        );
        if (globalStateManager) {
          console.log(
            `  ${colors.yellow}SMS Processor:${colors.reset} ${
              globalStateManager.smsProcessor
                ? '✅ Available'
                : '❌ Not available'
            }`
          );
          console.log(
            `  ${colors.yellow}Agents:${colors.reset} ${
              globalStateManager.agents ? '✅ Available' : '❌ Not available'
            }`
          );
        }
        console.log();
        break;

      case '/exit':
      case '/quit':
        console.log(`${colors.bright}${colors.cyan}👋 Goodbye!${colors.reset}`);
        process.exit(0);

      default:
        console.log(
          `${colors.red}❌ Unknown command: ${command}${colors.reset}`
        );
        console.log(
          `${colors.dim}Type /help for available commands${colors.reset}\n`
        );
    }
  } else {
    // Process as SMS message through the actual pipeline
    console.log(`${colors.dim}📱 Testing SMS pipeline...${colors.reset}`);

    try {
      // Process message through the actual SMS system
      const response = await processMessage(input);

      // Display response
      console.log(`${colors.green}📱 SMS Response:${colors.reset} ${response}`);
      console.log();
    } catch (error) {
      console.error(`${colors.red}❌ Error:${colors.reset}`, error.message);
      console.log();
    }
  }
}

// Main CLI loop
rl.on('line', async line => {
  const input = line.trim();

  if (!input) {
    rl.prompt();
    return;
  }

  await handleInput(input);
  rl.prompt();
});

// Handle close
rl.on('close', () => {
  console.log(`\n${colors.bright}${colors.cyan}👋 Goodbye!${colors.reset}`);
  process.exit(0);
});

// Start the CLI
async function start() {
  console.log(
    `${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`
  );
  console.log(
    `${colors.bright}${colors.cyan}   SMS Voice Agent Test CLI${colors.reset}`
  );
  console.log(
    `${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`
  );
  console.log();

  // Check configuration
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      `${colors.red}❌ OPENAI_API_KEY is not configured in .env file${colors.reset}`
    );
    console.log(
      `${colors.dim}Please add OPENAI_API_KEY to your .env file${colors.reset}\n`
    );
    process.exit(1);
  }

  console.log(`${colors.dim}Configuration:${colors.reset}`);
  console.log(`  ${colors.yellow}🔑 OpenAI API:${colors.reset} ✅ Configured`);
  console.log(
    `  ${colors.yellow}📱 Mode:${colors.reset} CLI testing the actual SMS pipeline`
  );
  console.log(
    `  ${colors.yellow}🧪 Test Phone:${colors.reset} ${testPhoneNumber}`
  );
  console.log();

  // Initialize the SMS agent system
  console.log(`${colors.dim}Initializing SMS agent system...${colors.reset}`);
  try {
    globalStateManager = await globalState.initialize(config);
    console.log(
      `${colors.green}✅ SMS agent system initialized${colors.reset}`
    );
  } catch (error) {
    console.error(
      `${colors.red}❌ Failed to initialize SMS agent system:${colors.reset}`,
      error.message
    );
    console.log(
      `${colors.dim}Make sure all environment variables are configured properly${colors.reset}\n`
    );
    process.exit(1);
  }

  console.log(
    `${colors.bright}${colors.green}✨ Ready! Type your message or /help for commands${colors.reset}`
  );
  console.log(
    `${colors.dim}────────────────────────────────────────────────────────${colors.reset}\n`
  );

  showHelp();

  rl.prompt();
}

// Start the application
start().catch(error => {
  console.error(`${colors.red}❌ Failed to start CLI:${colors.reset}`, error);
  process.exit(1);
});
