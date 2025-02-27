#!/usr/bin/env node

/**
 * Wallet Generator for Autheo Testnet
 * 
 * This script generates a new wallet (private key and address) that can be used
 * with the Autheo testnet. It outputs the information in a format that can be
 * directly added to the .env file.
 */

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// Create a new Web3 instance (doesn't need a provider for key generation)
const web3 = new Web3();

// Generate a new account
const account = web3.eth.accounts.create();

console.log('\n=== Autheo Testnet Wallet Generated ===\n');
console.log(`Address: ${account.address}`);
console.log(`Private Key: ${account.privateKey}`);
console.log('\n=== Add to your .env file ===\n');
console.log(`PRIVATE_KEY=${account.privateKey}`);
console.log(`WALLET_ADDRESS=${account.address}`);
console.log('\n=== Important Security Notice ===\n');
console.log('Keep your private key secure and never share it with anyone.');
console.log('This key provides full access to your wallet and funds.');
console.log('For production use, consider using a hardware wallet or more secure key management solution.');
console.log('\n=== Next Steps ===\n');
console.log('1. Add the private key and address to your .env file');
console.log('2. Get test tokens from the Autheo testnet faucet');
console.log('3. Deploy your contracts using the deploy-to-autheo.js script');

// Optionally update the .env file directly
const updateEnv = process.argv.includes('--update-env');
if (updateEnv) {
    try {
        const envPath = path.join(__dirname, 'api', '.env');
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            envContent = envContent.replace(/PRIVATE_KEY=.*/, `PRIVATE_KEY=${account.privateKey}`);
            envContent = envContent.replace(/WALLET_ADDRESS=.*/, `WALLET_ADDRESS=${account.address}`);
            fs.writeFileSync(envPath, envContent);
            console.log('\nSuccessfully updated .env file with new wallet information.');
        } else {
            console.log('\nCould not find .env file at:', envPath);
        }
    } catch (error) {
        console.error('Error updating .env file:', error);
    }
}