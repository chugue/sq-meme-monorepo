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
const USER_ADDRESS = "0x13a90df0418e2a2c7e5801cb75d0a0e00319bdd1";

async function main() {
  const client = createPublicClient({
    chain: insectarium,
    transport: http(),
  });

  // 게임 정보 조회
  const gameInfo = await client.readContract({
    address: COMMENT_GAME_V2_ADDRESS as `0x${string}`,
    abi: [{
      inputs: [{ name: "_gameId", type: "uint256" }],
      name: "getGameInfo",
      outputs: [{
        components: [
          { name: "id", type: "uint256" },
          { name: "initiator", type: "address" },
          { name: "gameToken", type: "address" },
          { name: "cost", type: "uint256" },
          { name: "gameTime", type: "uint256" },
          { name: "tokenSymbol", type: "string" },
          { name: "endTime", type: "uint256" },
          { name: "lastCommentor", type: "address" },
          { name: "prizePool", type: "uint256" },
          { name: "isClaimed", type: "bool" },
          { name: "isEnded", type: "bool" },
          { name: "totalFunding", type: "uint256" },
          { name: "funderCount", type: "uint256" },
        ],
        type: "tuple",
      }],
      stateMutability: "view",
      type: "function",
    }],
    functionName: "getGameInfo",
    args: [1n],
  });

  console.log("=== Game Info ===");
  console.log("ID:", gameInfo.id.toString());
  console.log("Token:", gameInfo.gameToken);
  console.log("Cost:", formatUnits(gameInfo.cost, 18), "tokens");
  console.log("GameTime:", gameInfo.gameTime.toString(), "seconds");
  console.log("EndTime:", new Date(Number(gameInfo.endTime) * 1000).toISOString());
  console.log("IsEnded:", gameInfo.isEnded);
  console.log("TotalFunding:", formatUnits(gameInfo.totalFunding, 18), "tokens");
  console.log("PrizePool:", formatUnits(gameInfo.prizePool, 18), "tokens");
  console.log("FunderCount:", gameInfo.funderCount.toString());

  // 유저의 allowance 확인
  const allowance = await client.readContract({
    address: MOCK_ERC20_ADDRESS as `0x${string}`,
    abi: [{
      inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
      name: "allowance",
      outputs: [{ type: "uint256" }],
      stateMutability: "view",
      type: "function",
    }],
    functionName: "allowance",
    args: [USER_ADDRESS as `0x${string}`, COMMENT_GAME_V2_ADDRESS as `0x${string}`],
  });

  console.log("\n=== User Allowance ===");
  console.log("Allowance:", formatUnits(allowance, 18), "tokens");
  console.log("Allowance >= Cost:", allowance >= gameInfo.cost);

  // 유저 잔액 확인
  const balance = await client.readContract({
    address: MOCK_ERC20_ADDRESS as `0x${string}`,
    abi: [{
      inputs: [{ name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ type: "uint256" }],
      stateMutability: "view",
      type: "function",
    }],
    functionName: "balanceOf",
    args: [USER_ADDRESS as `0x${string}`],
  });

  console.log("\n=== User Balance ===");
  console.log("Balance:", formatUnits(balance, 18), "tokens");
  console.log("Balance >= Cost:", balance >= gameInfo.cost);

  // 현재 시간 vs endTime
  const now = Math.floor(Date.now() / 1000);
  console.log("\n=== Time Check ===");
  console.log("Current Time:", new Date(now * 1000).toISOString());
  console.log("End Time:", new Date(Number(gameInfo.endTime) * 1000).toISOString());
  console.log("Game Ended:", now >= Number(gameInfo.endTime));
}

main().catch(console.error);
