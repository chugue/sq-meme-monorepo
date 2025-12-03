import { createPublicClient, http, defineChain, formatUnits } from "viem";

const insectarium = defineChain({
  id: 43522,
  name: "Insectarium Testnet",
  nativeCurrency: { name: "Meme", symbol: "M", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.insectarium.memecore.net"] },
  },
});

const COMMENT_GAME_V2_ADDRESS = "0xfce1f67b6dd68c9d850acd027174180f6bae0527";
const MOCK_ERC20_ADDRESS = "0xfda7278df9b004e05dbaa367fc2246a4a46271c9";

async function main() {
  const client = createPublicClient({
    chain: insectarium,
    transport: http(),
  });

  // 컨트랙트의 토큰 잔액 확인
  const contractBalance = await client.readContract({
    address: MOCK_ERC20_ADDRESS as `0x${string}`,
    abi: [{
      inputs: [{ name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ type: "uint256" }],
      stateMutability: "view",
      type: "function",
    }],
    functionName: "balanceOf",
    args: [COMMENT_GAME_V2_ADDRESS as `0x${string}`],
  });

  console.log("=== Contract Token Balance ===");
  console.log("CommentGameV2 holds:", formatUnits(contractBalance, 18), "tokens");
}

main().catch(console.error);
