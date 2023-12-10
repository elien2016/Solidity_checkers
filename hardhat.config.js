require('@nomicfoundation/hardhat-toolbox');
require('hardhat-gas-reporter');
require('dotenv').config();

// NEVER record important private keys in your code - this is for demo purposes
const ARBITRUM_GOERLI_PRIVATE_KEY = process.env.ARBITRUM_GOERLI_KEY;
const ARBITRUM_MAINNET_TEMPORARY_PRIVATE_KEY = '';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.19',
  networks: {
    hardhat: {
      chainId: 1337,
    },
    arbitrumGoerli: {
      url: 'https://goerli-rollup.arbitrum.io/rpc',
      chainId: 421613,
      // accounts: [ARBITRUM_GOERLI_PRIVATE_KEY],
    },
    arbitrumOne: {
      url: 'https://arb1.arbitrum.io/rpc',
      //accounts: [ARBITRUM_MAINNET_TEMPORARY_PRIVATE_KEY]
    },
  },
  gasReporter: {
    currency: 'USD',
    showTimeSpent: true,
    coinmarketcap: process.env.API_KEY,
  },
};
