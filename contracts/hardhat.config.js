require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // IR pipeline: needed to copy nested dynamic arrays (string[] tags) from
      // calldata into storage, which the legacy code generator can't do.
      viaIR: true,
    },
  },
  networks: {
    // Default in-process network for `hardhat test` / `hardhat node`
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    monadTestnet: {
      url: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  // Block explorer verification (Monad testnet)
  etherscan: {
    apiKey: {
      monadTestnet: "empty",
    },
    customChains: [
      {
        network: "monadTestnet",
        chainId: 10143,
        urls: {
          apiURL: "https://testnet.monadexplorer.com/api",
          browserURL: "https://testnet.monadexplorer.com",
        },
      },
    ],
  },
};
