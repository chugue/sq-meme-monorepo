import "@nomicfoundation/hardhat-viem/types";
import hre from "hardhat";

async function main() {
  const connection = await hre.network.connect();
  const [deployer] = await connection.viem.getWalletClients();

  console.log("Deploying contracts with the account:", deployer.account.address);

  // 1. Deploy Mock Token
  const mockToken = await connection.viem.deployContract("MockToken");
  console.log("MockToken deployed to:", mockToken.address);

  // 2. Deploy GameFactory
  const gameFactory = await connection.viem.deployContract("GameFactory", [
    deployer.account.address,
  ]);
  console.log("GameFactory deployed to:", gameFactory.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
