# **Decentralized Identity (DID) Solution on Cosmos SDK and Cronos**

This project is a hybrid Decentralized Identity (DID) solution built on **Cosmos SDK** (Layer 1 blockchain) and **Cronos EVM** (smart contract platform). It enables DID creation, Verifiable Credential (VC) issuance, and verification with a one-click launch for a development environment.

---

## **Features**

- **Cosmos SDK Layer**:
  - Dedicated Layer 1 blockchain for managing DIDs.
  - DID creation, querying, and management using Cosmos SDK modules.
  - Interoperability using IBC (Inter-Blockchain Communication Protocol).

- **Cronos EVM Layer**:
  - EVM-compatible smart contracts for managing Verifiable Credentials.
  - Supports Ethereum-based tools and integrations.

- **Unified API Layer**:
  - RESTful APIs for interacting with the Cosmos blockchain and Cronos smart contracts.
  - Simplified API interface for developers.

- **One-Click Devnet**:
  - Dockerized setup for launching the entire solution locally with Docker Compose.

---

## **Architecture**

### **Components**

1. **Cosmos SDK Blockchain**:
   - Handles DID creation, storage, and querying.
   - Uses Cosmos SDK modules for DID management.

2. **Cronos Smart Contracts**:
   - Manages Verifiable Credentials.
   - Ensures compatibility with Ethereum-based ecosystems.

3. **API Layer**:
   - A Node.js-based REST API server that interacts with both Cosmos and Cronos.
   - Provides endpoints for DID and credential operations.

4. **Interoperability**:
   - Data exchange between Cosmos SDK and Cronos using IBC.

---

## **Project Structure**

```plaintext
did-solution/
│
├── cosmos/
│   ├── Dockerfile
│   ├── config/              # Cosmos SDK blockchain configuration
│   └── app/                 # Cosmos SDK app logic
│       ├── main.go
│       └── modules/
│           └── did/         # DID module logic
│
├── cronos/
│   ├── Dockerfile
│   ├── contracts/           # EVM smart contracts
│       ├── DIDRegistry.sol
│       └── deploy.js
│   └── config/              # Cronos chain configuration
│
├── api/
│   ├── Dockerfile
│   ├── server.js            # REST API logic
│   └── package.json
│
└── docker-compose.yml       # Docker Compose file for one-click devnet
```
---

## **Quick Start**

### **Prerequisites**

Ensure the following are installed:
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/) (for local contract testing)

### **Clone the Repository**

```bash
git clone https://github.com/aytch4k/decentralized-identity.git
cd did-solution
```

### **Launch the devnet**
Run the following command to start the Cosmos blockchain, Cronos EVM, and API server:
```
docker-compose up --build
```
This will:

- Start the Cosmos SDK blockchain on http://localhost:1317 (REST API) and http://localhost:26657 (RPC).
- Start the Cronos EVM on http://localhost:8545.
- Launch the REST API server on http://localhost:4000.

## **API Endpoints**

### **DID Operations**

- Create DID
```
POST /dids
Body: {
  "id": "did:cosmos:123",
  "publicKey": "abcd1234",
  "serviceEndpoint": "https://service.endpoint"
}
```
- Query DID
```
GET /dids/{id}
```
### **Credential Operations**

- Issue Credential
```
POST /credentials
Body: {
  "id": "cred:123",
  "issuer": "did:cosmos:issuer",
  "subject": "did:cosmos:subject",
  "claim": "verified"
}
```
- Verify Credential
```
GET /credentials/{id}
```

## **Smart Contract Deployment**

1. **Navigate to the cronos/contracts directory:
```
cd cronos/contracts
```
2. Deploy the DID smart contract on Cronos:
```
node deploy.js
```
3. Copy the deployed contract address into server.js under the API directory.

