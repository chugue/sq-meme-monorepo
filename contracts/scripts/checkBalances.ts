import { defineChain, createPublicClient, http, formatEther } from "viem";

const insectarium = defineChain({
  id: 43522,
  name: "Insectarium Testnet",
  nativeCurrency: { name: "Meme", symbol: "M", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.insectarium.memecore.net"] },
  },
});

// 4개의 MockToken 주소
const MOCK_TOKENS = [
  { address: "0x795c1452f2a457aa38ac97b87619d31a2d3039b2", name: "CodingCat", symbol: "CC" },
  { address: "0x2721b16bee3cb7a3a4071fb8bb2b49631cb6a9e7", name: "SquidMeme", symbol: "SQM" },
  { address: "0x467b033d96af1bc1c376fa89b1023956c1d5e600", name: "jrbr", symbol: "JRBR" },
  { address: "0xe081f7c114d5ec96617577ca10dc86e4d91d25ca", name: "MemeX", symbol: "M" },
] as const;

// 테스트 지갑 주소
const TEST_WALLETS = [
  { address: "0x0c42bcf0041995fbde65f0a617259cacc8a6cb62", name: "TEST_JIWHAANG (jrbr7282)" },
  { address: "0xdc52a1590982eb5fb784471dfe4c1e7ccee6533c", name: "TEST_MIN (squidmeme)" },
] as const;

async function main() {
  const publicClient = createPublicClient({
    chain: insectarium,
    transport: http(),
  });

  const erc20Abi = [
    {
      name: "balanceOf",
      type: "function",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ type: "uint256" }],
      stateMutability: "view",
    },
  ] as const;

  console.log("🦑 MockToken 잔액 확인");
  console.log("=".repeat(60));

  for (const wallet of TEST_WALLETS) {
    console.log(`\n👤 ${wallet.name}`);
    console.log(`   ${wallet.address}`);
    console.log("-".repeat(50));

    for (const token of MOCK_TOKENS) {
      try {
        const balance = await publicClient.readContract({
          address: token.address as `0x${string}`,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [wallet.address as `0x${string}`],
        });

        console.log(`   ${token.symbol.padEnd(6)} : ${formatEther(balance)} ${token.symbol}`);
      } catch (error) {
        console.log(`   ${token.symbol.padEnd(6)} : 조회 실패`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);
