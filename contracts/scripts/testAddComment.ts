import { createPublicClient, createWalletClient, http, defineChain, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const insectarium = defineChain({
  id: 43522,
  name: "Insectarium Testnet",
  nativeCurrency: { name: "Meme", symbol: "M", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.insectarium.memecore.net"] },
  },
});

const COMMENT_GAME_V2_ADDRESS = "0xfce1f67b6dd68c9d850acd027174180f6bae0527" as const;
const MOCK_ERC20_ADDRESS = "0xfda7278df9b004e05dbaa367fc2246a4a46271c9" as const;

async function main() {
  let privateKey = process.env.DEPLOYER_PRIVATE_KEY!;
  if (!privateKey.startsWith("0x")) {
    privateKey = `0x${privateKey}`;
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  const publicClient = createPublicClient({
    chain: insectarium,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: insectarium,
    transport: http(),
  });

  console.log("Account:", account.address);

  // 먼저 새 게임 생성
  const initialFunding = parseUnits("100", 18);
  const cost = parseUnits("10", 18);
  const time = 600n; // 10분

  // Approve
  console.log("\n1. Approving tokens...");
  const approveTx = await walletClient.writeContract({
    address: MOCK_ERC20_ADDRESS,
    abi: [{
      inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
      name: "approve",
      outputs: [{ type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    }],
    functionName: "approve",
    args: [COMMENT_GAME_V2_ADDRESS, initialFunding + cost],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  console.log("Approved!");

  // Create Game
  console.log("\n2. Creating game...");
  const createTx = await walletClient.writeContract({
    address: COMMENT_GAME_V2_ADDRESS,
    abi: [{
      inputs: [
        { name: "_gameToken", type: "address" },
        { name: "_time", type: "uint256" },
        { name: "_cost", type: "uint256" },
        { name: "_initialFunding", type: "uint256" },
      ],
      name: "createGame",
      outputs: [{ type: "uint256" }],
      stateMutability: "nonpayable",
      type: "function",
    }],
    functionName: "createGame",
    args: [MOCK_ERC20_ADDRESS, time, cost, initialFunding],
  });
  const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTx });
  console.log("Game created! Block:", createReceipt.blockNumber);

  // Get game ID
  const gameId = await publicClient.readContract({
    address: COMMENT_GAME_V2_ADDRESS,
    abi: [{
      inputs: [{ name: "_token", type: "address" }],
      name: "getActiveGameId",
      outputs: [{ type: "uint256" }],
      stateMutability: "view",
      type: "function",
    }],
    functionName: "getActiveGameId",
    args: [MOCK_ERC20_ADDRESS],
  });
  console.log("Game ID:", gameId);

  // Add Comment
  console.log("\n3. Adding comment...");
  try {
    const commentTx = await walletClient.writeContract({
      address: COMMENT_GAME_V2_ADDRESS,
      abi: [{
        inputs: [
          { name: "_gameId", type: "uint256" },
          { name: "_message", type: "string" },
        ],
        name: "addComment",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      }],
      functionName: "addComment",
      args: [gameId, "Test comment from script"],
    });
    const commentReceipt = await publicClient.waitForTransactionReceipt({ hash: commentTx });
    console.log("Comment added! Block:", commentReceipt.blockNumber);
    console.log("SUCCESS!");
  } catch (error) {
    console.error("Comment failed:", error);
  }
}

main().catch(console.error);
