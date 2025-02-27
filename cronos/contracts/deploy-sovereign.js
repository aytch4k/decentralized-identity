const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// Initialize web3 with the Cronos node
const web3 = new Web3('http://localhost:8545');

// Read contract artifacts
const contractPath = path.join(__dirname, 'SovereignIdentityManager.json');
const contractABI = JSON.parse(fs.readFileSync(contractPath, 'utf8')).abi;
const contractBytecode = JSON.parse(fs.readFileSync(contractPath, 'utf8')).bytecode;

// Sample regional node addresses (replace with actual node addresses in production)
const euNodes = [
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222',
  '0x3333333333333333333333333333333333333333'
];

const usNodes = [
  '0x4444444444444444444444444444444444444444',
  '0x5555555555555555555555555555555555555555',
  '0x6666666666666666666666666666666666666666'
];

async function deployContract() {
  try {
    // Get accounts
    const accounts = await web3.eth.getAccounts();
    const deployer = accounts[0];
    
    console.log('Deploying SovereignIdentityManager from account:', deployer);
    
    // Create contract instance
    const contract = new web3.eth.Contract(contractABI);
    
    // Deploy contract with constructor arguments
    const deployTx = contract.deploy({
      data: contractBytecode,
      arguments: [euNodes, usNodes]
    });
    
    // Estimate gas
    const gas = await deployTx.estimateGas();
    
    // Send transaction
    const deployed = await deployTx.send({
      from: deployer,
      gas: Math.floor(gas * 1.2) // Add 20% buffer
    });
    
    console.log('SovereignIdentityManager deployed at:', deployed.options.address);
    
    // Save the contract address to a file for reference
    fs.writeFileSync(
      path.join(__dirname, '../config/contract-address.json'),
      JSON.stringify({ address: deployed.options.address }, null, 2)
    );
    
    return deployed.options.address;
  } catch (error) {
    console.error('Error deploying contract:', error);
    throw error;
  }
}

// Execute deployment
deployContract()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });