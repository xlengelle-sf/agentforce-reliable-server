# AgentForce Reliable Server

A reliable MCP-compliant server for Salesforce AgentForce API integration.

## Features

- Connects Claude AI to Salesforce AgentForce API
- Implements the Model Context Protocol (MCP) for tool use
- Direct mode for avoiding MCP SDK compatibility issues
- Simple configuration and setup

## Quick Start

### Installation

```bash
# Install globally
npm install -g agentforce-reliable-server

# Or run directly with npx
npx agentforce-reliable-server
```

### Configuration

```bash
# Run the configuration wizard
npx agentforce-reliable-server configure
```

You'll be prompted to:
- Set the server port (default: 3000)
- Generate a new API key (or keep existing one)
- Set the environment (production/development)

### Running the Server

#### Standard Method (Node.js)

```bash
# Run in direct mode (recommended)
npx agentforce-reliable-server --direct
```

#### Fix Configuration and Start (For JSON Config Issues)

If you encounter JSON configuration errors, use the fix-and-start script:

```bash
# Fix configuration and start server
npx agentforce-reliable-server fix:start
```

You can also fix the configuration separately:

```bash
# Only fix configuration issues
npx agentforce-reliable-server fix
```

#### Using Docker

The server can be run in a Docker container for easy deployment and isolation:

```bash
# Run with Docker support
npx agentforce-reliable-server start:docker
```

This command will:
1. Check if Docker is installed
2. Run the configuration if needed
3. Build a Docker image if it doesn't exist
4. Start the server in a container with proper volume mounts for configuration

### Using with AgentForce MCP Tool

After starting the server, install and configure the AgentForce MCP Tool:

```bash
npx agentforce-mcp-tool@latest
```

When prompted, enter:
- Server URL: http://localhost:3000 (or your configured port)
- API Key: (The key shown in the configuration output)

## API Endpoints

- `GET /`: Server info
- `GET /health`: Health check
- `GET /mcp/resources`: List available resources
- `GET /mcp/tools`: List available tools
- `POST /mcp/call-tool`: Execute a tool

## Advanced Configuration

The configuration is stored in:
- `~/.agentforce-mcp-server/config.json`

You can manually edit this file if needed.

## Docker Support

The package includes a Dockerfile and docker-compose.yml for containerized deployment:

```bash
# Build the image
docker build -t agentforce-reliable-server .

# Run with Docker directly
docker run -p 3000:3000 -v ~/.agentforce-mcp-server:/root/.agentforce-mcp-server agentforce-reliable-server

# Or use docker-compose
docker-compose up -d
```

## License

MIT