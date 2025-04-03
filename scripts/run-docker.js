#!/usr/bin/env node

/**
 * Docker launcher script for AgentForce Reliable Server
 * Handles configuration and seamlessly starts the server in a Docker container
 */
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawn, execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

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

// Configuration constants
const CONFIG_DIR = join(homedir(), '.agentforce-mcp-server');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

// Check if Docker is installed
function checkDockerInstalled() {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if Docker image exists
function checkDockerImageExists() {
  try {
    const result = execSync('docker images -q agentforce-reliable-server').toString().trim();
    return result !== '';
  } catch (error) {
    return false;
  }
}

// Build Docker image
async function buildDockerImage() {
  console.log(`${colors.yellow}Docker image not found. Building image...${colors.reset}`);
  
  return new Promise((resolve, reject) => {
    const build = spawn('docker', ['build', '-t', 'agentforce-reliable-server', projectRoot], {
      stdio: 'inherit'
    });
    
    build.on('close', (code) => {
      if (code === 0) {
        console.log(`${colors.green}Docker image built successfully.${colors.reset}`);
        resolve();
      } else {
        console.error(`${colors.red}Docker image build failed with code ${code}.${colors.reset}`);
        reject(new Error(`Docker build failed with code ${code}`));
      }
    });
  });
}

// Run configuration if needed
async function runConfiguration() {
  console.log(`${colors.yellow}No configuration found. Running configuration wizard...${colors.reset}`);
  
  // Create config directory if it doesn't exist
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    console.error(`${colors.red}Error creating config directory:${colors.reset}`, error.message);
  }
  
  // Import and run the configuration script
  const configurePath = join(projectRoot, 'src', 'configure.js');
  try {
    const configureModule = await import(configurePath);
    if (typeof configureModule.default === 'function') {
      await configureModule.default();
    } else {
      throw new Error('Configuration module does not export a default function');
    }
  } catch (error) {
    console.error(`${colors.red}Configuration failed:${colors.reset}`, error.message);
    throw error;
  }
}

// Run Docker container
async function runDockerContainer(serverPort) {
  console.log(`${colors.blue}Starting AgentForce Reliable Server in Docker container...${colors.reset}`);
  
  return new Promise((resolve, reject) => {
    const run = spawn('docker', [
      'run',
      '--rm',
      '-it',
      '-p', `${serverPort}:3000`,
      '-v', `${CONFIG_DIR}:/root/.agentforce-mcp-server`,
      '--name', 'agentforce-reliable-server',
      'agentforce-reliable-server'
    ], {
      stdio: 'inherit'
    });
    
    run.on('close', (code) => {
      if (code === 0 || code === null) {
        console.log(`${colors.green}Server stopped.${colors.reset}`);
        resolve();
      } else {
        console.error(`${colors.red}Server exited with code ${code}.${colors.reset}`);
        reject(new Error(`Docker run failed with code ${code}`));
      }
    });
  });
}

// Main function
async function main() {
  try {
    console.log(`${colors.blue}AgentForce Reliable Server - Docker Launcher${colors.reset}`);
    console.log('');
    
    // Check if Docker is installed
    if (!checkDockerInstalled()) {
      console.error(`${colors.red}Error: Docker is not installed or not in PATH${colors.reset}`);
      console.error('Please install Docker first: https://docs.docker.com/get-docker/');
      process.exit(1);
    }
    
    // Check if config exists, if not run configuration
    let config = { server: { port: 3000 } };
    try {
      const configData = await fs.readFile(CONFIG_PATH, 'utf8');
      config = JSON.parse(configData);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await runConfiguration();
        // Re-read the config after configuration
        const configData = await fs.readFile(CONFIG_PATH, 'utf8');
        config = JSON.parse(configData);
      } else {
        console.error(`${colors.red}Error loading configuration:${colors.reset}`, error.message);
        process.exit(1);
      }
    }
    
    // Get the configured port
    const serverPort = config.server?.port || 3000;
    
    // Check if Docker image exists, if not build it
    if (!checkDockerImageExists()) {
      await buildDockerImage();
    }
    
    // Run the Docker container
    await runDockerContainer(serverPort);
    
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Unexpected error:${colors.reset}`, error);
  process.exit(1);
});