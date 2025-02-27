FROM ethereum/client-go:latest

WORKDIR /contracts
COPY ./contracts/DIDRegistry.sol .
COPY ./contracts/SovereignIdentityManager.sol .
COPY ./contracts/deploy.js .
COPY ./contracts/deploy-sovereign.js .
COPY ./config/hardhat.config.js .

# Use apk for Alpine Linux instead of apt-get
RUN apk add --no-cache nodejs npm bash

# Install required dependencies
RUN npm init -y && npm install --save web3 @openzeppelin/contracts hardhat @nomiclabs/hardhat-ethers
# Skip interactive init and use the provided config
RUN npx hardhat compile

# Find where geth is located and create a simple startup script
RUN which geth || echo "geth not found in PATH" && \
    find / -name geth 2>/dev/null || echo "geth not found in filesystem" && \
    echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'echo "Starting Ethereum node..."' >> /entrypoint.sh && \
    echo 'exec "$@"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

EXPOSE 8545 8546

# Override any existing ENTRYPOINT and use shell form for CMD
ENTRYPOINT ["/entrypoint.sh"]
CMD ["geth", "--http", "--http.addr", "0.0.0.0", "--dev"]
