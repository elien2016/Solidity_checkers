require('@nomicfoundation/hardhat-toolbox');
require('hardhat-gas-reporter');
require('dotenv').config();

// NEVER record important private keys in your code - this is for demo purposes
const ARBITRUM_SEPOLIA_PRIVATE_KEY = '';
const ARBITRUM_MAINNET_TEMPORARY_PRIVATE_KEY = '';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    arbitrumSepolia: {
      url: 'https://sepolia-rollup.arbitrum.io/rpc',
      chainId: 421614,
      // accounts: [ARBITRUM_SEPOLIA_PRIVATE_KEY],
    },
    arbitrumOne: {
      url: 'https://arb1.arbitrum.io/rpc',
      //accounts: [ARBITRUM_MAINNET_TEMPORARY_PRIVATE_KEY]
    },
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 43,
    showTimeSpent: true,
    coinmarketcap: process.env.API_KEY,
  },
};
