const Web3 = require('web3');
const axios = require('axios');
const crypto = require('crypto');
const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');
const IPFS = require('ipfs-http-client');

// Configuration
const config = {
  cronosRpc: process.env.CRONOS_RPC || 'http://cronos:8545',
  cosmosApi: process.env.COSMOS_API || 'http://cosmos:1317',
  ipfsApi: process.env.IPFS_API || 'http://ipfs:5001',
  contractAddress: process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  privateKey: process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
  ipfsRegions: {
    'EU': ['ipfs-eu-1:5001', 'ipfs-eu-2:5001'],
    'US': ['ipfs-us-1:5001', 'ipfs-us-2:5001']
  }
};

// Initialize Web3
const web3 = new Web3(config.cronosRpc);
const account = web3.eth.accounts.privateKeyToAccount(config.privateKey);
web3.eth.accounts.wallet.add(account);

// Load contract ABI
const contractABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'SovereignIdentityManager.json'), 'utf8')).abi;
const contract = new web3.eth.Contract(contractABI, config.contractAddress);

// Initialize IPFS client
const ipfs = IPFS.create({ url: config.ipfsApi });

/**
 * DID Manager class for handling DID operations
 */
class DIDManager {
  /**
   * Create a new DID
   * @param {Object} params - Parameters for DID creation
   * @param {string} params.walletAddress - User's wallet address
   * @param {string} params.region - User's region (e.g., "EU", "US")
   * @param {Object} params.didDocument - DID Document data
   * @param {Object} params.vaultData - Encrypted vault data
   * @returns {Promise<Object>} Created DID information
   */
  async createDID(params) {
    try {
      const { walletAddress, region, didDocument, vaultData } = params;
      
      // Validate parameters
      if (!walletAddress || !region || !didDocument || !vaultData) {
        throw new Error('Missing required parameters');
      }
      
      // Validate region
      if (!config.ipfsRegions[region]) {
        throw new Error(`Unsupported region: ${region}`);
      }
      
      // 1. Shard and encrypt vault data
      const shards = this.shardVaultData(vaultData);
      
      // 2. Generate Merkle roots for shards
      const merkleRoots = this.generateMerkleRoots(shards);
      
      // 3. Upload shards to IPFS (region-specific nodes)
      const vaultCid = await this.uploadToIPFS(shards, region);
      
      // 4. Generate commitment
      const secret = crypto.randomBytes(32).toString('hex');
      const commitment = this.generateCommitment(merkleRoots, secret);
      
      // 5. Get regional signatures
      const signatures = await this.getRegionalSignatures(walletAddress, commitment, region);
      
      // 6. Prepare NFT metadata
      const metadata = JSON.stringify({
        did: `did:sovereign:${walletAddress}`,
        vaultCid,
        region,
        merkleRoots: merkleRoots.map(root => root.toString('hex'))
      });
      
      // 7. Register identity on blockchain
      const tx = await contract.methods.registerIdentity(
        merkleRoots,
        commitment,
        vaultCid,
        region,
        signatures,
        web3.utils.asciiToHex(metadata)
      ).send({ from: account.address, gas: 3000000 });
      
      // 8. Return DID information
      return {
        did: `did:sovereign:${walletAddress}`,
        vaultCid,
        tokenId: tx.events.IdentityRegistered.returnValues.tokenId,
        transaction: tx.transactionHash
      };
    } catch (error) {
      console.error('Error creating DID:', error);
      throw error;
    }
  }
  
  /**
   * Resolve a DID to its DID Document
   * @param {string} did - DID to resolve
   * @returns {Promise<Object>} Resolved DID Document
   */
  async resolveDID(did) {
    try {
      // Extract wallet address from DID
      const walletAddress = did.split(':')[2];
      
      // Get identity from blockchain
      const identity = await contract.methods.getIdentity(walletAddress).call();
      
      // Get token metadata
      const tokenMetadata = await contract.methods.getTokenMetadata(identity.identityTokenId).call();
      const metadata = JSON.parse(web3.utils.hexToAscii(tokenMetadata));
      
      // Fetch vault data from IPFS
      const vaultData = await this.fetchFromIPFS(identity.vaultCid);
      
      return {
        did,
        controller: walletAddress,
        vaultCid: identity.vaultCid,
        region: identity.region,
        createdAt: new Date(identity.createdAt * 1000).toISOString(),
        isActive: identity.isActive,
        metadata
      };
    } catch (error) {
      console.error('Error resolving DID:', error);
      throw error;
    }
  }
  
  /**
   * Update vault data for a DID
   * @param {Object} params - Parameters for vault update
   * @param {string} params.walletAddress - User's wallet address
   * @param {Object} params.vaultData - New encrypted vault data
   * @returns {Promise<Object>} Updated vault information
   */
  async updateVault(params) {
    try {
      const { walletAddress, vaultData } = params;
      
      // Get current identity
      const identity = await contract.methods.getIdentity(walletAddress).call();
      
      // 1. Shard and encrypt new vault data
      const shards = this.shardVaultData(vaultData);
      
      // 2. Generate new Merkle roots
      const newMerkleRoots = this.generateMerkleRoots(shards);
      
      // 3. Upload new shards to IPFS
      const newVaultCid = await this.uploadToIPFS(shards, identity.region);
      
      // 4. Generate new commitment
      const secret = crypto.randomBytes(32).toString('hex');
      const newCommitment = this.generateCommitment(newMerkleRoots, secret);
      
      // 5. Update vault on blockchain
      const tx = await contract.methods.updateVault(
        newMerkleRoots,
        newCommitment,
        newVaultCid
      ).send({ from: walletAddress, gas: 2000000 });
      
      return {
        vaultCid: newVaultCid,
        transaction: tx.transactionHash
      };
    } catch (error) {
      console.error('Error updating vault:', error);
      throw error;
    }
  }
  
  /**
   * Authorize export of vault data
   * @param {Object} params - Parameters for export authorization
   * @param {string} params.walletAddress - User's wallet address
   * @param {string} params.consentPurpose - Purpose of the export
   * @param {string} params.recipient - Recipient of the export
   * @returns {Promise<Object>} Export authorization information
   */
  async authorizeExport(params) {
    try {
      const { walletAddress, consentPurpose, recipient } = params;
      
      // Prepare export metadata
      const exportMetadata = JSON.stringify({
        consent: consentPurpose,
        recipient,
        timestamp: new Date().toISOString()
      });
      
      // Authorize export on blockchain
      const tx = await contract.methods.authorizeExport(
        web3.utils.asciiToHex(exportMetadata)
      ).send({ from: walletAddress, gas: 1000000 });
      
      return {
        exportTokenId: tx.events.ExportAuthorized.returnValues.exportTokenId,
        transaction: tx.transactionHash
      };
    } catch (error) {
      console.error('Error authorizing export:', error);
      throw error;
    }
  }
  
  /**
   * Revoke a DID
   * @param {string} walletAddress - Wallet address of the DID owner
   * @returns {Promise<Object>} Revocation information
   */
  async revokeDID(walletAddress) {
    try {
      // Revoke identity on blockchain
      const tx = await contract.methods.revokeIdentity()
        .send({ from: walletAddress, gas: 1000000 });
      
      return {
        transaction: tx.transactionHash,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error revoking DID:', error);
      throw error;
    }
  }
  
  /**
   * Add credentials to a DID's vault
   * @param {Object} params - Parameters for adding credentials
   * @param {string} params.did - DID to add credentials to
   * @param {string} params.appId - Application ID
   * @param {Object} params.credentials - Encrypted credentials
   * @returns {Promise<Object>} Updated vault information
   */
  async addCredentials(params) {
    try {
      const { did, appId, credentials } = params;
      
      // Extract wallet address from DID
      const walletAddress = did.split(':')[2];
      
      // Get current identity
      const identity = await contract.methods.getIdentity(walletAddress).call();
      
      // Fetch current vault data
      const vaultData = await this.fetchFromIPFS(identity.vaultCid);
      
      // Add new credentials to vault
      vaultData.contents = vaultData.contents || [];
      vaultData.contents.push({
        id: `entry-${Date.now()}`,
        type: 'password',
        context: {
          appId
        },
        data: credentials,
        metadata: {
          created: new Date().toISOString()
        }
      });
      
      // Update vault
      return await this.updateVault({
        walletAddress,
        vaultData
      });
    } catch (error) {
      console.error('Error adding credentials:', error);
      throw error;
    }
  }
  
  /**
   * Get credentials for a specific app from a DID's vault
   * @param {Object} params - Parameters for getting credentials
   * @param {string} params.did - DID to get credentials from
   * @param {string} params.appId - Application ID
   * @returns {Promise<Object>} Credentials for the app
   */
  async getCredentials(params) {
    try {
      const { did, appId } = params;
      
      // Extract wallet address from DID
      const walletAddress = did.split(':')[2];
      
      // Get identity from blockchain
      const identity = await contract.methods.getIdentity(walletAddress).call();
      
      // Fetch vault data from IPFS
      const vaultData = await this.fetchFromIPFS(identity.vaultCid);
      
      // Find credentials for the app
      const appCredentials = vaultData.contents.find(entry => 
        entry.type === 'password' && entry.context.appId === appId
      );
      
      if (!appCredentials) {
        throw new Error(`No credentials found for app: ${appId}`);
      }
      
      return appCredentials.data;
    } catch (error) {
      console.error('Error getting credentials:', error);
      throw error;
    }
  }
  
  /**
   * Verify a DID proof
   * @param {Object} params - Parameters for verification
   * @param {string} params.did - DID to verify
   * @param {string} params.challenge - Challenge string
   * @param {string} params.signature - Signature of the challenge
   * @returns {Promise<boolean>} Whether the proof is valid
   */
  async verifyDIDProof(params) {
    try {
      const { did, challenge, signature } = params;
      
      // Extract wallet address from DID
      const walletAddress = did.split(':')[2];
      
      // Verify signature
      const messageHash = web3.utils.sha3(challenge);
      const signer = web3.eth.accounts.recover(messageHash, signature);
      
      // Check if signer matches wallet address
      return signer.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
      console.error('Error verifying DID proof:', error);
      throw error;
    }
  }
  
  // Helper methods
  
  /**
   * Shard vault data into multiple pieces
   * @param {Object} vaultData - Vault data to shard
   * @returns {Array<Object>} Array of shards
   */
  shardVaultData(vaultData) {
    // For simplicity, we'll just create one shard per vault entry
    // In a production system, this would use more sophisticated sharding
    const shards = [];
    
    if (vaultData.contents && Array.isArray(vaultData.contents)) {
      // Create a shard for each content entry
      vaultData.contents.forEach((entry, index) => {
        shards.push({
          id: `shard-${index}`,
          data: { entry }
        });
      });
    } else {
      // If no contents, create a single shard
      shards.push({
        id: 'shard-0',
        data: { vaultSpec: vaultData.vaultSpec, vaultId: vaultData.vaultId }
      });
    }
    
    return shards;
  }
  
  /**
   * Generate Merkle roots for shards
   * @param {Array<Object>} shards - Shards to generate roots for
   * @returns {Array<string>} Array of Merkle roots
   */
  generateMerkleRoots(shards) {
    // For simplicity, we'll just hash each shard
    // In a production system, this would build proper Merkle trees
    return shards.map(shard => {
      const shardData = JSON.stringify(shard);
      return createHash('sha256').update(shardData).digest();
    });
  }
  
  /**
   * Generate commitment from Merkle roots and secret
   * @param {Array<string>} merkleRoots - Merkle roots
   * @param {string} secret - Secret value
   * @returns {string} Commitment hash
   */
  generateCommitment(merkleRoots, secret) {
    const combinedData = merkleRoots.join('') + secret;
    return web3.utils.sha3(combinedData);
  }
  
  /**
   * Upload shards to IPFS
   * @param {Array<Object>} shards - Shards to upload
   * @param {string} region - Region for IPFS nodes
   * @returns {Promise<string>} IPFS CID of the uploaded data
   */
  async uploadToIPFS(shards, region) {
    // In a production system, this would pin to region-specific nodes
    const content = JSON.stringify(shards);
    const result = await ipfs.add(content);
    return result.path;
  }
  
  /**
   * Fetch data from IPFS
   * @param {string} cid - IPFS CID to fetch
   * @returns {Promise<Object>} Fetched data
   */
  async fetchFromIPFS(cid) {
    const chunks = [];
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks).toString();
    return JSON.parse(content);
  }
  
  /**
   * Get signatures from regional nodes
   * @param {string} walletAddress - Wallet address
   * @param {string} commitment - Commitment hash
   * @param {string} region - Region
   * @returns {Promise<Array<string>>} Array of signatures
   */
  async getRegionalSignatures(walletAddress, commitment, region) {
    // In a production system, this would request signatures from actual nodes
    // For now, we'll simulate signatures
    const message = web3.utils.soliditySha3(
      { t: 'address', v: walletAddress },
      { t: 'bytes32', v: commitment },
      { t: 'string', v: region }
    );
    
    // Generate 3 signatures from different accounts
    const signatures = [];
    for (let i = 1; i <= 3; i++) {
      const privateKey = `0x${i.toString().padStart(64, '0')}`;
      const account = web3.eth.accounts.privateKeyToAccount(privateKey);
      const signature = account.sign(message).signature;
      signatures.push(signature);
    }
    
    return signatures;
  }
}

module.exports = new DIDManager();