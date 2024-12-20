require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.0",
  networks: {
    cronos: {
      url: "http://localhost:8545",
      chainId: 777,
      accounts: ["0x4c0883a69102937d6231471b5ecb622b81a3b9f1e2557b27ab5f64ad5a164d2d"]
    }
  }
};
