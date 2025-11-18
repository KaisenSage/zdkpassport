require("dotenv").config();

// Hardhat v3: network objects require a "type" discriminator.
// Use ANCHOR_WALLET_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) in your .env
module.exports = {
  solidity: "0.8.18",
  networks: {
    sepolia: {
      type: "http",
      url: process.env.RPC_URL || "",
      accounts: process.env.ANCHOR_WALLET_PRIVATE_KEY
        ? [process.env.ANCHOR_WALLET_PRIVATE_KEY]
        : process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
    localhost: {
      type: "http",
      url: process.env.RPC_URL_LOCAL || "http://127.0.0.1:8545",
      accounts: process.env.ANCHOR_WALLET_PRIVATE_KEY
        ? [process.env.ANCHOR_WALLET_PRIVATE_KEY]
        : process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};