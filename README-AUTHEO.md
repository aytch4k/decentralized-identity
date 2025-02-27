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

# Update with your wallet information
PRIVATE_KEY=0xYourPrivateKey  # Your Autheo testnet wallet private key
WALLET_ADDRESS=0xYourWalletAddress  # Your Autheo testnet wallet address
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
- Invalid private key format
- Unable to connect to Autheo testnet RPC
- Contract address not set correctly

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