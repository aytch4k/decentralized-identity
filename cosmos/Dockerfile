FROM ubuntu:20.04

# Install necessary packages
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Create a functional placeholder for cosmosd
RUN echo '#!/bin/bash' > /usr/bin/cosmosd \
    && echo '# Check if this is the start command' >> /usr/bin/cosmosd \
    && echo 'if [ "$1" = "start" ]; then' >> /usr/bin/cosmosd \
    && echo '  echo "Starting Cosmos SDK placeholder service..."' >> /usr/bin/cosmosd \
    && echo '  # Keep the container running' >> /usr/bin/cosmosd \
    && echo '  tail -f /dev/null' >> /usr/bin/cosmosd \
    && echo 'else' >> /usr/bin/cosmosd \
    && echo '  echo "Cosmos SDK command: $@"' >> /usr/bin/cosmosd \
    && echo 'fi' >> /usr/bin/cosmosd

# Make the script executable
RUN chmod +x /usr/bin/cosmosd

# Verify the script is executable
RUN ls -la /usr/bin/cosmosd && /usr/bin/cosmosd

# Create a directory for cosmos data
RUN mkdir -p /root/.cosmosd

EXPOSE 26657 1317

# Use the script as the entrypoint
CMD ["/usr/bin/cosmosd", "start"]
