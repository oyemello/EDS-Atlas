# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port (Render sets PORT env var automatically)
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
