# AgentForce Server and Client Logs

This document provides information about the logging capabilities in the AgentForce Reliable Server and Tool.

## Server Logs

The AgentForce Reliable Server automatically logs all activities to help with debugging and troubleshooting.

### Log Location

Logs are stored in the following location:
```
~/.agentforce-mcp-server/logs/
```

Each server instance creates a timestamped log file with the format:
```
server-YYYY-MM-DDTHH-MM-SS-sssZ.log
```

### Log Contents

Server logs include:
- All HTTP requests and responses
- Authentication attempts and results
- Session creation and management
- Message sending and receiving
- Error details with stack traces
- Response times and performance metrics

### Viewing Logs

You can view the logs using any text editor or with command-line tools:

```bash
# View the most recent log file
ls -t ~/.agentforce-mcp-server/logs/ | head -1 | xargs cat

# Monitor logs in real-time
tail -f ~/.agentforce-mcp-server/logs/server-*.log

# Search logs for specific information
grep "error" ~/.agentforce-mcp-server/logs/server-*.log
```

## Client Tool Logs

The AgentForce Reliable Tool also maintains logs to track interactions with the server.

### Log Location

Client tool logs are stored in:
```
~/.agentforce-reliable-client/logs/
```

Each client session creates a timestamped log file with the format:
```
client-YYYY-MM-DDTHH-MM-SS-sssZ.log
```

### Log Contents

Client logs include:
- All requests sent to the server
- Responses received from the server
- Configuration loading and saving
- Error details and troubleshooting information
- Input/output data sizes

### Viewing Client Logs

Access client logs with similar commands:

```bash
# View the most recent client log
ls -t ~/.agentforce-reliable-client/logs/ | head -1 | xargs cat

# Monitor client logs in real-time
tail -f ~/.agentforce-reliable-client/logs/client-*.log
```

## Troubleshooting with Logs

When experiencing issues, logs are your first resource for diagnosing problems:

1. Check the server logs for error messages or unexpected behaviors
2. Review client logs to see how requests are being processed
3. Look for HTTP status codes and error responses
4. Check for authentication failures or configuration issues

Common patterns in logs that indicate problems:
- "Error connecting to server" - Server may not be running
- "Authentication failed" - Check credentials in configuration
- "Session creation failed" - Verify AgentForce configuration
- "Invalid API key" - Ensure client and server keys match

## Log Rotation

Logs are not automatically rotated or cleaned up. You may want to periodically archive or delete old log files:

```bash
# Delete server logs older than 7 days
find ~/.agentforce-mcp-server/logs -name "server-*.log" -mtime +7 -delete

# Delete client logs older than 7 days
find ~/.agentforce-reliable-client/logs -name "client-*.log" -mtime +7 -delete
```