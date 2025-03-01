const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const Web3 = require('web3');
const path = require('path');

// Import our services
const didManager = require('./did-manager');
const ssoService = require('./sso-service');
const TunnelService = require('./secure-tunnel/tunnel-service');

// Initialize Express app
const app = express();
const port = process.env.PORT || 4000;

// Initialize Secure Tunnel Service
const tunnelService = new TunnelService({
  type: 'middleware',
  region: process.env.REGION || 'EU',
  bootstrapList: process.env.BOOTSTRAP_LIST ? process.env.BOOTSTRAP_LIST.split(',') : [],
  didManager,
  ssoService
});

// Start the tunnel service
(async () => {
  try {
    await tunnelService.initialize();
    console.log('Secure tunnel service started');
  } catch (error) {
    console.error('Failed to start secure tunnel service:', error);
  }
})();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));

// Serve client-side libraries
app.use('/client', express.static(path.join(__dirname, 'client')));

// JWT authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API Routes

// DID Manager API

/**
 * Create a new DID
 * POST /api/did/create
 */
app.post('/api/did/create', async (req, res) => {
  try {
    const result = await didManager.createDID(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating DID:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Resolve a DID
 * GET /api/did/resolve/:did
 */
app.get('/api/did/resolve/:did', async (req, res) => {
  try {
    const result = await didManager.resolveDID(req.params.did);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error resolving DID:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update a DID Document
 * PUT /api/did/update
 */
app.put('/api/did/update', authenticateJWT, async (req, res) => {
  try {
    // Ensure the requester is the DID owner
    const didOwner = req.body.walletAddress;
    if (didOwner !== req.user.walletAddress) {
      return res.status(403).json({ error: 'Not authorized to update this DID' });
    }
    
    const result = await didManager.updateVault(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error updating DID:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Deactivate a DID
 * DELETE /api/did/deactivate/:walletAddress
 */
app.delete('/api/did/deactivate/:walletAddress', authenticateJWT, async (req, res) => {
  try {
    // Ensure the requester is the DID owner
    const didOwner = req.params.walletAddress;
    if (didOwner !== req.user.walletAddress) {
      return res.status(403).json({ error: 'Not authorized to deactivate this DID' });
    }
    
    const result = await didManager.revokeDID(didOwner);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error deactivating DID:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify a DID proof
 * POST /api/did/verify
 */
app.post('/api/did/verify', async (req, res) => {
  try {
    const result = await didManager.verifyDIDProof(req.body);
    res.status(200).json({ verified: result });
  } catch (error) {
    console.error('Error verifying DID proof:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add app credentials to a DID Document
 * POST /api/did/credentials/add
 */
app.post('/api/did/credentials/add', authenticateJWT, async (req, res) => {
  try {
    const result = await ssoService.storeAppCredentials({
      ssoToken: req.headers.authorization.split(' ')[1],
      appId: req.body.appId,
      credentials: req.body.credentials
    });
    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding credentials:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get app credentials from a DID Document
 * GET /api/did/credentials/:did/:appId
 */
app.get('/api/did/credentials/:did/:appId', authenticateJWT, async (req, res) => {
  try {
    // Ensure the requester is the DID owner
    const didOwner = req.params.did.split(':')[2];
    if (didOwner !== req.user.walletAddress) {
      return res.status(403).json({ error: 'Not authorized to access these credentials' });
    }
    
    const credentials = await didManager.getCredentials({
      did: req.params.did,
      appId: req.params.appId
    });
    res.status(200).json(credentials);
  } catch (error) {
    console.error('Error getting credentials:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Authorize export of DID data
 * POST /api/did/export
 */
app.post('/api/did/export', authenticateJWT, async (req, res) => {
  try {
    const result = await didManager.authorizeExport({
      walletAddress: req.user.walletAddress,
      consentPurpose: req.body.consentPurpose,
      recipient: req.body.recipient
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('Error authorizing export:', error);
    res.status(500).json({ error: error.message });
  }
});

// SSO Integration Layer API

/**
 * Generate a challenge for wallet authentication
 * GET /api/sso/challenge/:walletAddress
 */
app.get('/api/sso/challenge/:walletAddress', (req, res) => {
  try {
    const challenge = ssoService.generateChallenge(req.params.walletAddress);
    res.status(200).json(challenge);
  } catch (error) {
    console.error('Error generating challenge:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Authenticate with wallet and get SSO token
 * POST /api/sso/login
 */
app.post('/api/sso/login', async (req, res) => {
  try {
    const result = await ssoService.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(401).json({ error: error.message });
  }
});

/**
 * Get app-specific authentication token
 * GET /api/sso/token/:appId
 */
app.get('/api/sso/token/:appId', authenticateJWT, async (req, res) => {
  try {
    const result = await ssoService.getAppToken({
      ssoToken: req.headers.authorization.split(' ')[1],
      appId: req.params.appId
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting app token:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Invalidate SSO session
 * POST /api/sso/logout
 */
app.post('/api/sso/logout', authenticateJWT, async (req, res) => {
  try {
    const result = await ssoService.logout(req.headers.authorization.split(' ')[1]);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Add a root route handler
app.get('/', (req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>Sovereign DID API</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #333; }
          h2 { color: #555; margin-top: 30px; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
          .endpoint { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <h1>Sovereign Decentralized Identity API</h1>
        <p>Welcome to the Sovereign DID API server. This API provides endpoints for managing decentralized identities and single sign-on capabilities.</p>
        
        <h2>Available Endpoints:</h2>
        
        <h3>DID Manager API</h3>
        <div class="endpoint"><pre>POST /api/did/create</pre> - Create a new DID</div>
        <div class="endpoint"><pre>GET /api/did/resolve/:did</pre> - Resolve a DID to its DID Document</div>
        <div class="endpoint"><pre>PUT /api/did/update</pre> - Update a DID Document</div>
        <div class="endpoint"><pre>DELETE /api/did/deactivate/:walletAddress</pre> - Deactivate a DID</div>
        <div class="endpoint"><pre>POST /api/did/verify</pre> - Verify a DID proof</div>
        <div class="endpoint"><pre>POST /api/did/credentials/add</pre> - Add app credentials to a DID Document</div>
        <div class="endpoint"><pre>GET /api/did/credentials/:did/:appId</pre> - Get app credentials</div>
        <div class="endpoint"><pre>POST /api/did/export</pre> - Authorize export of DID data</div>
        
        <h3>SSO Integration Layer API</h3>
        <div class="endpoint"><pre>GET /api/sso/challenge/:walletAddress</pre> - Generate a challenge for wallet authentication</div>
        <div class="endpoint"><pre>POST /api/sso/login</pre> - Authenticate with wallet and get SSO token</div>
        <div class="endpoint"><pre>GET /api/sso/token/:appId</pre> - Get app-specific authentication token</div>
        <div class="endpoint"><pre>POST /api/sso/logout</pre> - Invalidate SSO session</div>
        
        <h3>Health Check</h3>
        <div class="endpoint"><pre>GET /health</pre> - Check API health status</div>
      </body>
    </html>
  `);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log('API Documentation:');
  console.log(`- DID API: http://localhost:${port}/api/did/...`);
  console.log(`- SSO API: http://localhost:${port}/api/sso/...`);
});

module.exports = app; // For testing
