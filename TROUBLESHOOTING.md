# AgentForce Reliable Server Troubleshooting Guide

This guide helps you diagnose and fix common issues with the AgentForce Reliable Server.

## Table of Contents

1. [Configuration Issues](#configuration-issues)
2. [Connection Problems](#connection-problems)
3. [Server Startup Issues](#server-startup-issues)
4. [Docker Issues](#docker-issues)
5. [Client Tool Issues](#client-tool-issues)

## Configuration Issues

### Malformed JSON in Configuration File

**Symptoms:**
- Server fails to start with JSON parsing errors
- Errors mentioning "Unexpected token", "Invalid JSON", or similar

**Solution:**
Use the configuration repair tool to fix your configuration file:

```bash
npx agentforce-reliable-server fix
```

Or fix the configuration and start the server in one step:

```bash
npx agentforce-reliable-server fix:start
```

### Configuration File Not Found

**Symptoms:**
- "Config file not found" or "ENOENT" errors
- Server prompts to run the configuration wizard

**Solution:**
Run the configuration wizard to create a new configuration file:

```bash
npx agentforce-reliable-server configure
```

## Connection Problems

### Port Already in Use

**Symptoms:**
- Error message: "EADDRINUSE: address already in use"
- Server fails to start

**Solutions:**
1. Use a different port by editing `~/.agentforce-mcp-server/config.json`
2. Find and stop the process using the port:
   ```bash
   lsof -i :3000  # Replace 3000 with your port number
   kill <PID>     # Replace <PID> with the process ID
   ```
3. Use the fix-and-start script which automatically handles this:
   ```bash
   npx agentforce-reliable-server fix:start
   ```

### Client Can't Connect to Server

**Symptoms:**
- Client tool reports "Connection refused" or "Cannot connect to server"
- API key or authentication errors

**Solutions:**
1. Verify the server is running: `ps aux | grep agentforce`
2. Check the server URL in the client configuration
3. Ensure the API key matches between server and client
4. Reconfigure the client: `npx agentforce-reliable-tool configure`

## Server Startup Issues

### Bootstrap Errors

**Symptoms:**
- Server crashes immediately after startup
- Errors mentioning "bootstrap.js"

**Solution:**
1. Run the setup script to ensure all files are executable:
   ```bash
   npx agentforce-reliable-server setup
   ```
2. Use the fix-and-start script which includes additional error handling:
   ```bash
   npx agentforce-reliable-server fix:start
   ```

### Node.js Version Issues

**Symptoms:**
- Syntax errors or unexpected token errors
- Import/export errors

**Solution:**
Ensure you're using Node.js 16 or later:
```bash
node --version  # Should be v16.0.0 or higher
```

## Docker Issues

### Docker Image Build Failures

**Symptoms:**
- Errors during `npm run start:docker`
- Docker build failures

**Solutions:**
1. Ensure Docker is installed and running
2. Check Docker permissions
3. Run Docker commands manually to see detailed errors:
   ```bash
   cd /path/to/agentforce-reliable-server
   docker build -t agentforce-reliable-server .
   ```

### Docker Container Runtime Issues

**Symptoms:**
- Container starts but exits immediately
- Unable to connect to container

**Solution:**
Run the Docker container manually with more verbose output:
```bash
docker run --rm -it -p 3000:3000 -v ~/.agentforce-mcp-server:/root/.agentforce-mcp-server agentforce-reliable-server
```

## Client Tool Issues

### Missing Dependencies

**Symptoms:**
- "Cannot find package 'axios'" or similar dependency errors
- Module not found errors

**Solution:**
Reinstall the client tool with dependencies:
```bash
npm install -g agentforce-reliable-tool
```

### Authentication Issues

**Symptoms:**
- "Unauthorized" or "Invalid API key" errors
- Authentication failures with Salesforce

**Solutions:**
1. Verify your server API key in `~/.agentforce-mcp-server/config.json`
2. Check the client configuration in `~/.agentforce-reliable-client/config.json`
3. Ensure Salesforce credentials are correctly set in environment variables

## Still Having Issues?

If you're still experiencing problems:

1. Create a bug report on our GitHub repository
2. Include error messages and your system information
3. Check our GitHub Issues for similar problems and solutions

You can also try reinstalling the server and client packages from scratch:
```bash
npm uninstall -g agentforce-reliable-server agentforce-reliable-tool
npm cache clean --force
npm install -g agentforce-reliable-server agentforce-reliable-tool
```