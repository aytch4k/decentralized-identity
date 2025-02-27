/**
 * Secure Tunnel Implementation using libp2p with Lattice-based Encryption
 * 
 * This module implements a secure point-to-point tunnel between the wallet and
 * the SSO middleware using libp2p for P2P communication and lattice-based
 * encryption for post-quantum security.
 */

const Libp2p = require('libp2p');
const TCP = require('libp2p-tcp');
const WebSockets = require('libp2p-websockets');
const { NOISE } = require('libp2p-noise');
const MPLEX = require('libp2p-mplex');
const Bootstrap = require('libp2p-bootstrap');
const KadDHT = require('libp2p-kad-dht');
const PeerId = require('peer-id');
const crypto = require('crypto');
const { Kyber, Dilithium } = require('./lattice-crypto');

/**
 * Libp2p Node for Secure Tunnel
 */
class SecureTunnelNode {
  /**
   * Create a new SecureTunnelNode
   * @param {Object} options - Configuration options
   * @param {string} options.type - Node type ('wallet' or 'middleware')
   * @param {string} options.region - Region for data sovereignty (e.g., 'EU', 'US')
   * @param {Array<string>} options.bootstrapList - List of bootstrap nodes
   * @param {Function} options.messageHandler - Function to handle incoming messages
   */
  constructor(options) {
    this.type = options.type;
    this.region = options.region;
    this.bootstrapList = options.bootstrapList || [];
    this.messageHandler = options.messageHandler;
    this.connections = new Map();
    this.node = null;
    this.peerId = null;
    this.kyber = new Kyber();
    this.dilithium = new Dilithium();
  }

  /**
   * Initialize the libp2p node
   * @param {Object} walletKey - Wallet key for deriving peer ID (for wallet nodes)
   * @returns {Promise<void>}
   */
  async initialize(walletKey) {
    try {
      // Generate or derive peer ID
      if (this.type === 'wallet' && walletKey) {
        // Derive peer ID from wallet key
        this.peerId = await this._derivePeerIdFromWallet(walletKey);
      } else {
        // Generate random peer ID for middleware
        this.peerId = await PeerId.create();
      }

      // Create libp2p node
      this.node = await Libp2p.create({
        peerId: this.peerId,
        addresses: {
          listen: this._getListenAddresses()
        },
        modules: {
          transport: [TCP, WebSockets],
          connEncryption: [NOISE],
          streamMuxer: [MPLEX],
          dht: KadDHT,
          peerDiscovery: [Bootstrap]
        },
        config: {
          peerDiscovery: {
            bootstrap: {
              list: this.bootstrapList
            }
          },
          dht: {
            enabled: true,
            randomWalk: {
              enabled: true
            }
          }
        }
      });

      // Register protocol handler
      await this.node.handle('/sovereign-did/1.0', this._handleProtocol.bind(this));

      // Start the node
      await this.node.start();
      console.log(`Libp2p node started with peer ID: ${this.peerId.toB58String()}`);

      // Set up event listeners
      this._setupEventListeners();

      return this.peerId.toB58String();
    } catch (error) {
      console.error('Error initializing libp2p node:', error);
      throw error;
    }
  }

  /**
   * Connect to a peer
   * @param {string} peerIdString - Peer ID to connect to
   * @returns {Promise<Object>} Connection information
   */
  async connectToPeer(peerIdString) {
    try {
      // Connect to the peer
      const connection = await this.node.dial(peerIdString);
      
      // Perform Noise handshake with Kyber key exchange
      const { sharedKey, encryptedKey } = await this._performKeyExchange(connection);
      
      // Store connection and shared key
      this.connections.set(peerIdString, {
        connection,
        sharedKey,
        streams: new Map()
      });
      
      return {
        peerId: peerIdString,
        connected: true,
        encryptedKey
      };
    } catch (error) {
      console.error(`Error connecting to peer ${peerIdString}:`, error);
      throw error;
    }
  }

  /**
   * Send a message to a peer
   * @param {string} peerIdString - Peer ID to send message to
   * @param {Object} message - Message to send
   * @returns {Promise<Object>} Response from peer
   */
  async sendMessage(peerIdString, message) {
    try {
      const peerConnection = this.connections.get(peerIdString);
      
      if (!peerConnection) {
        throw new Error(`No connection to peer ${peerIdString}`);
      }
      
      // Get or create a stream for the protocol
      let stream = peerConnection.streams.get('/sovereign-did/1.0');
      
      if (!stream) {
        stream = await peerConnection.connection.newStream('/sovereign-did/1.0');
        peerConnection.streams.set('/sovereign-did/1.0', stream);
      }
      
      // Encrypt message with shared key
      const encryptedMessage = this._encryptMessage(message, peerConnection.sharedKey);
      
      // Send message
      await this._writeToStream(stream, JSON.stringify(encryptedMessage));
      
      // Wait for response
      const responseData = await this._readFromStream(stream);
      const encryptedResponse = JSON.parse(responseData.toString());
      
      // Decrypt response
      const response = this._decryptMessage(encryptedResponse, peerConnection.sharedKey);
      
      return response;
    } catch (error) {
      console.error(`Error sending message to peer ${peerIdString}:`, error);
      throw error;
    }
  }

  /**
   * Sign a challenge with Dilithium
   * @param {string} challenge - Challenge to sign
   * @param {Object} walletKey - Wallet key for signing
   * @returns {string} Signature
   */
  signChallenge(challenge, walletKey) {
    return this.dilithium.sign(challenge, walletKey);
  }

  /**
   * Verify a signature with Dilithium
   * @param {string} challenge - Original challenge
   * @param {string} signature - Signature to verify
   * @param {string} publicKey - Public key for verification
   * @returns {boolean} Whether the signature is valid
   */
  verifySignature(challenge, signature, publicKey) {
    return this.dilithium.verify(challenge, signature, publicKey);
  }

  /**
   * Stop the libp2p node
   * @returns {Promise<void>}
   */
  async stop() {
    if (this.node) {
      await this.node.stop();
      console.log('Libp2p node stopped');
    }
  }

  // Private methods

  /**
   * Get listen addresses based on node type
   * @returns {Array<string>} Listen addresses
   * @private
   */
  _getListenAddresses() {
    if (this.type === 'wallet') {
      // Wallet nodes listen on WebSockets
      return ['/ip4/0.0.0.0/tcp/0/ws'];
    } else {
      // Middleware nodes listen on both TCP and WebSockets
      return [
        '/ip4/0.0.0.0/tcp/9090',
        '/ip4/0.0.0.0/tcp/9091/ws'
      ];
    }
  }

  /**
   * Derive peer ID from wallet key
   * @param {Object} walletKey - Wallet key
   * @returns {Promise<PeerId>} Derived peer ID
   * @private
   */
  async _derivePeerIdFromWallet(walletKey) {
    // In a real implementation, this would derive a deterministic peer ID
    // from the wallet's private key. For simplicity, we'll use a hash.
    const hash = crypto.createHash('sha256').update(walletKey).digest();
    return await PeerId.createFromPrivKey(hash);
  }

  /**
   * Set up event listeners for the libp2p node
   * @private
   */
  _setupEventListeners() {
    this.node.connectionManager.on('peer:connect', (connection) => {
      console.log(`Connected to peer: ${connection.remotePeer.toB58String()}`);
    });

    this.node.connectionManager.on('peer:disconnect', (connection) => {
      console.log(`Disconnected from peer: ${connection.remotePeer.toB58String()}`);
      // Clean up connection
      this.connections.delete(connection.remotePeer.toB58String());
    });
  }

  /**
   * Handle incoming protocol streams
   * @param {Object} params - Protocol handler parameters
   * @private
   */
  async _handleProtocol({ connection, stream }) {
    try {
      const peerId = connection.remotePeer.toB58String();
      console.log(`New stream from peer: ${peerId}`);
      
      // If this is a new peer, perform key exchange
      if (!this.connections.has(peerId)) {
        const { sharedKey } = await this._performKeyExchange(connection);
        
        this.connections.set(peerId, {
          connection,
          sharedKey,
          streams: new Map()
        });
        
        this.connections.get(peerId).streams.set('/sovereign-did/1.0', stream);
      }
      
      // Handle incoming messages
      this._handleStream(peerId, stream);
    } catch (error) {
      console.error('Error handling protocol:', error);
    }
  }

  /**
   * Handle incoming stream data
   * @param {string} peerId - Peer ID
   * @param {Object} stream - Protocol stream
   * @private
   */
  async _handleStream(peerId, stream) {
    try {
      // Read from stream
      const data = await this._readFromStream(stream);
      const encryptedMessage = JSON.parse(data.toString());
      
      // Get connection info
      const peerConnection = this.connections.get(peerId);
      
      if (!peerConnection) {
        throw new Error(`No connection info for peer ${peerId}`);
      }
      
      // Decrypt message
      const message = this._decryptMessage(encryptedMessage, peerConnection.sharedKey);
      
      // Process message with handler
      let response;
      if (this.messageHandler) {
        response = await this.messageHandler(peerId, message);
      } else {
        response = { status: 'ok', message: 'Received' };
      }
      
      // Encrypt response
      const encryptedResponse = this._encryptMessage(response, peerConnection.sharedKey);
      
      // Send response
      await this._writeToStream(stream, JSON.stringify(encryptedResponse));
      
      // Continue handling stream
      this._handleStream(peerId, stream);
    } catch (error) {
      console.error(`Error handling stream from peer ${peerId}:`, error);
    }
  }

  /**
   * Perform key exchange with peer
   * @param {Object} connection - Libp2p connection
   * @returns {Promise<Object>} Shared key and encrypted key
   * @private
   */
  async _performKeyExchange(connection) {
    // Generate Kyber key pair
    const { publicKey, privateKey } = this.kyber.generateKeyPair();
    
    // Create a new stream for key exchange
    const stream = await connection.newStream('/sovereign-did/key-exchange/1.0');
    
    // Send public key
    await this._writeToStream(stream, publicKey);
    
    // Receive peer's public key
    const peerPublicKey = await this._readFromStream(stream);
    
    // Encapsulate shared key
    const { sharedKey, encryptedKey } = this.kyber.encapsulate(peerPublicKey);
    
    // Send encrypted key
    await this._writeToStream(stream, encryptedKey);
    
    // Receive peer's encrypted key
    const peerEncryptedKey = await this._readFromStream(stream);
    
    // Decapsulate shared key
    const peerSharedKey = this.kyber.decapsulate(peerEncryptedKey, privateKey);
    
    // Combine keys for better security
    const combinedKey = crypto.createHash('sha256')
      .update(Buffer.concat([sharedKey, peerSharedKey]))
      .digest();
    
    return {
      sharedKey: combinedKey,
      encryptedKey
    };
  }

  /**
   * Encrypt a message with AES-GCM
   * @param {Object} message - Message to encrypt
   * @param {Buffer} key - Encryption key
   * @returns {Object} Encrypted message
   * @private
   */
  _encryptMessage(message, key) {
    // Generate IV
    const iv = crypto.randomBytes(12);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    // Encrypt message
    const messageStr = JSON.stringify(message);
    const encrypted = Buffer.concat([
      cipher.update(messageStr, 'utf8'),
      cipher.final()
    ]);
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      encrypted: encrypted.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt a message with AES-GCM
   * @param {Object} encryptedMessage - Encrypted message
   * @param {Buffer} key - Decryption key
   * @returns {Object} Decrypted message
   * @private
   */
  _decryptMessage(encryptedMessage, key) {
    // Parse encrypted message
    const iv = Buffer.from(encryptedMessage.iv, 'hex');
    const encrypted = Buffer.from(encryptedMessage.encrypted, 'hex');
    const authTag = Buffer.from(encryptedMessage.authTag, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt message
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  }

  /**
   * Write data to a stream
   * @param {Object} stream - Stream to write to
   * @param {string|Buffer} data - Data to write
   * @returns {Promise<void>}
   * @private
   */
  async _writeToStream(stream, data) {
    return new Promise((resolve, reject) => {
      stream.write(data, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  /**
   * Read data from a stream
   * @param {Object} stream - Stream to read from
   * @returns {Promise<Buffer>} Data read from stream
   * @private
   */
  async _readFromStream(stream) {
    return new Promise((resolve, reject) => {
      stream.once('data', (data) => {
        resolve(data);
      });
      
      stream.once('error', (err) => {
        reject(err);
      });
    });
  }
}

module.exports = SecureTunnelNode;