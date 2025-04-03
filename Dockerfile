FROM node:18-alpine

WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Ensure scripts are executable
RUN chmod +x src/bootstrap.js src/direct-server.js src/configure.js

# Create volume mount point
RUN mkdir -p /root/.agentforce-mcp-server

# Expose default port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Run the server in direct mode
CMD ["node", "src/bootstrap.js", "--direct"]