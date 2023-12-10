// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');

async function main() {
  const stake = hre.ethers.parseEther('0.0001');

  const checkers = await hre.ethers.deployContract(
    'Checkers',
    [
      '0xBBAb0ef3CAb1F117809D8A4e3648a52e8295c1Cc',
      500,
      '0x5c6b02db8b672415ffad906d7ccee10bd53dbad7d0b29e2bc0e50c93d5f31093',
    ],
    {
      value: stake,
    }
  );

  await checkers.waitForDeployment();

  console.log(
    `Checkers with ${ethers.formatEther(stake)} ETH deployed to ${
      checkers.target
    }`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
