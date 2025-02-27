/**
 * Secure Tunnel Service
 * 
 * This service manages secure tunnel connections between wallets and the SSO middleware
 * using libp2p and lattice-based encryption.
 */

const SecureTunnelNode = require('./libp2p-node');
const { Kyber, Dilithium } = require('./lattice-crypto');
const crypto = require('crypto');

/**
 * Secure Tunnel Service
 */
class TunnelService {
  /**
   * Create a new TunnelService
   * @param {Object} options - Configuration options
   * @param {string} options.type - Node type ('wallet' or 'middleware')
   * @param {string} options.region - Region for data sovereignty (e.g., 'EU', 'US')
   * @param {Array<string>} options.bootstrapList - List of bootstrap nodes
   * @param {Object} options.didManager - DID Manager instance (for middleware)
   * @param {Object} options.ssoService - SSO Service instance (for middleware)
   */
  constructor(options) {
    this.type = options.type;
    this.region = options.region;
    this.bootstrapList = options.bootstrapList || [];
    this.didManager = options.didManager;
    this.ssoService = options.ssoService;
    
    // Create secure tunnel node
    this.node = new SecureTunnelNode({
      type: this.type,
      region: this.region,
      bootstrapList: this.bootstrapList,
      messageHandler: this._handleMessage.bind(this)
    });
    
    // Initialize crypto
    this.kyber = new Kyber();
    this.dilithium = new Dilithium();
    
    // Store active sessions
    this.sessions = new Map();
    
    // Store middleware peer IDs by region
    this.middlewarePeers = {
      'EU': process.env.EU_MIDDLEWARE_PEER_ID || '',
      'US': process.env.US_MIDDLEWARE_PEER_ID || ''
    };
  }
  
  /**
   * Initialize the tunnel service
   * @param {string} walletKey - Wallet key (for wallet nodes)
   * @returns {Promise<string>} Peer ID
   */
  async initialize(walletKey) {
    try {
      const peerId = await this.node.initialize(walletKey);
      console.log(`Tunnel service initialized with peer ID: ${peerId}`);
      return peerId;
    } catch (error) {
      console.error('Error initializing tunnel service:', error);
      throw error;
    }
  }
  
  /**
   * Connect to middleware
   * @param {string} region - Region to connect to (e.g., 'EU', 'US')
   * @param {string} walletAddress - Wallet address
   * @param {string} walletKey - Wallet private key
   * @returns {Promise<Object>} Connection result
   */
  async connectToMiddleware(region, walletAddress, walletKey) {
    try {
      if (this.type !== 'wallet') {
        throw new Error('Only wallet nodes can connect to middleware');
      }
      
      // Get middleware peer ID for the region
      const middlewarePeerId = this.middlewarePeers[region];
      if (!middlewarePeerId) {
        throw new Error(`No middleware peer ID available for region: ${region}`);
      }
      
      // Connect to middleware
      const connection = await this.node.connectToPeer(middlewarePeerId);
      
      // Generate a challenge for authentication
      const challenge = crypto.randomBytes(32).toString('hex');
      
      // Sign the challenge with the wallet key
      const signature = this.node.signChallenge(challenge, walletKey);
      
      // Send authentication request
      const authResult = await this.node.sendMessage(middlewarePeerId, {
        type: 'auth',
        walletAddress,
        challenge,
        signature
      });
      
      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.error}`);
      }
      
      // Store session
      this.sessions.set(middlewarePeerId, {
        walletAddress,
        region,
        sessionId: authResult.sessionId,
        established: true
      });
      
      return {
        peerId: middlewarePeerId,
        sessionId: authResult.sessionId,
        connected: true
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
      if (this.type !== 'wallet') {
        throw new Error('Only wallet nodes can request vault decryption');
      }
      
      // Get active middleware connection
      const middlewarePeerId = Array.from(this.sessions.keys())[0];
      if (!middlewarePeerId) {
        throw new Error('No active middleware connection');
      }
      
      const session = this.sessions.get(middlewarePeerId);
      
      // Send vault decryption request
      const result = await this.node.sendMessage(middlewarePeerId, {
        type: 'vault_decrypt',
        sessionId: session.sessionId,
        vaultCid
      });
      
      if (!result.success) {
        throw new Error(`Vault decryption failed: ${result.error}`);
      }
      
      return {
        vaultData: result.vaultData,
        merkleRoots: result.merkleRoots
      };
    } catch (error) {
      console.error('Error requesting vault decryption:', error);
      throw error;
    }
  }
  
  /**
   * Request SSO login
   * @param {Object} params - Login parameters
   * @returns {Promise<Object>} Login result
   */
  async requestSSOLogin(params) {
    try {
      if (this.type !== 'wallet') {
        throw new Error('Only wallet nodes can request SSO login');
      }
      
      // Get active middleware connection
      const middlewarePeerId = Array.from(this.sessions.keys())[0];
      if (!middlewarePeerId) {
        throw new Error('No active middleware connection');
      }
      
      const session = this.sessions.get(middlewarePeerId);
      
      // Send SSO login request
      const result = await this.node.sendMessage(middlewarePeerId, {
        type: 'sso_login',
        sessionId: session.sessionId,
        ...params
      });
      
      if (!result.success) {
        throw new Error(`SSO login failed: ${result.error}`);
      }
      
      return {
        token: result.token,
        expiresIn: result.expiresIn
      };
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
      if (this.type !== 'wallet') {
        throw new Error('Only wallet nodes can request app tokens');
      }
      
      // Get active middleware connection
      const middlewarePeerId = Array.from(this.sessions.keys())[0];
      if (!middlewarePeerId) {
        throw new Error('No active middleware connection');
      }
      
      const session = this.sessions.get(middlewarePeerId);
      
      // Send app token request
      const result = await this.node.sendMessage(middlewarePeerId, {
        type: 'app_token',
        sessionId: session.sessionId,
        appId,
        ssoToken
      });
      
      if (!result.success) {
        throw new Error(`App token request failed: ${result.error}`);
      }
      
      return {
        appId,
        token: result.token,
        tokenType: result.tokenType
      };
    } catch (error) {
      console.error('Error requesting app token:', error);
      throw error;
    }
  }
  
  /**
   * Stop the tunnel service
   * @returns {Promise<void>}
   */
  async stop() {
    try {
      await this.node.stop();
      console.log('Tunnel service stopped');
    } catch (error) {
      console.error('Error stopping tunnel service:', error);
      throw error;
    }
  }
  
  // Private methods
  
  /**
   * Handle incoming messages
   * @param {string} peerId - Peer ID
   * @param {Object} message - Incoming message
   * @returns {Promise<Object>} Response message
   * @private
   */
  async _handleMessage(peerId, message) {
    try {
      console.log(`Received message from peer ${peerId}:`, message.type);
      
      switch (message.type) {
        case 'auth':
          return await this._handleAuth(peerId, message);
        
        case 'vault_decrypt':
          return await this._handleVaultDecrypt(peerId, message);
        
        case 'sso_login':
          return await this._handleSSOLogin(peerId, message);
        
        case 'app_token':
          return await this._handleAppToken(peerId, message);
        
        default:
          return {
            success: false,
            error: `Unknown message type: ${message.type}`
          };
      }
    } catch (error) {
      console.error(`Error handling message from peer ${peerId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Handle authentication request
   * @param {string} peerId - Peer ID
   * @param {Object} message - Authentication message
   * @returns {Promise<Object>} Authentication response
   * @private
   */
  async _handleAuth(peerId, message) {
    try {
      if (this.type !== 'middleware') {
        throw new Error('Only middleware nodes can handle authentication');
      }
      
      const { walletAddress, challenge, signature } = message;
      
      // Verify signature
      const isValid = this.node.verifySignature(challenge, signature, walletAddress);
      
      if (!isValid) {
        throw new Error('Invalid signature');
      }
      
      // Generate session ID
      const sessionId = crypto.randomBytes(16).toString('hex');
      
      // Store session
      this.sessions.set(peerId, {
        walletAddress,
        sessionId,
        established: true,
        createdAt: Date.now()
      });
      
      return {
        success: true,
        sessionId
      };
    } catch (error) {
      console.error('Error handling authentication:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Handle vault decryption request
   * @param {string} peerId - Peer ID
   * @param {Object} message - Vault decryption message
   * @returns {Promise<Object>} Vault decryption response
   * @private
   */
  async _handleVaultDecrypt(peerId, message) {
    try {
      if (this.type !== 'middleware') {
        throw new Error('Only middleware nodes can handle vault decryption');
      }
      
      const { sessionId, vaultCid } = message;
      
      // Verify session
      const session = this.sessions.get(peerId);
      if (!session || session.sessionId !== sessionId) {
        throw new Error('Invalid session');
      }
      
      // Get identity from DID Manager
      const identity = await this.didManager.getIdentity(session.walletAddress);
      
      if (!identity || !identity.isActive) {
        throw new Error('Identity not found or inactive');
      }
      
      // Fetch vault data from IPFS
      const vaultData = await this.didManager.fetchFromIPFS(vaultCid);
      
      return {
        success: true,
        vaultData,
        merkleRoots: identity.merkleRoots
      };
    } catch (error) {
      console.error('Error handling vault decryption:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Handle SSO login request
   * @param {string} peerId - Peer ID
   * @param {Object} message - SSO login message
   * @returns {Promise<Object>} SSO login response
   * @private
   */
  async _handleSSOLogin(peerId, message) {
    try {
      if (this.type !== 'middleware') {
        throw new Error('Only middleware nodes can handle SSO login');
      }
      
      const { sessionId } = message;
      
      // Verify session
      const session = this.sessions.get(peerId);
      if (!session || session.sessionId !== sessionId) {
        throw new Error('Invalid session');
      }
      
      // Perform SSO login
      const loginResult = await this.ssoService.login({
        walletAddress: session.walletAddress,
        // Use the secure tunnel session as authentication
        // instead of requiring a separate signature
        tunnelAuthenticated: true,
        sessionId
      });
      
      return {
        success: true,
        token: loginResult.token,
        expiresIn: loginResult.expiresIn
      };
    } catch (error) {
      console.error('Error handling SSO login:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Handle app token request
   * @param {string} peerId - Peer ID
   * @param {Object} message - App token message
   * @returns {Promise<Object>} App token response
   * @private
   */
  async _handleAppToken(peerId, message) {
    try {
      if (this.type !== 'middleware') {
        throw new Error('Only middleware nodes can handle app token requests');
      }
      
      const { sessionId, appId, ssoToken } = message;
      
      // Verify session
      const session = this.sessions.get(peerId);
      if (!session || session.sessionId !== sessionId) {
        throw new Error('Invalid session');
      }
      
      // Get app token
      const appTokenResult = await this.ssoService.getAppToken({
        ssoToken,
        appId
      });
      
      return {
        success: true,
        token: appTokenResult.token,
        tokenType: appTokenResult.tokenType
      };
    } catch (error) {
      console.error('Error handling app token request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = TunnelService;