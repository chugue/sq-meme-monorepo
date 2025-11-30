import { createPublicClient, http, defineChain } from "viem";

const insectarium = defineChain({
  id: 43522,
  name: "Insectarium Testnet",
  nativeCurrency: { name: "Meme", symbol: "M", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.insectarium.memecore.net"] },
  },
});

async function main() {
  const publicClient = createPublicClient({
    chain: insectarium,
    transport: http(),
  });

  // createGame 트랜잭션
  const createGameReceipt = await publicClient.getTransactionReceipt({
    hash: "0x192a3fb754951ca00058a31d3a04fdad81c1e2fbd5e36ca0107ff7ee367e1f1f",
  });

  console.log("=== createGame Tx ===");
  console.log("Status:", createGameReceipt.status);
  console.log("Logs count:", createGameReceipt.logs.length);

  // gameIdCounter 확인
  const GAME_FACTORY_ADDRESS = "0x4036760d4a9cbef9b5051e06088fb76778986e37";
  const gameFactoryAbi = [
    {
      name: "gameIdCounter",
      type: "function",
      inputs: [],
      outputs: [{ type: "uint256" }],
      stateMutability: "view",
    },
  ] as const;

  const counter = await publicClient.readContract({
    address: GAME_FACTORY_ADDRESS,
    abi: gameFactoryAbi,
    functionName: "gameIdCounter",
  });

  console.log("\n=== GameFactory State ===");
  console.log("gameIdCounter:", counter.toString());
}

main().catch(console.error);
