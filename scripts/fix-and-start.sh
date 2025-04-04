#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  AgentForce Reliable Server Quick Start   ${NC}"
echo -e "${BLUE}===========================================${NC}"
echo

# Find the script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Make scripts executable
echo -e "${YELLOW}Making scripts executable...${NC}"
chmod +x "$PROJECT_ROOT/src/bootstrap.js" "$PROJECT_ROOT/src/direct-server.js" "$PROJECT_ROOT/src/configure.js" "$SCRIPT_DIR/fix-config.js"
echo -e "${GREEN}✓ Scripts are now executable${NC}"
echo

# Fix configuration
echo -e "${YELLOW}Fixing configuration...${NC}"
node "$SCRIPT_DIR/fix-config.js"
if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Configuration fix failed${NC}"
  exit 1
fi
echo

# Find existing server processes
echo -e "${YELLOW}Checking for existing server processes...${NC}"
SERVER_PROCESSES=$(ps aux | grep node | grep agentforce | grep -v grep || true)
if [ ! -z "$SERVER_PROCESSES" ]; then
  echo -e "${YELLOW}Found existing server processes. Attempting to stop them...${NC}"
  echo "$SERVER_PROCESSES"
  
  # Try regular kill first
  pkill -f "agentforce-reliable-server" || true
  sleep 1
  
  # Check if processes still exist
  REMAINING_PROCESSES=$(ps aux | grep node | grep agentforce | grep -v grep || true)
  if [ ! -z "$REMAINING_PROCESSES" ]; then
    echo -e "${YELLOW}Some processes still running. Using force kill...${NC}"
    pkill -9 -f "agentforce-reliable-server" || true
    sleep 2
  fi
  
  # Check port 3000 specifically
  PORT_PROCESSES=$(lsof -i :3000 | grep LISTEN || true)
  if [ ! -z "$PORT_PROCESSES" ]; then
    echo -e "${YELLOW}Found processes using port 3000:${NC}"
    echo "$PORT_PROCESSES"
    echo -e "${YELLOW}Killing these processes...${NC}"
    lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9 || true
    sleep 2
  fi
  
  echo -e "${GREEN}✓ Stopped existing server processes${NC}"
else
  echo -e "${GREEN}✓ No existing server processes found${NC}"
fi
echo

# Start the server
echo -e "${YELLOW}Starting server in direct mode...${NC}"
cd "$PROJECT_ROOT"

# Make sure dependencies are installed
echo -e "${YELLOW}Checking dependencies...${NC}"
if [ ! -d "node_modules" ] || [ ! -d "node_modules/express" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
  if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

node src/bootstrap.js --direct