#!/usr/bin/env node

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createInterface } from 'readline';
import { randomBytes } from 'crypto';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

// Configuration constants
const CONFIG_DIR = join(homedir(), '.agentforce-mcp-server');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

// Default configuration
const defaultConfig = {
  server: {
    port: 3001,
    name: 'agentforce-reliable-server',
    version: '1.0.0',
    env: 'production',
    apiKey: randomBytes(32).toString('hex')
  }
};

// Create a readline interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt helper function
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Main configuration function
async function configureServer() {
  console.log(`${colors.blue}============================================${colors.reset}`);
  console.log(`${colors.blue}  AgentForce Reliable Server Configuration  ${colors.reset}`);
  console.log(`${colors.blue}============================================${colors.reset}`);
  console.log('');
  
  // Create config directory if it doesn't exist
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    console.error(`${colors.red}Error creating config directory:${colors.reset}`, error.message);
  }
  
  // Load existing config if available
  let config = { ...defaultConfig };
  try {
    const existingConfig = await fs.readFile(CONFIG_PATH, 'utf8');
    config = JSON.parse(existingConfig);
    console.log(`${colors.green}Loaded existing configuration.${colors.reset}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`${colors.red}Error loading existing config:${colors.reset}`, error.message);
    } else {
      console.log(`${colors.yellow}No existing configuration found. Creating new config.${colors.reset}`);
    }
  }
  
  console.log('');
  console.log(`${colors.yellow}Enter your server configuration details:${colors.reset}`);
  console.log('(Press Enter to keep existing values in brackets)');
  console.log('');
  
  // Collect configuration details
  const port = await prompt(`Server Port ${config.server?.port ? `[${config.server.port}]` : '[3001]'}: `);
  config.server = config.server || {};
  config.server.port = port ? parseInt(port, 10) : (config.server.port || 3001);
  
  const generateNewKey = await prompt(`Generate a new API key? (current: ${config.server.apiKey ? `${config.server.apiKey.substring(0, 8)}...` : 'none'}) (y/n) [n]: `);
  if (generateNewKey.toLowerCase() === 'y') {
    config.server.apiKey = randomBytes(32).toString('hex');
    console.log(`${colors.green}New API key generated.${colors.reset}`);
  } else if (!config.server.apiKey) {
    config.server.apiKey = defaultConfig.server.apiKey;
    console.log(`${colors.green}Default API key generated.${colors.reset}`);
  }
  
  // Environment setting
  const env = await prompt(`Environment (production, development) ${config.server.env ? `[${config.server.env}]` : '[production]'}: `);
  config.server.env = env || config.server.env || 'production';
  
  // Names and versions
  config.server.name = config.server.name || 'agentforce-reliable-server';
  config.server.version = config.server.version || '1.0.0';
  
  // Save the configuration
  try {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    console.log('');
    console.log(`${colors.green}Configuration saved successfully to ${CONFIG_PATH}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error saving configuration:${colors.reset}`, error.message);
  }
  
  // Setup instructions
  console.log('');
  console.log(`${colors.blue}Starting the Server:${colors.reset}`);
  console.log(`Start the server with (recommended):`);
  console.log(`${colors.green}npx agentforce-reliable-server --direct${colors.reset}`);
  console.log('');
  
  console.log(`${colors.blue}Server API Key:${colors.reset}`);
  console.log(`Your server API key is: ${colors.yellow}${config.server.apiKey}${colors.reset}`);
  console.log(`Use this key when configuring the AgentForce MCP Tool.`);
  console.log('');
  
  console.log(`${colors.blue}Next Steps:${colors.reset}`);
  console.log('1. Start the server with the command above');
  console.log('2. Install and configure the AgentForce MCP Tool:');
  console.log(`   ${colors.green}npx agentforce-mcp-tool@latest${colors.reset}`);
  console.log('3. When configuring the tool, use:');
  console.log(`   - Server URL: http://localhost:${config.server.port}`);
  console.log('   - API Key: (The key shown above)');
  console.log('');
  
  rl.close();
}

// Default export
export default configureServer;

// Run the configuration wizard if called directly
if (process.argv[1] === import.meta.url) {
  configureServer().catch(error => {
    console.error(`${colors.red}Configuration wizard error:${colors.reset}`, error);
    rl.close();
    process.exit(1);
  });
}