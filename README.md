# 🚀 AgentForce Reliable Server

[![npm version](https://img.shields.io/npm/v/agentforce-reliable-server.svg)](https://www.npmjs.com/package/agentforce-reliable-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A reliable MCP-compliant server for Salesforce AgentForce API integration that solves common compatibility issues and provides multiple execution modes.

<p align="center">
  <img src="https://raw.githubusercontent.com/xlengelle-sf/agentforce-reliable-server/main/assets/logo.png" alt="AgentForce Reliable Server" width="300">
</p>

## 🎯 Features

- **Multiple execution modes** - Built-in fallbacks for MCP SDK compatibility issues
- **Zero SDK dependency issues** - Direct implementation avoids common module errors
- **Full MCP compatibility** - Works seamlessly with Claude and other MCP clients
- **Fast setup** - Works across Node.js versions without complex configuration
- **Comprehensive documentation** - Clear instructions for all operation modes

## 📦 Installation

```bash
# Install globally
npm install -g agentforce-reliable-server

# Configure the server
npx agentforce-reliable-server configure
```

## 🚀 Quick Start

### 1. Configure the server

```bash
npx agentforce-reliable-server configure
```

### 2. Start the server in direct mode (recommended)

```bash
npx agentforce-reliable-server --direct
```

### 3. Install and configure the AgentForce MCP Tool

```bash
# Install the tool
npm install -g agentforce-mcp-tool

# Configure it to connect to your server
npx agentforce-mcp-tool configure
```

### 4. Configure Claude Desktop

Edit your Claude Desktop config file:
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

## 🛠️ Execution Modes

### Direct Mode (Recommended)

Avoids MCP SDK issues with a standalone implementation:

```bash
npx agentforce-reliable-server --direct
```

### Standard Mode

Uses MCP SDK with automatic fallback:

```bash
npx agentforce-reliable-server
```

### HTTP Mode

For HTTP-based clients:

```bash
npx agentforce-reliable-server --http
```

## 🔒 Security

- API key authentication for all requests
- Secure configuration handling
- Session isolation between clients

## 📖 Documentation

For comprehensive documentation, see [DOCUMENTATION.md](DOCUMENTATION.md).

## ⚙️ API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server information |
| `/health` | GET | Health check |
| `/mcp/resources` | GET | List available resources |
| `/mcp/tools` | GET | List available tools |
| `/mcp/call-tool` | POST | Execute a tool |

### Authentication

All API requests (except `/` and `/health`) require the `x-api-key` header with your configured API key.

## 🐛 Troubleshooting

### MCP SDK Compatibility Error

If you see:
```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: No "exports" main defined in @modelcontextprotocol/sdk/package.json
```

Use direct mode:
```bash
npx agentforce-reliable-server --direct
```

### Port Already in Use

If you see:
```
Error: listen EADDRINUSE: address already in use
```

Edit the config file at `~/.agentforce-mcp-server/config.json` and change the port number.

## 🤝 Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting a pull request.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.