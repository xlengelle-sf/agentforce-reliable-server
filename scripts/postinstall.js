#!/usr/bin/env node

console.log('\x1b[34m============================================\x1b[0m');
console.log('\x1b[34m  AgentForce Reliable Server Installation Complete \x1b[0m');
console.log('\x1b[34m============================================\x1b[0m');

console.log('\x1b[34mQuick Setup:\x1b[0m');
console.log('Run our configuration wizard to set up your server:');
console.log('\x1b[32mnpx agentforce-reliable-server configure\x1b[0m');

console.log('\x1b[33mManual Configuration:\x1b[0m');
console.log('Create a configuration file at: \x1b[32m~/.agentforce-mcp-server/config.json\x1b[0m');
console.log('With the following structure:');
console.log('\x1b[32m{');
console.log('  "server": {');
console.log('    "port": 3001,');
console.log('    "name": "agentforce-reliable-server",');
console.log('    "version": "1.0.0",');
console.log('    "apiKey": "your-secure-api-key-here"');
console.log('  }');
console.log('}\x1b[0m');

console.log('\x1b[34mStarting the Server:\x1b[0m');
console.log('Start the server with direct mode (recommended):');
console.log('\x1b[32mnpx agentforce-reliable-server --direct\x1b[0m');

console.log('\x1b[34mUsing with AgentForce MCP Tool:\x1b[0m');
console.log('1. Install the AgentForce MCP Tool:');
console.log('   \x1b[32mnpx agentforce-mcp-tool@latest\x1b[0m');
console.log('2. Configure the tool to connect to this server:');
console.log('   \x1b[32mnpx agentforce-mcp-tool configure\x1b[0m');
console.log('   (Use your server URL, e.g., http://localhost:3001)');

console.log('\x1b[34mFor more information, see the README.\x1b[0m');