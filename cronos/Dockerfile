FROM ethereum/client-go:latest

WORKDIR /contracts
COPY ./contracts/DIDRegistry.sol .
COPY ./contracts/SovereignIdentityManager.sol .
COPY ./contracts/deploy.js .
COPY ./contracts/deploy-sovereign.js .
COPY ./config/hardhat.config.js .

# Use apk for Alpine Linux instead of apt-get
RUN apk add --no-cache nodejs npm

# Install required dependencies
RUN npm init -y && npm install --save web3 @openzeppelin/contracts hardhat @nomiclabs/hardhat-ethers
# Skip interactive init and use the provided config
RUN npx hardhat compile

# Create a wrapper script for cronosd
RUN echo '#!/bin/sh' > /usr/bin/cronosd && \
    echo 'echo "Running cronosd with args: $@"' >> /usr/bin/cronosd && \
    echo 'if [ "$1" = "start" ]; then' >> /usr/bin/cronosd && \
    echo '  exec geth --http --http.addr 0.0.0.0 --dev' >> /usr/bin/cronosd && \
    echo 'else' >> /usr/bin/cronosd && \
    echo '  exec geth "$@"' >> /usr/bin/cronosd && \
    echo 'fi' >> /usr/bin/cronosd

# Make the script executable
RUN chmod +x /usr/bin/cronosd

# Verify the script is executable
RUN ls -la /usr/bin/cronosd && /usr/bin/cronosd

EXPOSE 8545 8546

# Use the script directly as the command
CMD ["/usr/bin/cronosd", "start"]
