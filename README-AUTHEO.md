# Decentralized Identity System - Autheo Testnet Setup

This guide explains how to set up and run the Decentralized Identity system on the Autheo testnet.

## Prerequisites

- Docker and Docker Compose installed
- Node.js and npm installed
- An Autheo testnet wallet with some test tokens
- Access to Autheo testnet RPC and API endpoints

## Setup Steps

### 1. Configure Environment Variables

1. Edit the `.env` file in the `api` directory with your Autheo testnet configuration:

```
# Update these values with your Autheo testnet information
CRONOS_RPC=https://testnet-rpc2.autheo.com  # Replace with actual Autheo testnet RPC URL
COSMOS_API=https://testnet-rpc2.autheo.com/api  # Replace with actual Autheo testnet API URL

# IMPORTANT: You must update these with valid wallet information
# The default values are for development only and won't work on Autheo testnet
PRIVATE_KEY=0xYourPrivateKey  # Must be a valid Ethereum private key (64 hex chars with 0x prefix)
WALLET_ADDRESS=0xYourWalletAddress  # Must be a valid Ethereum address (40 hex chars with 0x prefix)

# After contract deployment, this will be automatically updated
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3  # Will be updated after deployment
```

You can generate a wallet using the provided script:

```bash
./generate-wallet.js --update-env
```

### 2. Build the Docker Images

```bash
docker-compose build
```

### 3. Deploy Smart Contracts to Autheo Testnet

```bash
# Run the deployment script
docker-compose run --rm cronos node /contracts/deploy-to-autheo.js
```

This script will:
- Deploy the DIDRegistry and SovereignIdentityManager contracts to Autheo testnet
- Update the CONTRACT_ADDRESS in the .env file
- Create a deployment-info.json file with deployment details
- Save the contract ABI to api/SovereignIdentityManager.json for the API service

### 4. Start the System

```bash
docker-compose up -d
```

### 5. Verify the Setup

1. Check if the API is running:

```bash
curl http://localhost:4000/health
```

2. Check if the contracts are deployed correctly:

```bash
cat cronos/deployment-info.json
```

## Troubleshooting

### API Service Issues

If the API service fails to start, check the logs:

```bash
docker-compose logs api
```

Common issues:
- Invalid private key format: Make sure your private key is a valid Ethereum private key (64 hex characters with 0x prefix)
- Invalid wallet address format: Make sure your wallet address is a valid Ethereum address (40 hex characters with 0x prefix)
- Invalid contract address: The placeholder "0xYourContractAddress" will cause an error; it must be a valid Ethereum address
- Missing SovereignIdentityManager.json file: This file is needed by the API service and should be created during contract deployment
- Unable to connect to Autheo testnet RPC: Verify the RPC URL is correct and accessible
- libp2p module errors: If you encounter errors with libp2p, make sure you're using version 0.30.10 which is compatible with CommonJS
- DHT constructor errors: The "DHT is not a constructor" error has been fixed by disabling the DHT module in the libp2p configuration

### Build Warnings

When building the API service, you may see numerous deprecation warnings related to Node.js modules. These warnings are expected and can be safely ignored:

```
(node:xxx) [DEP0128] DeprecationWarning: Invalid 'main' field in '...' package.json
(node:xxx) [DEP0148] DeprecationWarning: Use of deprecated folder mapping './lib' in the 'exports' field
```

These warnings are due to older dependencies used by libp2p and other modules. They don't affect the functionality of the system but will be addressed in future updates.

### Contract Deployment Issues

If contract deployment fails, check:
- If your wallet has enough test tokens for gas
- If the Autheo testnet RPC URL is correct
- If your private key is valid

## Using the System

### Creating a DID

```bash
curl -X POST http://localhost:4000/api/did/create \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xYourWalletAddress",
    "region": "EU",
    "didDocument": {
      "context": ["https://www.w3.org/ns/did/v1"],
      "id": "did:sovereign:0xYourWalletAddress"
    },
    "vaultData": {
      "vaultSpec": "1.0",
      "vaultId": "vault-1",
      "contents": []
    }
  }'
```

### Resolving a DID

```bash
curl http://localhost:4000/api/did/resolve/did:sovereign:0xYourWalletAddress
```

## Additional Resources

- [Autheo Testnet Explorer](https://testnet-explorer.autheo.network)
- [Autheo Testnet Faucet](https://testnet-faucet.autheo.network)
- [Autheo Documentation](https://docs.autheo.network)