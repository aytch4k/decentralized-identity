/**
 * Secure Tunnel Client
 * 
 * This client-side library provides a secure tunnel between the wallet and
 * the SSO middleware using libp2p and lattice-based encryption.
 */

class SecureTunnelClient {
  /**
   * Create a new SecureTunnelClient instance
   * @param {Object} config - Configuration options
   * @param {string} config.apiUrl - URL of the DID API server
   * @param {Object} config.web3Provider - Web3 provider instance (e.g., window.ethereum)
   */
  constructor(config) {
    this.apiUrl = config.apiUrl || 'http://localhost:4000';
    this.web3Provider = config.web3Provider;
    this.web3 = null;
    this.walletAddress = null;
    this.walletKey = null;
    this.region = 'EU'; // Default region
    this.tunnelNode = null;
    this.middlewarePeerId = null;
    this.connected = false;
    this.sessionId = null;
  }

  /**
   * Initialize the secure tunnel
   * @param {string} region - Region for data sovereignty (e.g., 'EU', 'US')
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(region = 'EU') {
    try {
      if (!this.web3Provider) {
        throw new Error('Web3 provider is required');
      }

      // Initialize Web3
      this.web3 = new Web3(this.web3Provider);
      
      // Set region
      this.region = region;
      
      // Check if already connected
      const accounts = await this.web3.eth.getAccounts();
      if (accounts.length > 0) {
        this.walletAddress = accounts[0];
      } else {
        throw new Error('No wallet connected');
      }
      
      // Load libp2p dependencies
      await this._loadDependencies();
      
      // Create libp2p node
      this.tunnelNode = new window.SecureTunnelNode({
        type: 'wallet',
        region: this.region,
        bootstrapList: await this._getBootstrapList()
      });
      
      // Initialize node with wallet key
      this.walletKey = await this._getWalletKey();
      const peerId = await this.tunnelNode.initialize(this.walletKey);
      
      console.log('Secure tunnel initialized with peer ID:', peerId);
      
      return {
        peerId,
        region: this.region,
        initialized: true
      };
    } catch (error) {
      console.error('Error initializing secure tunnel:', error);
      throw error;
    }
  }

  /**
   * Connect to middleware
   * @returns {Promise<Object>} Connection result
   */
  async connect() {
    try {
      if (!this.tunnelNode) {
        throw new Error('Tunnel not initialized');
      }
      
      if (!this.walletAddress) {
        throw new Error('No wallet connected');
      }
      
      // Get middleware peer ID for the region
      this.middlewarePeerId = await this._getMiddlewarePeerId(this.region);
      
      // Connect to middleware
      const result = await this.tunnelNode.connectToMiddleware(
        this.region,
        this.walletAddress,
        this.walletKey
      );
      
      this.connected = result.connected;
      this.sessionId = result.sessionId;
      
      console.log('Connected to middleware:', result);
      
      return {
        connected: this.connected,
        sessionId: this.sessionId,
        peerId: this.middlewarePeerId
      };
    } catch (error) {
      console.error('Error connecting to middleware:', error);
      throw error;
    }
  }

  /**
   * Request vault decryption
   * @param {string} vaultCid - Vault CID to decrypt
   * @returns {Promise<Object>} Decryption result
   */
  async requestVaultDecryption(vaultCid) {
    try {
      if (!this.connected) {
        throw new Error('Not connected to middleware');
      }
      
      // Request vault decryption
      const result = await this.tunnelNode.requestVaultDecryption(vaultCid);
      
      return result;
    } catch (error) {
      console.error('Error requesting vault decryption:', error);
      throw error;
    }
  }

  /**
   * Request SSO login
   * @returns {Promise<Object>} Login result
   */
  async requestSSOLogin() {
    try {
      if (!this.connected) {
        throw new Error('Not connected to middleware');
      }
      
      // Request SSO login
      const result = await this.tunnelNode.requestSSOLogin({
        walletAddress: this.walletAddress
      });
      
      return result;
    } catch (error) {
      console.error('Error requesting SSO login:', error);
      throw error;
    }
  }

  /**
   * Request app token
   * @param {string} appId - Application ID
   * @param {string} ssoToken - SSO token
   * @returns {Promise<Object>} App token result
   */
  async requestAppToken(appId, ssoToken) {
    try {
      if (!this.connected) {
        throw new Error('Not connected to middleware');
      }
      
      // Request app token
      const result = await this.tunnelNode.requestAppToken(appId, ssoToken);
      
      return result;
    } catch (error) {
      console.error('Error requesting app token:', error);
      throw error;
    }
  }

  /**
   * Disconnect from middleware
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (this.tunnelNode) {
        await this.tunnelNode.stop();
        this.connected = false;
        this.sessionId = null;
        console.log('Disconnected from middleware');
      }
    } catch (error) {
      console.error('Error disconnecting from middleware:', error);
      throw error;
    }
  }

  // Private methods

  /**
   * Load required dependencies
   * @returns {Promise<void>}
   * @private
   */
  async _loadDependencies() {
    // In a real implementation, this would load libp2p and related libraries
    // For demonstration, we'll assume they're already loaded or mock them
    
    // Mock SecureTunnelNode for browser
    window.SecureTunnelNode = class MockSecureTunnelNode {
      constructor(options) {
        this.options = options;
        this.peerId = null;
      }
      
      async initialize(walletKey) {
        // Generate a mock peer ID
        this.peerId = `12D3KooW${Math.random().toString(36).substring(2, 10)}`;
        return this.peerId;
      }
      
      async connectToMiddleware(region, walletAddress, walletKey) {
        // Simulate connection to middleware
        return {
          peerId: `12D3KooW${Math.random().toString(36).substring(2, 10)}`,
          sessionId: Math.random().toString(36).substring(2, 10),
          connected: true
        };
      }
      
      async requestVaultDecryption(vaultCid) {
        // Simulate vault decryption
        return {
          vaultData: {
            vaultSpec: "SovereignDiD-Vault-v1.0",
            vaultId: "mock-vault-id",
            contents: []
          },
          merkleRoots: ["0xmock-merkle-root"]
        };
      }
      
      async requestSSOLogin(params) {
        // Simulate SSO login
        return {
          token: `mock-sso-token-${Math.random().toString(36).substring(2, 10)}`,
          expiresIn: "1h"
        };
      }
      
      async requestAppToken(appId, ssoToken) {
        // Simulate app token request
        return {
          appId,
          token: `mock-app-token-${Math.random().toString(36).substring(2, 10)}`,
          tokenType: "oauth"
        };
      }
      
      async stop() {
        // Simulate stopping the node
        this.peerId = null;
      }
    };
  }

  /**
   * Get bootstrap list for the region
   * @returns {Promise<Array<string>>} Bootstrap list
   * @private
   */
  async _getBootstrapList() {
    try {
      // In a real implementation, this would fetch the bootstrap list from the API
      // For demonstration, we'll use hardcoded values
      const bootstrapLists = {
        'EU': [
          '/ip4/eu-bootstrap-1.example.com/tcp/9090/p2p/12D3KooWA1b3VqbmaKj7D4u5R9wygV3z9uNT7UUFvmWA6QTy7x1W',
          '/ip4/eu-bootstrap-2.example.com/tcp/9090/p2p/12D3KooWB2b3VqbmaKj7D4u5R9wygV3z9uNT7UUFvmWA6QTy7x1X'
        ],
        'US': [
          '/ip4/us-bootstrap-1.example.com/tcp/9090/p2p/12D3KooWC3b3VqbmaKj7D4u5R9wygV3z9uNT7UUFvmWA6QTy7x1Y',
          '/ip4/us-bootstrap-2.example.com/tcp/9090/p2p/12D3KooWD4b3VqbmaKj7D4u5R9wygV3z9uNT7UUFvmWA6QTy7x1Z'
        ]
      };
      
      return bootstrapLists[this.region] || [];
    } catch (error) {
      console.error('Error getting bootstrap list:', error);
      return [];
    }
  }

  /**
   * Get middleware peer ID for the region
   * @param {string} region - Region
   * @returns {Promise<string>} Middleware peer ID
   * @private
   */
  async _getMiddlewarePeerId(region) {
    try {
      // In a real implementation, this would fetch the middleware peer ID from the API
      // For demonstration, we'll use hardcoded values
      const middlewarePeers = {
        'EU': '12D3KooWE5b3VqbmaKj7D4u5R9wygV3z9uNT7UUFvmWA6QTy7x1A',
        'US': '12D3KooWF6b3VqbmaKj7D4u5R9wygV3z9uNT7UUFvmWA6QTy7x1B'
      };
      
      return middlewarePeers[region] || '';
    } catch (error) {
      console.error('Error getting middleware peer ID:', error);
      return '';
    }
  }

  /**
   * Get wallet key for authentication
   * @returns {Promise<string>} Wallet key
   * @private
   */
  async _getWalletKey() {
    try {
      // In a real implementation, this would use the wallet's private key
      // For demonstration, we'll use a mock key derived from the address
      return `mock-wallet-key-${this.walletAddress}`;
    } catch (error) {
      console.error('Error getting wallet key:', error);
      throw error;
    }
  }
}

// Export for browser and Node.js environments
if (typeof window !== 'undefined') {
  window.SecureTunnelClient = SecureTunnelClient;
} else {
  module.exports = SecureTunnelClient;
}