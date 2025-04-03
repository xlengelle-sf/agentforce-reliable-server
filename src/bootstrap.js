#!/usr/bin/env node

/**
 * Bootstrap file for the AgentForce Reliable Server
 * This file handles loading the appropriate server implementation
 */
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

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
    let isDirectMode = process.argv.includes('--direct');
    const isHttpMode = process.argv.includes('--http');
    const isDockerMode = process.argv.includes('start:docker');
    const isFixConfigMode = process.argv.includes('fix');
    const isFixStartMode = process.argv.includes('fix:start');
    
    // Check if Fix Config mode is requested
    if (isFixConfigMode || isFixStartMode) {
      // Run the fix config script
      const fixConfigScriptPath = join(projectRoot, 'scripts', 'fix-config.js');
      if (existsSync(fixConfigScriptPath)) {
        try {
          await import(fixConfigScriptPath);
          
          // If it's just fix mode, exit after fixing
          if (isFixConfigMode && !isFixStartMode) {
            process.exit(0);
          }
          
          // If it's fix:start mode, continue to direct mode
          if (isFixStartMode) {
            console.log(`${colors.blue}Configuration fixed, starting server in direct mode...${colors.reset}`);
            isDirectMode = true;
          }
        } catch (error) {
          console.error(`${colors.red}Error running configuration fix script:${colors.reset}`, error);
          process.exit(1);
        }
      } else {
        console.error(`${colors.red}Fix config script not found at ${fixConfigScriptPath}${colors.reset}`);
        process.exit(1);
      }
    }
    
    // Check if Docker mode is requested
    if (isDockerMode) {
      // Run the Docker startup script
      const dockerScriptPath = join(projectRoot, 'scripts', 'run-docker.js');
      if (existsSync(dockerScriptPath)) {
        try {
          const dockerModule = await import(dockerScriptPath);
          process.exit(0); // The Docker script will handle everything
        } catch (error) {
          console.error(`${colors.red}Error running Docker script:${colors.reset}`, error);
          process.exit(1);
        }
      } else {
        console.error(`${colors.red}Docker script not found at ${dockerScriptPath}${colors.reset}`);
        process.exit(1);
      }
    }
    
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