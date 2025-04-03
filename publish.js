#!/usr/bin/env node

/**
 * Script to prepare and publish the package to npm
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

// Get current file's directory (ES module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create readline interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

async function publish() {
  try {
    console.log(`${colors.blue}AgentForce Reliable Server NPM Publisher${colors.reset}`);
    console.log('');
    
    // Check npm login status
    try {
      const npmWhoami = execSync('npm whoami', { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
      console.log(`${colors.green}✓ Logged in to npm as: ${npmWhoami}${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}✗ Not logged in to npm${colors.reset}`);
      console.log('Please login to npm first:');
      console.log(`${colors.yellow}npm login${colors.reset}`);
      process.exit(1);
    }
    
    // Package scoping
    const wantScoped = await prompt('Do you want to publish as a scoped package? (y/n) [n]: ');
    
    if (wantScoped.toLowerCase() === 'y') {
      const scope = await prompt('Enter npm scope (without @): ');
      
      if (scope) {
        // Update package.json with scope
        const packagePath = join(__dirname, 'package.json');
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
        
        packageJson.name = `@${scope}/agentforce-reliable-server`;
        
        writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
        console.log(`${colors.green}✓ Updated package name to: ${packageJson.name}${colors.reset}`);
      }
    }
    
    // Build package
    console.log(`${colors.blue}Building package...${colors.reset}`);
    execSync('npm run build', { stdio: 'inherit' });
    
    // Create package
    console.log(`${colors.blue}Creating package...${colors.reset}`);
    execSync('npm pack', { stdio: 'inherit' });
    
    // Publish confirmation
    const confirmPublish = await prompt('Publish to npm registry? (y/n) [n]: ');
    
    if (confirmPublish.toLowerCase() === 'y') {
      console.log(`${colors.blue}Publishing to npm...${colors.reset}`);
      try {
        execSync('npm publish --access public', { stdio: 'inherit' });
        console.log(`${colors.green}✓ Package published successfully!${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}✗ Error publishing package:${colors.reset}`, error.message);
        process.exit(1);
      }
    } else {
      console.log(`${colors.yellow}Publication canceled${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Prompt helper function
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Run the script
publish();