## **Cronos (/cronos/config/):**

- genesis.json: Defines the initial state of the Cronos blockchain, including an account with a preloaded balance.
- node-config.json: Configures RPC endpoints, ports, and mining settings.
- private-key.txt: Stores the private key for deploying smart contracts and executing transactions.
- hardhat.config.js: Configures Hardhat to interact with the Cronos blockchain for deploying and testing smart contracts.

## **Build and start the Cronos node:**

```
docker-compose up cronos
```

## **Deploy Smart Contracts:**

Deploy Smart Contracts:

- Navigate to /cronos/contracts/.
- Deploy the smart contract using Hardhat:

```
npx hardhat run deploy.js --network cronos
```
