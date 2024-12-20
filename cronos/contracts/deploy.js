const Web3 = require('web3');
const fs = require('fs');
const web3 = new Web3('http://localhost:8545');

const contractABI = JSON.parse(fs.readFileSync('./DIDRegistry.json', 'utf8'));
const contractBytecode = '0x' + fs.readFileSync('./DIDRegistry.bin', 'utf8');

(async () => {
  const accounts = await web3.eth.getAccounts();
  const contract = new web3.eth.Contract(contractABI);
  const deployed = await contract.deploy({ data: contractBytecode }).send({ from: accounts[0], gas: 3000000 });
  console.log('Contract deployed at:', deployed.options.address);
})();
