#!/usr/bin/env node

/**
 * Direct server implementation for AgentForce API
 * Independent of MCP SDK to avoid compatibility issues
 */
import express from 'express';
import { createServer } from 'http';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

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

// Content types enum (same as MCP SDK)
const ContentType = {
  Text: 'text',
  Binary: 'binary',
  JSON: 'json'
};

// AgentForce Service class to handle API interactions
class AgentForceService {
  constructor(config) {
    this.config = config;
    this.accessToken = null;
    this.instanceUrl = null;
    this.sessionId = null;
    this.currentSequenceId = 0;
    console.log(`${colors.green}AgentForce service created for agent ID: ${this.config.agentId}${colors.reset}`);
  }

  async authenticate() {
    try {
      console.log(`${colors.blue}Authenticating with Salesforce...${colors.reset}`);
      
      // Create form data
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);
      params.append('client_email', this.config.clientEmail);

      // Make request
      const response = await axios.post(
        `${this.config.sfBaseUrl}/services/oauth2/token`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Store tokens
      this.accessToken = response.data.access_token;
      this.instanceUrl = response.data.instance_url;

      console.log(`${colors.green}Authentication successful${colors.reset}`);

      return {
        accessToken: this.accessToken,
        instanceUrl: this.instanceUrl
      };
    } catch (error) {
      console.error(`${colors.red}Authentication failed:${colors.reset}`, error.message);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response:', error.response.data);
      }
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async createSession() {
    // Authenticate if we don't have a token
    if (!this.accessToken || !this.instanceUrl) {
      await this.authenticate();
    }

    try {
      console.log(`${colors.blue}Creating AgentForce session...${colors.reset}`);

      // Create session payload
      const sessionPayload = {
        externalSessionKey: uuidv4(),
        instanceConfig: {
          endpoint: this.instanceUrl
        },
        streamingCapabilities: {
          chunkTypes: ['Text']
        },
        bypassUser: true
      };

      // Make request
      const response = await axios.post(
        `${this.config.apiUrl}/einstein/ai-agent/v1/agents/${this.config.agentId}/sessions`,
        sessionPayload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Store session ID
      this.sessionId = response.data.sessionId;
      this.currentSequenceId = 0;

      console.log(`${colors.green}Session created successfully: ${this.sessionId}${colors.reset}`);

      return {
        sessionId: this.sessionId
      };
    } catch (error) {
      console.error(`${colors.red}Session creation failed:${colors.reset}`, error.message);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response:', error.response.data);
      }
      throw new Error(`Session creation failed: ${error.message}`);
    }
  }

  async sendMessage(message) {
    // Create session if we don't have one
    if (!this.sessionId) {
      await this.createSession();
    }

    // Authenticate if we don't have a token
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      // Increment sequence ID
      this.currentSequenceId++;
      
      console.log(`${colors.blue}Sending message to AgentForce (sequence ${this.currentSequenceId})...${colors.reset}`);

      // Create message payload
      const messagePayload = {
        message: {
          sequenceId: this.currentSequenceId,
          type: 'Text',
          text: message
        }
      };

      // Make request
      const response = await axios.post(
        `${this.config.apiUrl}/einstein/ai-agent/v1/sessions/${this.sessionId}/messages`,
        messagePayload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2-minute timeout
        }
      );

      // Extract response text
      let responseText = 'No response received';
      if (response.data.messages && response.data.messages.length > 0) {
        responseText = response.data.messages[0].message;
      }

      console.log(`${colors.green}Message sent successfully, received ${responseText.length} characters${colors.reset}`);

      return {
        text: responseText,
        sequenceId: this.currentSequenceId
      };
    } catch (error) {
      console.error(`${colors.red}Message sending failed:${colors.reset}`, error.message);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response:', error.response.data);
      }
      throw new Error(`Message sending failed: ${error.message}`);
    }
  }

  getStatus() {
    return {
      isAuthenticated: !!this.accessToken,
      hasSession: !!this.sessionId,
      sessionId: this.sessionId,
      sequenceId: this.currentSequenceId,
      clientEmail: this.config.clientEmail,
      agentId: this.config.agentId
    };
  }

  reset() {
    this.accessToken = null;
    this.instanceUrl = null;
    this.sessionId = null;
    this.currentSequenceId = 0;
    console.log(`${colors.green}AgentForce service reset${colors.reset}`);
  }
}

// Simple session store implementation
const sessions = new Map();

// Session store class
class SessionStore {
  getSession(clientId) {
    return sessions.get(clientId);
  }
  
  getOrCreateSession(clientId, config) {
    if (!sessions.has(clientId)) {
      sessions.set(clientId, new AgentForceService(config));
    }
    return sessions.get(clientId);
  }
  
  clearSession(clientId) {
    if (sessions.has(clientId)) {
      const service = sessions.get(clientId);
      service.reset();
      sessions.delete(clientId);
      return true;
    }
    return false;
  }
  
  clearAll() {
    sessions.forEach((service, clientId) => {
      service.reset();
    });
    sessions.clear();
    console.log('All sessions cleared');
  }
}

// Create a session store instance
const sessionStore = new SessionStore();

// Load configuration
async function loadConfig() {
  try {
    const configData = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error(`${colors.red}Error loading configuration:${colors.reset}`, error.message);
    console.error(`${colors.yellow}Please run 'npx agentforce-reliable-server configure' first${colors.reset}`);
    process.exit(1);
  }
}

// Start the server
async function startServer() {
  try {
    // Load configuration
    const config = await loadConfig();
    const port = process.env.PORT || config.server.port || 3000;
    
    console.log(`${colors.blue}Starting AgentForce Reliable Server...${colors.reset}`);
    console.log(`Server name: ${config.server.name}`);
    console.log(`Server version: ${config.server.version}`);
    console.log(`Environment: ${config.server.env}`);
    
    // Create Express app
    const app = express();
    app.use(express.json());
    
    // API Key middleware
    const apiKeyMiddleware = (req, res, next) => {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== config.server.apiKey) {
        return res.status(401).json({
          error: 'Unauthorized - Invalid API key'
        });
      }
      next();
    };
    
    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        name: config.server.name,
        version: config.server.version,
        status: 'running',
        mode: 'direct'
      });
    });
    
    // List resources endpoint
    app.get('/mcp/resources', apiKeyMiddleware, (req, res) => {
      res.json({
        resources: [
          {
            id: 'salesforce-agentforce',
            displayName: 'Salesforce AgentForce',
            description: 'Connect to Salesforce AgentForce AI',
            resourceType: 'api',
            actions: ['authenticate', 'create_session', 'send_message', 'get_status', 'reset']
          }
        ]
      });
    });
    
    // List tools endpoint
    app.get('/mcp/tools', apiKeyMiddleware, (req, res) => {
      res.json({
        tools: [
          {
            name: 'agentforce_authenticate',
            description: 'Authenticate with the AgentForce API',
            inputSchema: {
              type: 'object',
              properties: {
                clientId: { type: 'string' },
                config: {
                  type: 'object',
                  properties: {
                    sfBaseUrl: { type: 'string' },
                    apiUrl: { type: 'string' },
                    agentId: { type: 'string' },
                    clientId: { type: 'string' },
                    clientSecret: { type: 'string' },
                    clientEmail: { type: 'string' }
                  },
                  required: ['sfBaseUrl', 'apiUrl', 'agentId', 'clientId', 'clientSecret', 'clientEmail']
                }
              },
              required: ['clientId', 'config']
            }
          },
          {
            name: 'agentforce_create_session',
            description: 'Create a new session with the AgentForce agent',
            inputSchema: {
              type: 'object',
              properties: {
                clientId: { type: 'string' },
                config: {
                  type: 'object',
                  properties: {
                    sfBaseUrl: { type: 'string' },
                    apiUrl: { type: 'string' },
                    agentId: { type: 'string' },
                    clientId: { type: 'string' },
                    clientSecret: { type: 'string' },
                    clientEmail: { type: 'string' }
                  },
                  required: ['sfBaseUrl', 'apiUrl', 'agentId', 'clientId', 'clientSecret', 'clientEmail']
                }
              },
              required: ['clientId', 'config']
            }
          },
          {
            name: 'agentforce_send_message',
            description: 'Send a message to the AgentForce agent and get a response',
            inputSchema: {
              type: 'object',
              properties: {
                clientId: { type: 'string' },
                config: {
                  type: 'object',
                  properties: {
                    sfBaseUrl: { type: 'string' },
                    apiUrl: { type: 'string' },
                    agentId: { type: 'string' },
                    clientId: { type: 'string' },
                    clientSecret: { type: 'string' },
                    clientEmail: { type: 'string' }
                  },
                  required: ['sfBaseUrl', 'apiUrl', 'agentId', 'clientId', 'clientSecret', 'clientEmail']
                },
                message: { type: 'string' }
              },
              required: ['clientId', 'config', 'message']
            }
          },
          {
            name: 'agentforce_get_status',
            description: 'Get the current status of the AgentForce client connection',
            inputSchema: {
              type: 'object',
              properties: {
                clientId: { type: 'string' }
              },
              required: ['clientId']
            }
          },
          {
            name: 'agentforce_reset',
            description: 'Reset the AgentForce client connection',
            inputSchema: {
              type: 'object',
              properties: {
                clientId: { type: 'string' }
              },
              required: ['clientId']
            }
          }
        ]
      });
    });
    
    // Call tool endpoint
    app.post('/mcp/call-tool', apiKeyMiddleware, async (req, res) => {
      try {
        const { tool } = req.body;
        
        if (!tool || !tool.name || !tool.args) {
          return res.status(400).json({
            error: 'Invalid request format'
          });
        }
        
        const { name, args } = tool;
        
        console.log(`${colors.blue}Tool called: ${name}${colors.reset}`);
        
        let result;
        
        // Handle each tool
        switch (name) {
          case 'agentforce_authenticate':
            result = await handleAuthenticate(args);
            break;
          
          case 'agentforce_create_session':
            result = await handleCreateSession(args);
            break;
          
          case 'agentforce_send_message':
            result = await handleSendMessage(args);
            break;
          
          case 'agentforce_get_status':
            result = await handleGetStatus(args);
            break;
          
          case 'agentforce_reset':
            result = await handleReset(args);
            break;
          
          default:
            return res.status(400).json({
              error: `Unknown tool: ${name}`
            });
        }
        
        res.json({ result });
      } catch (error) {
        console.error(`${colors.red}Tool execution error:${colors.reset}`, error);
        
        res.status(500).json({
          result: {
            content: [{
              type: ContentType.Text,
              text: `Error: ${error.message}`
            }],
            error: {
              code: 'tool_execution_error',
              message: error.message
            }
          }
        });
      }
    });
    
    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    });
    
    // Start the server
    const server = createServer(app);
    
    server.listen(port, () => {
      console.log(`${colors.green}AgentForce Reliable Server running on port ${port}${colors.reset}`);
      console.log(`Server URL: http://localhost:${port}`);
      console.log(`API Key: ${config.server.apiKey.substring(0, 10)}...`);
      console.log('\nServer is ready to receive connections!');
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      sessionStore.clearAll();
      server.close(() => {
        console.log('Server shutdown complete');
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      console.log('Shutting down server...');
      sessionStore.clearAll();
      server.close(() => {
        console.log('Server shutdown complete');
        process.exit(0);
      });
    });
    
    // Tool handler functions
    
    async function handleAuthenticate(args) {
      const { clientId, config } = args;
      
      if (!clientId || !config) {
        throw new Error('Missing required parameters: clientId or config');
      }
      
      // Get or create session
      const service = sessionStore.getOrCreateSession(clientId, config);
      
      // Authenticate
      const result = await service.authenticate();
      
      return {
        content: [{
          type: ContentType.Text,
          text: `Successfully authenticated with Salesforce using email: ${config.clientEmail}`
        }],
        metadata: {
          instanceUrl: result.instanceUrl,
          tokenPreview: `${result.accessToken.substring(0, 10)}...`
        }
      };
    }
    
    async function handleCreateSession(args) {
      const { clientId, config } = args;
      
      if (!clientId || !config) {
        throw new Error('Missing required parameters: clientId or config');
      }
      
      // Get or create session
      const service = sessionStore.getOrCreateSession(clientId, config);
      
      // Create session
      const result = await service.createSession();
      
      return {
        content: [{
          type: ContentType.Text,
          text: `Successfully created AgentForce session with ID: ${result.sessionId}`
        }],
        metadata: {
          sessionId: result.sessionId
        }
      };
    }
    
    async function handleSendMessage(args) {
      const { clientId, config, message } = args;
      
      if (!clientId || !config || !message) {
        throw new Error('Missing required parameters: clientId, config, or message');
      }
      
      // Get or create session
      const service = sessionStore.getOrCreateSession(clientId, config);
      
      // Send message
      const result = await service.sendMessage(message);
      
      return {
        content: [{
          type: ContentType.Text,
          text: result.text
        }],
        metadata: {
          sequenceId: result.sequenceId,
          userMessage: message
        }
      };
    }
    
    async function handleGetStatus(args) {
      const { clientId } = args;
      
      if (!clientId) {
        throw new Error('Missing required parameter: clientId');
      }
      
      // Get session
      const service = sessionStore.getSession(clientId);
      
      if (!service) {
        return {
          content: [{
            type: ContentType.Text,
            text: `No active session found for client ID: ${clientId}`
          }],
          metadata: {
            isAuthenticated: false,
            hasSession: false,
            clientId
          }
        };
      }
      
      // Get status
      const status = service.getStatus();
      
      return {
        content: [{
          type: ContentType.Text,
          text: `AgentForce client status: ${status.isAuthenticated ? 'Authenticated' : 'Not authenticated'}, ${status.hasSession ? `Session active (ID: ${status.sessionId})` : 'No active session'}`
        }],
        metadata: status
      };
    }
    
    async function handleReset(args) {
      const { clientId } = args;
      
      if (!clientId) {
        throw new Error('Missing required parameter: clientId');
      }
      
      // Get session
      const service = sessionStore.getSession(clientId);
      
      if (!service) {
        return {
          content: [{
            type: ContentType.Text,
            text: `No active session found for client ID: ${clientId}`
          }],
          metadata: {
            clientId,
            reset: false
          }
        };
      }
      
      // Reset service
      service.reset();
      
      return {
        content: [{
          type: ContentType.Text,
          text: `AgentForce client has been reset. You'll need to authenticate and create a new session.`
        }],
        metadata: {
          clientId,
          reset: true
        }
      };
    }
    
  } catch (error) {
    console.error(`${colors.red}Server error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Start the server
console.log('Starting direct server...');
startServer().catch(error => {
  console.error('Server startup error:', error);
  process.exit(1);
});