# AgentForce Reliable Server Documentation

## Overview

AgentForce Reliable Server is a robust, MCP-compliant server for connecting to Salesforce AgentForce API. It solves common compatibility issues with the Model Context Protocol (MCP) SDK by providing multiple operation modes and built-in fallbacks.

## Key Features

- **Multiple execution modes**: Standard, Direct, and HTTP modes
- **SDK-independent implementation**: Direct mode works without MCP SDK dependencies
- **Graceful error handling**: Automatic fallback to reliable implementations
- **Full MCP compatibility**: Claude integration with standard MCP tools
- **Easy configuration**: Simple setup wizard and clear documentation

## Installation

Install the package globally:

```bash
npm install -g agentforce-reliable-server
```

Or for one-time use:

```bash
npx agentforce-reliable-server
```

## Configuration

Run the configuration wizard:

```bash
npx agentforce-reliable-server configure
```

This will:
1. Create or update the config file at `~/.agentforce-mcp-server/config.json`
2. Set up server port, API key, and environment settings
3. Provide guidance for next steps

### Configuration Options

When running the configuration wizard, you can set:

- **Server Port**: The port number for the HTTP server (default: 3001)
- **API Key**: Auto-generated secret key for API authentication
- **Environment**: "production" or "development"

The wizard will generate a secure configuration file with these settings.

## Running the Server

### Direct Mode (Recommended)

For maximum reliability, run in direct mode:

```bash
npx agentforce-reliable-server --direct
```

This mode uses a standalone implementation without MCP SDK dependencies, avoiding common compatibility issues.

### Docker Mode (Containerized)

Run in a Docker container for isolation and easy deployment:

```bash
npx agentforce-reliable-server start:docker
```

This mode will:
1. Check if Docker is installed
2. Run the configuration wizard if needed
3. Build a Docker image if it doesn't exist
4. Start the server in a container with proper volume mounts

### Standard Mode

Run with MCP SDK (if available) with automatic fallback:

```bash
npx agentforce-reliable-server
```

### HTTP Mode

For HTTP-based clients:

```bash
npx agentforce-reliable-server --http
```

## API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server information |
| `/health` | GET | Server health check |
| `/mcp/resources` | GET | List available resources |
| `/mcp/tools` | GET | List available tools |
| `/mcp/call-tool` | POST | Execute a tool |

### Tools

The server provides the following MCP-compatible tools:

- `agentforce_authenticate`: Authenticate with Salesforce
- `agentforce_create_session`: Create an AgentForce agent session
- `agentforce_send_message`: Send a message to the agent
- `agentforce_get_status`: Check connection status
- `agentforce_reset`: Reset a client session

### Authentication

All API endpoints (except `/` and `/health`) require the `x-api-key` header with your configured API key.

## Integration with Claude

### Setup Instructions

1. Install AgentForce MCP Tool:
   ```bash
   npm install -g agentforce-mcp-tool
   ```

2. Configure the tool to connect to your server:
   ```bash
   npx agentforce-mcp-tool configure
   ```
   - Enter your server URL (e.g., http://localhost:3001)
   - Enter your server's API key

3. Configure Claude Desktop:
   Edit your Claude Desktop config file (usually at `~/Library/Application Support/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "agentforce": {
         "command": "npx",
         "args": ["agentforce-mcp-tool"]
       }
     }
   }
   ```

4. Start Claude Desktop and access AgentForce tools in your conversations.

## Troubleshooting

### Common Issues

#### MCP SDK Compatibility Error

**Problem**:
```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: No "exports" main defined in @modelcontextprotocol/sdk/package.json
```

**Solution**: Use direct mode:
```bash
npx agentforce-reliable-server --direct
```

#### Port Already in Use

**Problem**:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution**:
1. Edit `~/.agentforce-mcp-server/config.json`
2. Change the port number
3. Restart the server

#### Authentication Failures

**Problem**: API requests failing with 401 Unauthorized

**Solution**:
1. Make sure you're passing the API key via `x-api-key` header
2. Run `npx agentforce-reliable-server configure` to verify or regenerate your API key

## Security Considerations

- Keep your API key secure
- The server is designed for local use or secure environments
- For production deployment, set up proper authentication and HTTPS

## Technical Details

### Architecture

The server consists of several key components:

1. **Bootstrap System**: Handles startup and fallback mechanisms
2. **Configuration Manager**: Handles user settings and environment setup
3. **AgentForce Service**: Core API interaction layer
4. **Session Store**: Manages client sessions and state
5. **MCP-compatible API**: Provides standard MCP endpoints and tools
6. **Docker Support**: Container-based deployment option

### File Structure

```
agentforce-reliable-server/
├── src/
│   ├── bootstrap.js        # Entry point with fallback handling
│   ├── configure.js        # Configuration wizard
│   └── direct-server.js    # SDK-independent implementation
├── scripts/
│   ├── postinstall.js      # Post-installation helper
│   ├── docker-start.sh     # Bash script for Docker startup
│   └── run-docker.js       # Node.js Docker launcher
├── Dockerfile              # Docker container definition
├── docker-compose.yml      # Multi-container orchestration
├── package.json            # Package metadata
└── README.md               # Basic documentation
```

### Docker Configuration

The Docker setup includes:

1. **Dockerfile**: Uses Node.js Alpine image for minimal size
2. **Volume Mounting**: Persists configuration between container restarts
3. **Port Mapping**: Exposes the server on the host machine
4. **Environment Variables**: Configurable via standard Docker methods

## Version History

- **1.1.1** - Current stable release
  - Added auto-detection and termination of existing server processes
  - Improved port conflict handling in Docker mode
  - Published on npm registry with public access

- **1.1.0** - Previous release
  - Added Docker support for containerized deployment
  - Improved error handling and configuration
  - Published on npm registry with public access

- **1.0.1** - Previous release
  - Fixed package structure and improved documentation
  - Published on npm registry

- **1.0.0** - Initial release
  - Basic functionality and API support
  - Multiple execution modes

## Contributing

Contributions are welcome! Please submit pull requests or open issues on the GitHub repository.

## License

MIT License