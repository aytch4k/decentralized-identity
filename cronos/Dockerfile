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
RUN echo '#!/bin/sh' > /usr/local/bin/cronosd && \
    echo 'if [ "$1" = "start" ]; then' >> /usr/local/bin/cronosd && \
    echo '  exec geth --http --http.addr 0.0.0.0 --dev' >> /usr/local/bin/cronosd && \
    echo 'else' >> /usr/local/bin/cronosd && \
    echo '  exec geth "$@"' >> /usr/local/bin/cronosd && \
    echo 'fi' >> /usr/local/bin/cronosd && \
    chmod +x /usr/local/bin/cronosd

EXPOSE 8545 8546
ENTRYPOINT ["cronosd"]
