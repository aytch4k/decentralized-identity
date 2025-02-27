# Sovereign Decentralized Identity (DiD) Management Solution

This project implements an enterprise-grade decentralized identity management solution with Single Sign-On (SSO) capabilities. It allows users to control their identity information through blockchain technology while providing seamless authentication across multiple applications.

## Features

- **Decentralized Identity (DiD)**: Create and manage W3C-compliant Decentralized Identifiers
- **Secure Vault**: Store encrypted credentials, PII, PHI, and PCI data
- **Single Sign-On (SSO)**: Authenticate across multiple applications with different auth mechanisms
- **Advanced Cryptography**:
  - Homomorphic Encryption (HE) for data privacy
  - Zero-Knowledge Proofs (ZK-SNARKs) for credential verification
  - Differential Privacy for data analytics
- **Data Sovereignty**: Region-specific data storage with geo-fencing
- **Compliance**: GDPR, HIPAA, and PCI DSS compliant design
- **Blockchain Integration**: Smart contracts for DiD registry and verification
- **NFT-Based Identity**: DiD and Export NFTs for identity ownership and data sharing

## Architecture

The system consists of the following components:

1. **Blockchain Layer**:
   - Cronos blockchain for DiD registry smart contracts
   - SovereignIdentityManager contract for DiD and vault management

2. **Storage Layer**:
   - IPFS for decentralized, encrypted storage of vault data
   - Geo-fenced nodes for regional data sovereignty

3. **API Layer**:
   - DiD Manager API for DiD operations
   - SSO Integration Layer for authentication across apps
   - RESTful endpoints for client interactions

4. **Client Layer**:
   - JavaScript libraries for DiD, HE, ZK, and DP operations
   - Example web application for demonstration

## Prerequisites

- Node.js (v14+)
- Docker and Docker Compose
- Web3 wallet (e.g., MetaMask)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/decentralized-identity.git
   cd decentralized-identity
   ```

2. Start the services using Docker Compose:
   ```
   docker-compose up -d
   ```

3. Deploy the smart contracts:
   ```
   cd cronos/contracts
   npm install
   node deploy-sovereign.js
   ```

4. Update the contract address in the API configuration:
   - Copy the deployed contract address from the previous step
   - Update the `CONTRACT_ADDRESS` environment variable in `docker-compose.yml`

5. Restart the API service:
   ```
   docker-compose restart api
   ```

## Usage

### Web Demo

1. Open the example application in your browser:
   ```
   open http://localhost:4000/client/example-app.html
   ```

2. Connect your Web3 wallet (e.g., MetaMask)

3. Create a DiD and explore the features:
   - Create and manage your Decentralized Identity
   - Store and retrieve credentials in the Secure Vault
   - Use SSO to authenticate across multiple applications
   - Experiment with HE, ZK proofs, and differential privacy

### API Endpoints

The API server exposes the following endpoints:

#### DiD Manager API

- `POST /api/did/create` - Create a new DiD
- `GET /api/did/resolve/:did` - Resolve a DiD to its DiD Document
- `PUT /api/did/update` - Update a DiD Document
- `DELETE /api/did/deactivate/:walletAddress` - Deactivate a DiD
- `POST /api/did/verify` - Verify a DiD proof
- `POST /api/did/credentials/add` - Add app credentials to a DiD Document
- `GET /api/did/credentials/:did/:appId` - Get app credentials
- `POST /api/did/export` - Authorize export of DiD data

#### SSO Integration Layer API

- `GET /api/sso/challenge/:walletAddress` - Generate a challenge for wallet authentication
- `POST /api/sso/login` - Authenticate with wallet and get SSO token
- `GET /api/sso/token/:appId` - Get app-specific authentication token
- `POST /api/sso/logout` - Invalidate SSO session

## Client Libraries

The project includes several client-side libraries:

- `sovereign-did-client.js` - Main client for DiD and SSO operations
- `homomorphic-encryption.js` - Utilities for homomorphic encryption
- `zk-proofs.js` - Utilities for zero-knowledge proofs
- `differential-privacy.js` - Utilities for differential privacy

## Project Structure

```
decentralized-identity/
├── api/                  # API server
│   ├── client/           # Client-side libraries and demo
│   ├── did-manager.js    # DiD Manager implementation
│   ├── sso-service.js    # SSO Service implementation
│   ├── server.js         # API server implementation
│   ├── package.json      # API dependencies
│   └── Dockerfile        # API Docker configuration
├── cosmos/               # Cosmos blockchain app
│   ├── app/              # Cosmos SDK application
│   │   ├── main.go       # Main application entry point
│   │   └── modules/      # Custom modules
│   │       └── did/      # DiD module implementation
│   ├── config/           # Cosmos configuration
│   └── Dockerfile        # Cosmos Docker configuration
├── cronos/               # Cronos blockchain
│   ├── contracts/        # Smart contracts
│   │   ├── DIDRegistry.sol              # Basic DiD registry
│   │   ├── SovereignIdentityManager.sol # Enhanced DiD manager
│   │   └── deploy-sovereign.js          # Deployment script
│   ├── config/           # Cronos configuration
│   └── Dockerfile        # Cronos Docker configuration
├── docs/                 # Documentation
│   ├── DID_LowLevelDesign.md            # DiD system design
│   ├── SECURE_VAULT_EXTENSION.md        # Secure vault extension
│   ├── Secure_Vault_Spec.md             # Secure vault specification
│   ├── Sovereign DiD Standard Specification for NFT Data.md # NFT-based DiD spec
│   └── Zero-Knowledge Proofs_HE-DiffPriv.md # Cryptography details
├── docker-compose.yml    # Docker Compose configuration
└── README.md             # Project documentation
```

## Security Considerations

- Private keys never leave the user's wallet
- All credential data is encrypted using homomorphic encryption
- Zero-knowledge proofs are used for credential verification without revealing actual data
- Differential privacy techniques are applied to sensitive data
- All API endpoints require proper authentication
- Geo-fenced storage ensures data sovereignty compliance

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- W3C Decentralized Identifiers (DiD) Working Group
- OpenZeppelin for smart contract libraries
- IPFS for decentralized storage
