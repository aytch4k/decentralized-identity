FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies with specific versions for compatibility
RUN npm install --no-save && \
    npm uninstall --no-save libp2p-noise ipfs-http-client && \
    npm install --no-save libp2p-noise@4.0.0 ipfs-http-client@50.1.2

# Copy source code
COPY . .

# Create client directory if it doesn't exist
RUN mkdir -p /app/client

# Expose port
EXPOSE 4000

# Start the server
CMD ["npm", "start"]
