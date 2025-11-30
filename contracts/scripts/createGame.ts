import { defineChain, createWalletClient, createPublicClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const insectarium = defineChain({
  id: 43522,
  name: "Insectarium Testnet",
  nativeCurrency: { name: "Meme", symbol: "M", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.insectarium.memecore.net"] },
  },
});

const GAME_FACTORY_ADDRESS = "0x4036760d4a9cbef9b5051e06088fb76778986e37";
const MOCK_ERC20_ADDRESS = "0xfda7278df9b004e05dbaa367fc2246a4a46271c9";

async function main() {
  let privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not found");
  }
  if (!privateKey.startsWith("0x")) {
    privateKey = `0x${privateKey}`;
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: insectarium,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: insectarium,
    transport: http(),
  });

  const erc20Abi = [
    {
      name: "approve",
      type: "function",
      inputs: [
        { name: "spender", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ type: "bool" }],
    },
  ] as const;

  const gameFactoryAbi = [
    {
      name: "createGame",
      type: "function",
      inputs: [
        { name: "_gameToken", type: "address" },
        { name: "_time", type: "uint256" },
        { name: "_cost", type: "uint256" },
      ],
      outputs: [],
    },
  ] as const;

  const cost = parseEther("1");

  // 1. 토큰 승인 (GameFactory가 토큰을 가져갈 수 있도록)
  console.log("Approving tokens...");
  const approveHash = await walletClient.writeContract({
    address: MOCK_ERC20_ADDRESS,
    abi: erc20Abi,
    functionName: "approve",
    args: [GAME_FACTORY_ADDRESS, cost],
    gas: 100000n,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log("Tokens approved!");

  // 2. 게임 생성
  console.log("Creating game...");
  const hash = await walletClient.writeContract({
    address: GAME_FACTORY_ADDRESS,
    abi: gameFactoryAbi,
    functionName: "createGame",
    args: [
      MOCK_ERC20_ADDRESS,
      BigInt(300),  // 5분 게임
      cost,
    ],
    gas: 3000000n,
  });

  console.log("Transaction hash:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Game created! Block:", receipt.blockNumber);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
