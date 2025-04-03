#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration constants
CONFIG_DIR="$HOME/.agentforce-mcp-server"
CONFIG_PATH="$CONFIG_DIR/config.json"

echo -e "${BLUE}AgentForce Reliable Server - Docker Launcher${NC}"
echo

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if config exists, if not run configuration
if [ ! -f "$CONFIG_PATH" ]; then
    echo -e "${YELLOW}No configuration found. Running configuration wizard...${NC}"
    mkdir -p "$CONFIG_DIR"
    
    # Run the configure script
    node "$(dirname "$0")/../src/configure.js"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Configuration failed. Please try again.${NC}"
        exit 1
    fi
fi

# Check if Docker image exists, if not build it
if ! docker images | grep -q "agentforce-reliable-server"; then
    echo -e "${YELLOW}Docker image not found. Building image...${NC}"
    
    # Navigate to the repository root
    cd "$(dirname "$0")/.." || exit 1
    
    # Build the Docker image
    docker build -t agentforce-reliable-server .
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Docker image build failed. Please check the errors above.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Docker image built successfully.${NC}"
fi

# Get the configured port from config.json
SERVER_PORT=$(grep -o '"port":[^,}]*' "$CONFIG_PATH" | cut -d ':' -f2 | tr -d ' ')
if [ -z "$SERVER_PORT" ]; then
    SERVER_PORT=3000
fi

echo -e "${BLUE}Starting AgentForce Reliable Server in Docker container...${NC}"

# Run the Docker container
docker run --rm -it \
    -p "$SERVER_PORT:3000" \
    -v "$CONFIG_DIR:/root/.agentforce-mcp-server" \
    --name agentforce-reliable-server \
    agentforce-reliable-server

echo
echo -e "${GREEN}Server stopped.${NC}"