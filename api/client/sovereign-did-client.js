/**
 * Sovereign DID Client
 * A client-side library for interacting with the Sovereign DID and SSO services
 */
class SovereignDIDClient {
  /**
   * Create a new SovereignDIDClient instance
   * @param {Object} config - Configuration options
   * @param {string} config.apiUrl - URL of the DID API server
   * @param {Object} config.web3Provider - Web3 provider instance (e.g., window.ethereum)
   * @param {boolean} config.useSecureTunnel - Whether to use secure tunnel for communication
   * @param {string} config.region - Region for data sovereignty (e.g., 'EU', 'US')
   */
  constructor(config) {
    this.apiUrl = config.apiUrl || 'http://localhost:4000';
    this.web3Provider = config.web3Provider;
    this.web3 = null;
    this.ssoToken = null;
    this.walletAddress = null;
    this.did = null;
    this.useSecureTunnel = config.useSecureTunnel || false;
    this.region = config.region || 'EU';
    this.secureTunnel = null;
  }

  /**
   * Initialize the client
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.web3Provider) {
      throw new Error('Web3 provider is required');
    }

    // Initialize Web3
    this.web3 = new Web3(this.web3Provider);
    
    // Check if already connected
    const accounts = await this.web3.eth.getAccounts();
    if (accounts.length > 0) {
      this.walletAddress = accounts[0];
      this.did = `did:sovereign:${this.walletAddress}`;
    }
    
    // Initialize secure tunnel if enabled
    if (this.useSecureTunnel) {
      try {
        // Load the secure tunnel client
        if (typeof SecureTunnelClient === 'undefined') {
          console.warn('SecureTunnelClient not found, loading from API server');
          await this._loadScript(`${this.apiUrl}/client/secure-tunnel-client.js`);
        }
        
        // Create and initialize the secure tunnel
        this.secureTunnel = new SecureTunnelClient({
          apiUrl: this.apiUrl,
          web3Provider: this.web3Provider
        });
        
        // Initialize the tunnel with the selected region
        await this.secureTunnel.initialize(this.region);
        console.log('Secure tunnel initialized');
      } catch (error) {
        console.error('Failed to initialize secure tunnel:', error);
        // Fall back to regular API communication
        this.useSecureTunnel = false;
      }
    }
  }

  /**
   * Connect wallet
   * @returns {Promise<Object>} Connection result
   */
  async connectWallet() {
    try {
      // Request account access
      const accounts = await this.web3Provider.request({ method: 'eth_requestAccounts' });
      this.walletAddress = accounts[0];
      this.did = `did:sovereign:${this.walletAddress}`;
      
      return {
        walletAddress: this.walletAddress,
        did: this.did
      };
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  /**
   * Login with wallet
   * @returns {Promise<Object>} Login result with SSO token
   */
  async login() {
    try {
      if (!this.walletAddress) {
        await this.connectWallet();
      }
      
      let loginResult;
      
      if (this.useSecureTunnel && this.secureTunnel) {
        // Connect to middleware if not already connected
        if (!this.secureTunnel.connected) {
          await this.secureTunnel.connect();
        }
        
        // Request SSO login via secure tunnel
        loginResult = await this.secureTunnel.requestSSOLogin();
      } else {
        // Traditional API-based login
        // 1. Get challenge
        const challengeResponse = await fetch(`${this.apiUrl}/api/sso/challenge/${this.walletAddress}`);
        const { challenge } = await challengeResponse.json();
        
        // 2. Sign challenge
        const signature = await this.signMessage(challenge);
        
        // 3. Login with signature
        const loginResponse = await fetch(`${this.apiUrl}/api/sso/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            walletAddress: this.walletAddress,
            signature,
            challenge
          })
        });
        
        loginResult = await loginResponse.json();
        
        if (!loginResponse.ok) {
          throw new Error(loginResult.error || 'Login failed');
        }
      }
      
      // Store SSO token
      this.ssoToken = loginResult.token;
      
      return loginResult;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout from SSO session
   * @returns {Promise<Object>} Logout result
   */
  async logout() {
    try {
      if (!this.ssoToken) {
        throw new Error('Not logged in');
      }
      
      const response = await fetch(`${this.apiUrl}/api/sso/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.ssoToken}`
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Logout failed');
      }
      
      // Clear SSO token
      this.ssoToken = null;
      
      return result;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Get app-specific token for SSO
   * @param {string} appId - Application ID
   * @returns {Promise<Object>} App token result
   */
  async getAppToken(appId) {
    try {
      if (!this.ssoToken) {
        await this.login();
      }
      
      let result;
      
      if (this.useSecureTunnel && this.secureTunnel && this.secureTunnel.connected) {
        // Request app token via secure tunnel
        result = await this.secureTunnel.requestAppToken(appId, this.ssoToken);
      } else {
        // Traditional API-based token request
        const response = await fetch(`${this.apiUrl}/api/sso/token/${appId}`, {
          headers: {
            'Authorization': `Bearer ${this.ssoToken}`
          }
        });
        
        result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to get app token');
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error getting app token:', error);
      throw error;
    }
  }

  /**
   * Create a new DID
   * @param {Object} params - DID creation parameters
   * @param {string} params.region - User's region (e.g., "EU", "US")
   * @param {Object} params.didDocument - DID Document data
   * @param {Object} params.vaultData - Encrypted vault data
   * @returns {Promise<Object>} Created DID information
   */
  async createDID(params) {
    try {
      if (!this.walletAddress) {
        await this.connectWallet();
      }
      
      const response = await fetch(`${this.apiUrl}/api/did/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress: this.walletAddress,
          region: params.region,
          didDocument: params.didDocument,
          vaultData: params.vaultData
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create DID');
      }
      
      // Update DID
      this.did = result.did;
      
      return result;
    } catch (error) {
      console.error('Error creating DID:', error);
      throw error;
    }
  }

  /**
   * Resolve a DID
   * @param {string} did - DID to resolve (defaults to current DID)
   * @returns {Promise<Object>} Resolved DID Document
   */
  async resolveDID(did = this.did) {
    try {
      if (!did) {
        throw new Error('No DID specified');
      }
      
      const response = await fetch(`${this.apiUrl}/api/did/resolve/${did}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to resolve DID');
      }
      
      return result;
    } catch (error) {
      console.error('Error resolving DID:', error);
      throw error;
    }
  }

  /**
   * Update vault data
   * @param {Object} vaultData - New vault data
   * @returns {Promise<Object>} Update result
   */
  async updateVault(vaultData) {
    try {
      if (!this.ssoToken) {
        await this.login();
      }
      
      const response = await fetch(`${this.apiUrl}/api/did/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.ssoToken}`
        },
        body: JSON.stringify({
          walletAddress: this.walletAddress,
          vaultData
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update vault');
      }
      
      return result;
    } catch (error) {
      console.error('Error updating vault:', error);
      throw error;
    }
  }

  /**
   * Store app credentials
   * @param {string} appId - Application ID
   * @param {Object} credentials - App credentials
   * @returns {Promise<Object>} Storage result
   */
  async storeAppCredentials(appId, credentials) {
    try {
      if (!this.ssoToken) {
        await this.login();
      }
      
      const response = await fetch(`${this.apiUrl}/api/did/credentials/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.ssoToken}`
        },
        body: JSON.stringify({
          appId,
          credentials
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to store credentials');
      }
      
      return result;
    } catch (error) {
      console.error('Error storing credentials:', error);
      throw error;
    }
  }

  /**
   * Get app credentials
   * @param {string} appId - Application ID
   * @returns {Promise<Object>} App credentials
   */
  async getAppCredentials(appId) {
    try {
      if (!this.ssoToken) {
        await this.login();
      }
      
      if (!this.did) {
        throw new Error('No DID available');
      }
      
      const response = await fetch(`${this.apiUrl}/api/did/credentials/${this.did}/${appId}`, {
        headers: {
          'Authorization': `Bearer ${this.ssoToken}`
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to get credentials');
      }
      
      return result;
    } catch (error) {
      console.error('Error getting credentials:', error);
      throw error;
    }
  }

  /**
   * Authorize export of DID data
   * @param {string} consentPurpose - Purpose of the export
   * @param {string} recipient - Recipient of the export
   * @returns {Promise<Object>} Export authorization result
   */
  async authorizeExport(consentPurpose, recipient) {
    try {
      if (!this.ssoToken) {
        await this.login();
      }
      
      const response = await fetch(`${this.apiUrl}/api/did/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.ssoToken}`
        },
        body: JSON.stringify({
          consentPurpose,
          recipient
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to authorize export');
      }
      
      return result;
    } catch (error) {
      console.error('Error authorizing export:', error);
      throw error;
    }
  }

  /**
   * Deactivate DID
   * @returns {Promise<Object>} Deactivation result
   */
  async deactivateDID() {
    try {
      if (!this.ssoToken) {
        await this.login();
      }
      
      const response = await fetch(`${this.apiUrl}/api/did/deactivate/${this.walletAddress}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.ssoToken}`
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to deactivate DID');
      }
      
      return result;
    } catch (error) {
      console.error('Error deactivating DID:', error);
      throw error;
    }
  }

  /**
   * Sign a message with the wallet
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signature
   */
  async signMessage(message) {
    try {
      if (!this.walletAddress) {
        await this.connectWallet();
      }
      
      const signature = await this.web3Provider.request({
        method: 'personal_sign',
        params: [message, this.walletAddress]
      });
      
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  /**
   * Load a script dynamically
   * @param {string} src - Script source URL
   * @returns {Promise<void>}
   * @private
   */
  async _loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }
}

// Export for browser and Node.js environments
if (typeof window !== 'undefined') {
  window.SovereignDIDClient = SovereignDIDClient;
} else {
  module.exports = SovereignDIDClient;
}