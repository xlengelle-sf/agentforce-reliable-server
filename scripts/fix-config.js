#!/usr/bin/env node

/**
 * Configuration fixer for AgentForce Reliable Server
 * This script fixes malformed JSON configuration files
 */
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
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
    port: 3000,
    name: 'agentforce-reliable-server',
    version: '1.1.1',
    env: 'production',
    apiKey: randomBytes(32).toString('hex')
  }
};

async function fixConfiguration() {
  console.log(`${colors.blue}===========================================${colors.reset}`);
  console.log(`${colors.blue}  AgentForce Reliable Server Config Fixer  ${colors.reset}`);
  console.log(`${colors.blue}===========================================${colors.reset}`);
  console.log('');
  
  // Create config directory if it doesn't exist
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    console.log(`${colors.green}✓ Configuration directory verified${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error creating config directory:${colors.reset}`, error.message);
  }
  
  // Try to load existing config
  let config = { ...defaultConfig };
  let existingApiKey = null;
  
  try {
    const existingConfigData = await fs.readFile(CONFIG_PATH, 'utf8');
    try {
      // Try to parse existing config
      const existingConfig = JSON.parse(existingConfigData);
      console.log(`${colors.green}✓ Loaded existing configuration${colors.reset}`);
      
      // Save API key if it exists
      if (existingConfig.server && existingConfig.server.apiKey) {
        existingApiKey = existingConfig.server.apiKey;
        console.log(`${colors.green}✓ Preserved existing API key${colors.reset}`);
      }
      
      // Use existing port if available
      if (existingConfig.server && existingConfig.server.port) {
        config.server.port = existingConfig.server.port;
      }
    } catch (parseError) {
      console.log(`${colors.yellow}⚠ Existing configuration is malformed${colors.reset}`);
      console.log(`${colors.yellow}⚠ Creating new configuration file${colors.reset}`);
      
      // Try to extract API key using regex if JSON parsing failed
      const apiKeyMatch = existingConfigData.match(/"apiKey"\s*:\s*"([^"]+)"/);
      if (apiKeyMatch && apiKeyMatch[1]) {
        existingApiKey = apiKeyMatch[1];
        console.log(`${colors.green}✓ Extracted existing API key from malformed config${colors.reset}`);
      }
      
      // Try to extract port using regex
      const portMatch = existingConfigData.match(/"port"\s*:\s*(\d+)/);
      if (portMatch && portMatch[1]) {
        config.server.port = parseInt(portMatch[1], 10);
        console.log(`${colors.green}✓ Extracted existing port (${config.server.port}) from malformed config${colors.reset}`);
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`${colors.yellow}⚠ No existing configuration found${colors.reset}`);
      console.log(`${colors.yellow}⚠ Creating new configuration file${colors.reset}`);
    } else {
      console.error(`${colors.red}Error reading existing config:${colors.reset}`, error.message);
    }
  }
  
  // Use existing API key if found
  if (existingApiKey) {
    config.server.apiKey = existingApiKey;
  }
  
  // Create a backup of the existing config if it exists
  try {
    const existingConfig = await fs.readFile(CONFIG_PATH, 'utf8');
    const backupPath = `${CONFIG_PATH}.backup.${Date.now()}`;
    await fs.writeFile(backupPath, existingConfig, 'utf8');
    console.log(`${colors.green}✓ Created backup of existing config at ${backupPath}${colors.reset}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`${colors.red}Error creating backup:${colors.reset}`, error.message);
    }
  }
  
  // Save the fixed configuration
  try {
    // Ensure proper JSON formatting with indentation
    const formattedConfig = JSON.stringify(config, null, 2);
    await fs.writeFile(CONFIG_PATH, formattedConfig, 'utf8');
    console.log(`${colors.green}✓ Fixed configuration saved to ${CONFIG_PATH}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error saving configuration:${colors.reset}`, error.message);
  }
  
  console.log('');
  console.log(`${colors.blue}Configuration Summary:${colors.reset}`);
  console.log(`Server Port: ${config.server.port}`);
  console.log(`Server Name: ${config.server.name}`);
  console.log(`Server Version: ${config.server.version}`);
  console.log(`Environment: ${config.server.env}`);
  console.log(`API Key: ${config.server.apiKey.substring(0, 8)}...${config.server.apiKey.substring(config.server.apiKey.length - 8)}`);
  console.log('');
  
  console.log(`${colors.blue}Next Steps:${colors.reset}`);
  console.log('1. Start the server with:');
  console.log(`   ${colors.green}npx agentforce-reliable-server --direct${colors.reset}`);
  console.log('2. Configure the client tool with:');
  console.log(`   ${colors.green}npx agentforce-reliable-tool configure${colors.reset}`);
  console.log('');
}

// Run the fixer
fixConfiguration().catch(error => {
  console.error(`${colors.red}Configuration fixer error:${colors.reset}`, error);
});