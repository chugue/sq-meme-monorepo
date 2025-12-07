import { defineChain, createWalletClient, createPublicClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const formicarium = defineChain({
  id: 43521,
  name: "Formicarium Testnet",
  nativeCurrency: { name: "Meme", symbol: "M", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.formicarium.memecore.net"] },
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
  { address: "0x0c42bcf0041995fbde65f0a617259cacc8a6cb62", name: "TEST_JIWHAANG" },
  { address: "0xdc52a1590982eb5fb784471dfe4c1e7ccee6533c", name: "TEST_MIN" },
  { address: "0x13a90Df0418e2a2c7e5801CB75d0A0E00319BDd1", name: "DEPLOYER" },
] as const;

// 민팅할 금액: 1천만개
const MINT_AMOUNT = parseEther("10000000");

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
    chain: formicarium,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: formicarium,
    transport: http(),
  });

  const mintAbi = [
    {
      name: "mint",
      type: "function",
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [],
    },
    {
      name: "balanceOf",
      type: "function",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ type: "uint256" }],
      stateMutability: "view",
    },
    {
      name: "symbol",
      type: "function",
      inputs: [],
      outputs: [{ type: "string" }],
      stateMutability: "view",
    },
  ] as const;

  console.log("🦑 MockToken 민팅 스크립트");
  console.log("=".repeat(60));
  console.log(`민팅 주체: ${account.address}`);
  console.log(`민팅 금액: 10,000,000 tokens per wallet`);
  console.log("=".repeat(60));

  for (const token of MOCK_TOKENS) {
    console.log(`\n📦 ${token.name} (${token.symbol})`);
    console.log(`   주소: ${token.address}`);

    for (const wallet of TEST_WALLETS) {
      console.log(`\n   → ${wallet.name}: ${wallet.address}`);

      try {
        // 민팅 실행
        const hash = await walletClient.writeContract({
          address: token.address as `0x${string}`,
          abi: mintAbi,
          functionName: "mint",
          args: [wallet.address as `0x${string}`, MINT_AMOUNT],
        });

        console.log(`     ⏳ 트랜잭션 전송: ${hash}`);

        // 트랜잭션 확인 대기
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`     ✅ 확인됨 (블록: ${receipt.blockNumber})`);

        // 민팅 후 잔액 확인
        const balance = await publicClient.readContract({
          address: token.address as `0x${string}`,
          abi: mintAbi,
          functionName: "balanceOf",
          args: [wallet.address as `0x${string}`],
        });

        const balanceFormatted = Number(balance) / 1e18;
        console.log(`     💰 현재 잔액: ${balanceFormatted.toLocaleString()} ${token.symbol}`);
      } catch (error) {
        console.log(`     ❌ 민팅 실패: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ 민팅 완료!");
}

main().catch(console.error);
