import { expect } from "chai";
import hre from "hardhat";
import { parseUnits } from "viem";

describe("CommentGameV2", function () {
  it("should create game and add first comment", async function () {
    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    // Deploy MockERC20
    const mockToken = await hre.viem.deployContract("MockERC20", ["MockToken", "MTK"]);
    console.log("MockToken deployed:", mockToken.address);

    // Deploy CommentGameV2
    const commentGame = await hre.viem.deployContract("CommentGameV2", [deployer.account.address]);
    console.log("CommentGameV2 deployed:", commentGame.address);

    const initialFunding = parseUnits("1000", 18);
    const cost = parseUnits("10", 18);
    const time = 300n; // 5분

    // Approve
    const totalRequired = initialFunding + cost;
    await mockToken.write.approve([commentGame.address, totalRequired]);
    console.log("Approved:", totalRequired.toString());

    // Create Game
    const createTx = await commentGame.write.createGame([
      mockToken.address,
      time,
      cost,
      initialFunding,
    ]);
    console.log("Game created, tx:", createTx);

    // Get game ID
    const gameId = await commentGame.read.getActiveGameId([mockToken.address]);
    console.log("Game ID:", gameId);

    // Get game info
    const gameInfo = await commentGame.read.getGameInfo([gameId]);
    console.log("Game totalFunding:", gameInfo.totalFunding.toString());
    console.log("Game cost:", gameInfo.cost.toString());

    // Add first comment
    const commentTx = await commentGame.write.addComment([gameId, "First comment!"]);
    console.log("Comment added, tx:", commentTx);

    console.log("SUCCESS!");
  });
});
