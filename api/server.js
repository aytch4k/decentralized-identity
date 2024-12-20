const express = require('express');
const axios = require('axios');
const Web3 = require('web3');

const app = express();
app.use(express.json());

// Cosmos SDK API
const cosmosApi = 'http://cosmos:1317';
app.post('/dids', async (req, res) => {
  const { id, publicKey, serviceEndpoint } = req.body;
  try {
    const response = await axios.post(`${cosmosApi}/dids`, {
      id, publicKey, serviceEndpoint
    });
    res.status(200).send(response.data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Cronos Smart Contract API
const web3 = new Web3('http://cronos:8545');
const contractAddress = '0xYourContractAddress';
const contractABI = []; // Paste ABI of DIDRegistry
const contract = new web3.eth.Contract(contractABI, contractAddress);

app.post('/credentials', async (req, res) => {
  const { id, issuer, subject, claim } = req.body;
  try {
    const result = await contract.methods.issueCredential(id, issuer, subject, claim).send();
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(4000, () => console.log('API running on http://localhost:4000'));
