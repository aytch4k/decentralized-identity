const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const didManager = require('./did-manager');

// Configuration
const config = {
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  appIntegrations: {
    // Example app integrations with their authentication methods
    'app1': {
      type: 'oauth',
      clientId: process.env.APP1_CLIENT_ID,
      clientSecret: process.env.APP1_CLIENT_SECRET,
      tokenUrl: 'https://app1.example.com/oauth/token',
      apiUrl: 'https://app1.example.com/api'
    },
    'app2': {
      type: 'basic',
      apiUrl: 'https://app2.example.com/api'
    },
    'app3': {
      type: 'apiKey',
      apiKey: process.env.APP3_API_KEY,
      apiUrl: 'https://app3.example.com/api'
    },
    'app4': {
      type: 'jwt',
      secret: process.env.APP4_JWT_SECRET,
      apiUrl: 'https://app4.example.com/api'
    },
    'app5': {
      type: 'custom',
      authUrl: 'https://app5.example.com/auth',
      apiUrl: 'https://app5.example.com/api'
    },
    'app6': {
      type: 'saml',
      metadataUrl: 'https://app6.example.com/saml/metadata',
      assertionUrl: 'https://app6.example.com/saml/assertion',
      apiUrl: 'https://app6.example.com/api'
    },
    'app7': {
      type: 'web3',
      rpcUrl: 'https://app7.example.com/rpc',
      contractAddress: process.env.APP7_CONTRACT_ADDRESS
    }
  }
};

/**
 * SSO Service for handling authentication across multiple applications
 */
class SSOService {
  /**
   * Authenticate a user with their wallet
   * @param {Object} params - Authentication parameters
   * @param {string} params.walletAddress - User's wallet address
   * @param {string} params.signature - Signature of the challenge
   * @param {string} params.challenge - Challenge string
   * @returns {Promise<Object>} Authentication result with SSO token
   */
  async login(params) {
    try {
      const { walletAddress, signature, challenge } = params;
      
      // 1. Verify the signature
      const did = `did:sovereign:${walletAddress}`;
      const isValid = await didManager.verifyDIDProof({
        did,
        challenge,
        signature
      });
      
      if (!isValid) {
        throw new Error('Invalid signature');
      }
      
      // 2. Resolve the DID to get identity information
      const identity = await didManager.resolveDID(did);
      
      if (!identity.isActive) {
        throw new Error('DID is not active');
      }
      
      // 3. Generate SSO token
      const token = this.generateSSOToken(walletAddress, did);
      
      // 4. Return authentication result
      return {
        did,
        token,
        expiresIn: config.jwtExpiresIn
      };
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }
  
  /**
   * Get an app-specific token for a user
   * @param {Object} params - Token parameters
   * @param {string} params.ssoToken - SSO token
   * @param {string} params.appId - Application ID
   * @returns {Promise<Object>} App-specific token
   */
  async getAppToken(params) {
    try {
      const { ssoToken, appId } = params;
      
      // 1. Verify SSO token
      const decoded = jwt.verify(ssoToken, config.jwtSecret);
      const { walletAddress, did } = decoded;
      
      // 2. Check if app integration exists
      const appConfig = config.appIntegrations[appId];
      if (!appConfig) {
        throw new Error(`App integration not found: ${appId}`);
      }
      
      // 3. Get app credentials from vault
      const credentials = await didManager.getCredentials({
        did,
        appId
      });
      
      // 4. Authenticate with the app using appropriate method
      const appToken = await this.authenticateWithApp(appId, appConfig, credentials);
      
      return {
        appId,
        token: appToken,
        tokenType: appConfig.type
      };
    } catch (error) {
      console.error('Error getting app token:', error);
      throw error;
    }
  }
  
  /**
   * Logout a user from the SSO session
   * @param {string} ssoToken - SSO token to invalidate
   * @returns {Promise<Object>} Logout result
   */
  async logout(ssoToken) {
    try {
      // In a production system, this would add the token to a blacklist
      // or use Redis to track invalidated tokens
      
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
  
  /**
   * Store app credentials in a user's vault
   * @param {Object} params - Credential parameters
   * @param {string} params.ssoToken - SSO token
   * @param {string} params.appId - Application ID
   * @param {Object} params.credentials - App credentials
   * @returns {Promise<Object>} Storage result
   */
  async storeAppCredentials(params) {
    try {
      const { ssoToken, appId, credentials } = params;
      
      // 1. Verify SSO token
      const decoded = jwt.verify(ssoToken, config.jwtSecret);
      const { did } = decoded;
      
      // 2. Check if app integration exists
      const appConfig = config.appIntegrations[appId];
      if (!appConfig) {
        throw new Error(`App integration not found: ${appId}`);
      }
      
      // 3. Store credentials in vault
      await didManager.addCredentials({
        did,
        appId,
        credentials
      });
      
      return {
        success: true,
        message: 'Credentials stored successfully'
      };
    } catch (error) {
      console.error('Error storing app credentials:', error);
      throw error;
    }
  }
  
  /**
   * Generate a challenge for wallet signature
   * @param {string} walletAddress - User's wallet address
   * @returns {Object} Challenge information
   */
  generateChallenge(walletAddress) {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const challenge = `Sign this message to authenticate with your wallet: ${walletAddress}. Nonce: ${nonce}. Timestamp: ${timestamp}`;
    
    return {
      challenge,
      timestamp,
      nonce
    };
  }
  
  // Helper methods
  
  /**
   * Generate an SSO token
   * @param {string} walletAddress - User's wallet address
   * @param {string} did - User's DID
   * @returns {string} JWT token
   */
  generateSSOToken(walletAddress, did) {
    const payload = {
      walletAddress,
      did,
      iat: Math.floor(Date.now() / 1000),
      type: 'sso'
    };
    
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });
  }
  
  /**
   * Authenticate with an app using appropriate method
   * @param {string} appId - Application ID
   * @param {Object} appConfig - App configuration
   * @param {Object} credentials - App credentials
   * @returns {Promise<string>} App-specific token
   */
  async authenticateWithApp(appId, appConfig, credentials) {
    switch (appConfig.type) {
      case 'oauth':
        return await this.authenticateOAuth(appConfig, credentials);
      
      case 'basic':
        return await this.authenticateBasic(appConfig, credentials);
      
      case 'apiKey':
        return await this.authenticateApiKey(appConfig, credentials);
      
      case 'jwt':
        return await this.authenticateJWT(appConfig, credentials);
      
      case 'custom':
        return await this.authenticateCustom(appConfig, credentials);
      
      case 'saml':
        return await this.authenticateSAML(appConfig, credentials);
      
      case 'web3':
        return await this.authenticateWeb3(appConfig, credentials);
      
      default:
        throw new Error(`Unsupported authentication type: ${appConfig.type}`);
    }
  }
  
  /**
   * Authenticate with OAuth
   * @param {Object} appConfig - App configuration
   * @param {Object} credentials - App credentials
   * @returns {Promise<string>} OAuth token
   */
  async authenticateOAuth(appConfig, credentials) {
    try {
      const response = await axios.post(appConfig.tokenUrl, {
        grant_type: 'password',
        client_id: appConfig.clientId,
        client_secret: appConfig.clientSecret,
        username: credentials.username,
        password: credentials.password
      });
      
      return response.data.access_token;
    } catch (error) {
      console.error('OAuth authentication error:', error);
      throw new Error('Failed to authenticate with OAuth');
    }
  }
  
  /**
   * Authenticate with Basic Auth
   * @param {Object} appConfig - App configuration
   * @param {Object} credentials - App credentials
   * @returns {Promise<string>} Basic auth token
   */
  async authenticateBasic(appConfig, credentials) {
    const token = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
    return `Basic ${token}`;
  }
  
  /**
   * Authenticate with API Key
   * @param {Object} appConfig - App configuration
   * @param {Object} credentials - App credentials
   * @returns {Promise<string>} API key
   */
  async authenticateApiKey(appConfig, credentials) {
    return credentials.apiKey || appConfig.apiKey;
  }
  
  /**
   * Authenticate with JWT
   * @param {Object} appConfig - App configuration
   * @param {Object} credentials - App credentials
   * @returns {Promise<string>} JWT token
   */
  async authenticateJWT(appConfig, credentials) {
    const payload = {
      sub: credentials.username || credentials.userId,
      iat: Math.floor(Date.now() / 1000)
    };
    
    return jwt.sign(payload, appConfig.secret, {
      expiresIn: '1h'
    });
  }
  
  /**
   * Authenticate with custom method
   * @param {Object} appConfig - App configuration
   * @param {Object} credentials - App credentials
   * @returns {Promise<string>} Custom token
   */
  async authenticateCustom(appConfig, credentials) {
    try {
      const response = await axios.post(appConfig.authUrl, credentials);
      return response.data.token;
    } catch (error) {
      console.error('Custom authentication error:', error);
      throw new Error('Failed to authenticate with custom method');
    }
  }
  
  /**
   * Authenticate with SAML
   * @param {Object} appConfig - App configuration
   * @param {Object} credentials - App credentials
   * @returns {Promise<string>} SAML assertion
   */
  async authenticateSAML(appConfig, credentials) {
    // In a production system, this would generate a proper SAML assertion
    // For now, we'll return a placeholder
    return `SAML_ASSERTION_FOR_${credentials.username}`;
  }
  
  /**
   * Authenticate with Web3
   * @param {Object} appConfig - App configuration
   * @param {Object} credentials - App credentials
   * @returns {Promise<string>} Web3 signature
   */
  async authenticateWeb3(appConfig, credentials) {
    // In a production system, this would sign a message with the private key
    // For now, we'll return a placeholder
    return `WEB3_SIGNATURE_FOR_${credentials.address}`;
  }
}

module.exports = new SSOService();