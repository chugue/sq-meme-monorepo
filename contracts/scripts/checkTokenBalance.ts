import { createPublicClient, http, defineChain, formatUnits } from "viem";

const formicarium = defineChain({
  id: 43521,
  name: "Formicarium Testnet",
  nativeCurrency: { name: "Meme", symbol: "M", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.formicarium.memecore.net"] },
  },
});

// 조회할 주소들
const WALLET_ADDRESS = "0x13a90Df0418e2a2c7e5801CB75d0A0E00319BDd1";
const TOKEN_ADDRESS = "0x2721b16bee3cb7a3a4071fb8bb2b49631cb6a9e7";

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    name: "symbol",
    type: "function",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
  {
    name: "name",
    type: "function",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
] as const;

async function main() {
  console.log("=== Token Balance Check ===\n");
  console.log("Wallet Address:", WALLET_ADDRESS);
  console.log("Token Address:", TOKEN_ADDRESS);
  console.log("");

  const publicClient = createPublicClient({
    chain: formicarium,
    transport: http(),
  });

  try {
    // 토큰 잔액 조회 (balanceOf만 필수)
    const balance = await publicClient.readContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [WALLET_ADDRESS as `0x${string}`],
    });

    // decimals와 symbol은 옵션 (실패 시 기본값 사용)
    let decimals = 18;
    let symbol = "TOKEN";

    try {
      decimals = await publicClient.readContract({
        address: TOKEN_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: "decimals",
      });
    } catch {
      console.log("(decimals 함수 없음, 기본값 18 사용)");
    }

    try {
      symbol = await publicClient.readContract({
        address: TOKEN_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: "symbol",
      });
    } catch {
      console.log("(symbol 함수 없음, 기본값 TOKEN 사용)");
    }

    console.log("=== Token Info ===");
    console.log("Symbol:", symbol);
    console.log("Decimals:", decimals);
    console.log("");
    console.log("=== Balance ===");
    console.log("Raw Balance:", balance.toString(), "wei");
    console.log("Formatted Balance:", formatUnits(balance, decimals), symbol);
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);
