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
const LOGS_DIR = join(CONFIG_DIR, 'logs');
const LOG_PATH = join(LOGS_DIR, `server-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

// Content types enum (same as MCP SDK)
const ContentType = {
  Text: 'text',
  Binary: 'binary',
  JSON: 'json'
};

// Setup logging
async function setupLogging() {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
    
    // Create a write stream for the log file
    const logStream = await fs.open(LOG_PATH, 'a');
    
    // Override console methods to log to file
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;
    
    console.log = function(...args) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [INFO] ${args.join(' ')}\n`;
      logStream.write(logMessage);
      originalConsoleLog.apply(console, args);
    };
    
    console.error = function(...args) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [ERROR] ${args.join(' ')}\n`;
      logStream.write(logMessage);
      originalConsoleError.apply(console, args);
    };
    
    console.warn = function(...args) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [WARN] ${args.join(' ')}\n`;
      logStream.write(logMessage);
      originalConsoleWarn.apply(console, args);
    };
    
    console.info = function(...args) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [INFO] ${args.join(' ')}\n`;
      logStream.write(logMessage);
      originalConsoleInfo.apply(console, args);
    };
    
    // Log initial message
    console.log(`Logging initialized to ${LOG_PATH}`);
    
    // Setup cleanup on exit
    process.on('exit', () => {
      logStream.close();
    });
    
    return true;
  } catch (error) {
    console.error('Error setting up logging:', error.message);
    return false;
  }
}

// AgentForce Service class to handle API interactions
class AgentForceService {
  constructor(config) {
    this.config = config;
    this.accessToken = null;
    this.instanceUrl = null;
    this.sessionId = null;
    this.currentSequenceId = 0;
    this.requestId = uuidv4();
    console.log(`${colors.green}AgentForce service created for agent ID: ${this.config.agentId}${colors.reset}`);
    console.log(`Request ID: ${this.requestId}`);
  }

  async authenticate() {
    try {
      console.log(`${colors.blue}Authenticating with Salesforce...${colors.reset}`);
      console.log(`Request ID: ${this.requestId}`);
      
      // Create form data
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);
      params.append('client_email', this.config.clientEmail);

      console.log(`Auth endpoint: ${this.config.sfBaseUrl}/services/oauth2/token`);
      
      // Make request
      const response = await axios.post(
        `${this.config.sfBaseUrl}/services/oauth2/token`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Request-ID': this.requestId
          },
          timeout: 30000 // 30-second timeout
        }
      );

      // Store tokens
      this.accessToken = response.data.access_token;
      this.instanceUrl = response.data.instance_url;

      console.log(`${colors.green}Authentication successful${colors.reset}`);
      console.log(`Instance URL: ${this.instanceUrl}`);
      console.log(`Token (first 10 chars): ${this.accessToken.substring(0, 10)}...`);

      return {
        accessToken: this.accessToken,
        instanceUrl: this.instanceUrl
      };
    } catch (error) {
      console.error(`${colors.red}Authentication failed:${colors.reset}`, error.message);
      if (axios.isAxiosError(error)) {
        console.error('Request details:', {
          method: 'POST',
          url: `${this.config.sfBaseUrl}/services/oauth2/token`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Request-ID': this.requestId
          }
        });
        
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        } else if (error.request) {
          console.error('No response received:', error.request);
        } else {
          console.error('Error setting up request:', error.message);
        }
        
        if (error.config) {
          console.error('Request config:', {
            url: error.config.url,
            method: error.config.method,
            headers: error.config.headers
          });
        }
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
      console.log(`Request ID: ${this.requestId}`);

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
      
      console.log(`Session endpoint: ${this.config.apiUrl}/einstein/ai-agent/v1/agents/${this.config.agentId}/sessions`);
      console.log(`Session payload: ${JSON.stringify(sessionPayload)}`);

      // Make request
      const response = await axios.post(
        `${this.config.apiUrl}/einstein/ai-agent/v1/agents/${this.config.agentId}/sessions`,
        sessionPayload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Request-ID': this.requestId
          },
          timeout: 60000 // 60-second timeout
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
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        if (error.config) {
          console.error('Request config:', {
            url: error.config.url,
            method: error.config.method,
            headers: {
              ...error.config.headers,
              'Authorization': 'Bearer [REDACTED]'
            }
          });
        }
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
      console.log(`Request ID: ${this.requestId}`);
      console.log(`Message length: ${message.length} characters`);

      // Create message payload
      const messagePayload = {
        message: {
          sequenceId: this.currentSequenceId,
          type: 'Text',
          text: message
        }
      };
      
      console.log(`Message endpoint: ${this.config.apiUrl}/einstein/ai-agent/v1/sessions/${this.sessionId}/messages`);

      const startTime = Date.now();
      
      // Make request
      const response = await axios.post(
        `${this.config.apiUrl}/einstein/ai-agent/v1/sessions/${this.sessionId}/messages`,
        messagePayload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Request-ID': this.requestId
          },
          timeout: 120000 // 2-minute timeout
        }
      );
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Extract response text
      let responseText = 'No response received';
      if (response.data.messages && response.data.messages.length > 0) {
        responseText = response.data.messages[0].message;
      }

      console.log(`${colors.green}Message sent successfully, received ${responseText.length} characters${colors.reset}`);
      console.log(`Response time: ${responseTime}ms`);

      return {
        text: responseText,
        sequenceId: this.currentSequenceId
      };
    } catch (error) {
      console.error(`${colors.red}Message sending failed:${colors.reset}`, error.message);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        
        if (error.config) {
          console.error('Request config:', {
            url: error.config.url,
            method: error.config.method,
            headers: {
              ...error.config.headers,
              'Authorization': 'Bearer [REDACTED]'
            }
          });
        }
        
        // Handle specific error cases
        if (error.response && error.response.status === 401) {
          console.log('Authentication token expired, attempting to refresh...');
          this.accessToken = null;
          try {
            await this.authenticate();
            console.log('Authentication refreshed, retrying message send...');
            return this.sendMessage(message);
          } catch (refreshError) {
            console.error('Failed to refresh authentication:', refreshError.message);
          }
        }
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
      agentId: this.config.agentId,
      requestId: this.requestId
    };
  }

  reset() {
    this.accessToken = null;
    this.instanceUrl = null;
    this.sessionId = null;
    this.currentSequenceId = 0;
    this.requestId = uuidv4();
    console.log(`${colors.green}AgentForce service reset${colors.reset}`);
    console.log(`New request ID: ${this.requestId}`);
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
      console.log(`Creating new session for client ${clientId}`);
      sessions.set(clientId, new AgentForceService(config));
    } else {
      console.log(`Reusing existing session for client ${clientId}`);
    }
    return sessions.get(clientId);
  }
  
  clearSession(clientId) {
    if (sessions.has(clientId)) {
      console.log(`Clearing session for client ${clientId}`);
      const service = sessions.get(clientId);
      service.reset();
      sessions.delete(clientId);
      return true;
    }
    console.log(`No session found for client ${clientId}`);
    return false;
  }
  
  clearAll() {
    console.log('Clearing all sessions');
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
    try {
      const config = JSON.parse(configData);
      console.log('Successfully loaded configuration');
      return config;
    } catch (parseError) {
      console.error(`${colors.red}Error parsing configuration:${colors.reset}`, parseError.message);
      console.error(`${colors.yellow}Raw config data:${colors.reset}`, configData);
      console.error(`${colors.yellow}Please run 'npx agentforce-reliable-server fix' to repair the configuration${colors.reset}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}Error loading configuration:${colors.reset}`, error.message);
    console.error(`${colors.yellow}Please run 'npx agentforce-reliable-server configure' first${colors.reset}`);
    process.exit(1);
  }
}

// Start the server
async function startServer() {
  // Set up logging
  await setupLogging();
  
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
    
    // Request logging middleware
    app.use((req, res, next) => {
      const requestId = req.headers['x-request-id'] || uuidv4();
      req.requestId = requestId;
      
      console.log(`${colors.blue}${req.method} ${req.path}${colors.reset}`);
      console.log(`Request ID: ${requestId}`);
      console.log(`Headers: ${JSON.stringify({
        ...req.headers,
        'x-api-key': req.headers['x-api-key'] ? '[REDACTED]' : undefined
      })}`);
      
      const start = Date.now();
      
      // Capture response data
      const originalSend = res.send;
      res.send = function(body) {
        res.responseBody = body;
        return originalSend.call(this, body);
      };
      
      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${colors.green}Response ${res.statusCode} in ${duration}ms${colors.reset}`);
        
        if (res.statusCode >= 400) {
          try {
            const responseBody = res.responseBody ? 
              (typeof res.responseBody === 'string' ? JSON.parse(res.responseBody) : res.responseBody) : 
              {};
            console.log(`Error response: ${JSON.stringify(responseBody)}`);
          } catch (e) {
            console.log(`Error response (non-JSON): ${res.responseBody}`);
          }
        }
      });
      
      next();
    });
    
    // API Key middleware
    const apiKeyMiddleware = (req, res, next) => {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== config.server.apiKey) {
        console.error(`Invalid API key: ${apiKey ? apiKey.substring(0, 5) + '...' : 'not provided'}`);
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
          console.error('Invalid request format:', req.body);
          return res.status(400).json({
            error: 'Invalid request format'
          });
        }
        
        const { name, args } = tool;
        
        console.log(`${colors.blue}Tool called: ${name}${colors.reset}`);
        console.log(`Arguments: ${JSON.stringify({
          ...args,
          config: args.config ? {
            ...args.config,
            clientId: '[REDACTED]',
            clientSecret: '[REDACTED]'
          } : undefined
        })}`);
        
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
            console.error(`Unknown tool: ${name}`);
            return res.status(400).json({
              error: `Unknown tool: ${name}`
            });
        }
        
        res.json({ result });
      } catch (error) {
        console.error(`${colors.red}Tool execution error:${colors.reset}`, error);
        console.error('Stack trace:', error.stack);
        
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
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
    
    // Debug endpoint (only available in development)
    if (config.server.env === 'development') {
      app.get('/debug/sessions', apiKeyMiddleware, (req, res) => {
        const sessionData = Array.from(sessions.entries()).map(([clientId, service]) => ({
          clientId,
          status: service.getStatus()
        }));
        
        res.json({
          sessionCount: sessions.size,
          sessions: sessionData
        });
      });
    }
    
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
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Start the server
console.log('Starting direct server...');
startServer().catch(error => {
  console.error('Server startup error:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});