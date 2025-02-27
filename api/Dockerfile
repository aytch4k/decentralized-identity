FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create client directory if it doesn't exist
RUN mkdir -p /app/client

# Expose port
EXPOSE 4000

# Start the server
CMD ["npm", "start"]
