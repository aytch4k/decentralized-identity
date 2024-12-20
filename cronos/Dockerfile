FROM ethereum/client-go:latest

WORKDIR /contracts
COPY ./contracts/DIDRegistry.sol .
COPY ./contracts/deploy.js .

RUN apt-get update && apt-get install -y nodejs npm
RUN npm install -g hardhat
RUN npx hardhat compile

EXPOSE 8545 8546
ENTRYPOINT ["geth", "--http", "--http.addr", "0.0.0.0", "--dev"]
