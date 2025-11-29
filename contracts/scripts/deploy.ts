import "@nomicfoundation/hardhat-viem/types";
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy Mock Token
  const MockToken = await ethers.getContractFactory("MockToken");
  const mockToken = await MockToken.deploy();
  await mockToken.waitForDeployment();
  console.log("MockToken deployed to:", await mockToken.getAddress());

  // 2. Deploy GameFactory
  const GameFactory = await ethers.getContractFactory("GameFactory");
  const gameFactory = await GameFactory.deploy(deployer.address);
  await gameFactory.waitForDeployment();
  console.log("GameFactory deployed to:", await gameFactory.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
