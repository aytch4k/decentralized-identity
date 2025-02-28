// Script to deploy contracts to Autheo testnet
const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../api/.env') });

// Load contract artifacts
const DIDRegistryArtifact = require('./build/DIDRegistry.json');
const SovereignIdentityManagerArtifact = require('./build/SovereignIdentityManager.json');

// Connect to Autheo testnet
const web3 = new Web3(process.env.CRONOS_RPC || 'https://testnet-rpc.autheo.network');

// Set up account from private key
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);
const deployer = account.address;

console.log(`Deploying contracts from account: ${deployer}`);

async function deployContracts() {
  try {
    console.log('Deploying DIDRegistry...');
    const didRegistryContract = new web3.eth.Contract(DIDRegistryArtifact.abi);
    const didRegistry = await didRegistryContract
      .deploy({ data: DIDRegistryArtifact.bytecode })
      .send({ from: deployer, gas: 3000000 });
    
    console.log(`DIDRegistry deployed at: ${didRegistry.options.address}`);
    
    console.log('Deploying SovereignIdentityManager...');
    const sovereignContract = new web3.eth.Contract(SovereignIdentityManagerArtifact.abi);
    const sovereign = await sovereignContract
      .deploy({ 
        data: SovereignIdentityManagerArtifact.bytecode,
        arguments: [didRegistry.options.address]
      })
      .send({ from: deployer, gas: 4000000 });
    
    console.log(`SovereignIdentityManager deployed at: ${sovereign.options.address}`);
    
    // Update .env file with contract address
    const envPath = path.join(__dirname, '../api/.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${sovereign.options.address}`
    );
    fs.writeFileSync(envPath, envContent);
    
    console.log(`Updated CONTRACT_ADDRESS in .env file`);
    
    // Create deployment info file
    const deploymentInfo = {
      network: process.env.CRONOS_RPC || 'https://testnet-rpc.autheo.network',
      deployer: deployer,
      didRegistry: didRegistry.options.address,
      sovereignIdentityManager: sovereign.options.address,
      deployedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'deployment-info.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log('Deployment information saved to deployment-info.json');
    
    // Save contract ABI for API service
    const sovereignABI = {
      abi: SovereignIdentityManagerArtifact.abi
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../api/SovereignIdentityManager.json'),
      JSON.stringify(sovereignABI, null, 2)
    );
    
    console.log('Contract ABI saved to api/SovereignIdentityManager.json');
    console.log('Deployment completed successfully!');
    
    return {
      didRegistry: didRegistry.options.address,
      sovereignIdentityManager: sovereign.options.address
    };
  } catch (error) {
    console.error('Error deploying contracts:', error);
    process.exit(1);
  }
}

// Execute deployment
deployContracts();