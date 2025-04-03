#!/usr/bin/env node

/**
 * Bootstrap file for the AgentForce Reliable Server
 * This file handles loading the appropriate server implementation
 */
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

async function main() {
  try {
    console.log(`${colors.blue}AgentForce Reliable Server${colors.reset}`);
    
    // Process command line arguments
    const isConfigureCommand = process.argv.includes('configure');
    const isDirectMode = process.argv.includes('--direct');
    const isHttpMode = process.argv.includes('--http');
    
    if (isConfigureCommand) {
      console.log(`${colors.blue}Running configuration wizard...${colors.reset}`);
      // Import and run the configuration script
      const configurePath = join(__dirname, 'configure.js');
      try {
        const configureModule = await import(configurePath);
        if (typeof configureModule.default === 'function') {
          await configureModule.default();
        } else {
          console.error(`${colors.red}Configuration module does not export a default function${colors.reset}`);
          process.exit(1);
        }
      } catch (error) {
        console.error(`${colors.red}Error running configuration:${colors.reset}`, error);
        process.exit(1);
      }
    } else if (isDirectMode) {
      // Direct mode (no MCP SDK dependency)
      console.log(`${colors.blue}Starting in direct mode...${colors.reset}`);
      const directServerPath = join(__dirname, 'direct-server.js');
      try {
        await import(directServerPath);
      } catch (error) {
        console.error(`${colors.red}Error starting direct server:${colors.reset}`, error);
        process.exit(1);
      }
    } else {
      // Standard mode with fallback
      console.log(`${colors.blue}Starting server in ${isHttpMode ? 'HTTP' : 'standard'} mode...${colors.reset}`);
      
      // Launch direct server as fallback
      const directServerPath = join(__dirname, 'direct-server.js');
      
      try {
        await import(directServerPath);
      } catch (error) {
        console.error(`${colors.red}Server failed to start:${colors.reset}`, error);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`${colors.red}Bootstrap error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Execute main function
main();