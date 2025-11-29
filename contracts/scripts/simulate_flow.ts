import "@nomicfoundation/hardhat-viem/types";
import hre from "hardhat";
import { parseEther } from "viem";

async function main() {
  const connection = await hre.network.connect();
  const [deployer, user1] = await connection.viem.getWalletClients();
  const publicClient = await connection.viem.getPublicClient();

  // 1. Get deployed contracts (Replace addresses after deployment)
  const FACTORY_ADDRESS = "REPLACE_WITH_FACTORY_ADDRESS" as `0x${string}`;
  const TOKEN_ADDRESS = "REPLACE_WITH_TOKEN_ADDRESS" as `0x${string}`;

  const factory = await connection.viem.getContractAt("GameFactory", FACTORY_ADDRESS);
  const token = await connection.viem.getContractAt("MockToken", TOKEN_ADDRESS);

  // 2. Create Game
  console.log("Creating a new game...");
  const gameTime = 3600n; // 1 hour
  const cost = parseEther("10"); // 10 tokens

  const hash = await factory.write.createGame([TOKEN_ADDRESS, gameTime, cost]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Extract game address from event
  const logs = await publicClient.getContractEvents({
    address: FACTORY_ADDRESS,
    abi: factory.abi,
    eventName: "GameCreated",
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
  });

  const gameAddress = logs[0].args.gameAddr as `0x${string}`;
  console.log("Game created at:", gameAddress);

  // 3. Add Comment
  const game = await connection.viem.getContractAt("CommentGame", gameAddress);

  // Mint tokens to user1 and approve
  console.log("Minting and approving tokens for user1...");
  await token.write.mint([user1.account.address, parseEther("100")]);

  // Approve
  const tokenAsUser1 = await connection.viem.getContractAt("MockToken", TOKEN_ADDRESS, {
    client: { wallet: user1 },
  });
  await tokenAsUser1.write.approve([gameAddress, parseEther("100")]);

  console.log("Adding comment...");
  const gameAsUser1 = await connection.viem.getContractAt("CommentGame", gameAddress, {
    client: { wallet: user1 },
  });
  await gameAsUser1.write.addComment(["Hello Squid Meme!"]);

  console.log("Comment added successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
