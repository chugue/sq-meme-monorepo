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

const MOCK_TOKENS = [
  { address: "0x795c1452f2a457aa38ac97b87619d31a2d3039b2", name: "CodingCat", symbol: "CC" },
  { address: "0x2721b16bee3cb7a3a4071fb8bb2b49631cb6a9e7", name: "SquidMeme", symbol: "SQM" },
  { address: "0x467b033d96af1bc1c376fa89b1023956c1d5e600", name: "jrbr", symbol: "JRBR" },
  { address: "0xe081f7c114d5ec96617577ca10dc86e4d91d25ca", name: "MemeX", symbol: "M" },
] as const;

const DEPLOYER_ADDRESS = "0x13a90Df0418e2a2c7e5801CB75d0A0E00319BDd1";
const MINT_AMOUNT = parseEther("10000000");

async function main() {
  let privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not found");
  if (!privateKey.startsWith("0x")) privateKey = `0x${privateKey}`;

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: formicarium, transport: http() });
  const publicClient = createPublicClient({ chain: formicarium, transport: http() });

  const mintAbi = [
    { name: "mint", type: "function", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
    { name: "balanceOf", type: "function", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  ] as const;

  console.log("🦑 DEPLOYER 지갑에 민팅");
  console.log(`대상: ${DEPLOYER_ADDRESS}\n`);

  for (const token of MOCK_TOKENS) {
    try {
      const hash = await walletClient.writeContract({
        address: token.address as `0x${string}`,
        abi: mintAbi,
        functionName: "mint",
        args: [DEPLOYER_ADDRESS as `0x${string}`, MINT_AMOUNT],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const balance = await publicClient.readContract({
        address: token.address as `0x${string}`,
        abi: mintAbi,
        functionName: "balanceOf",
        args: [DEPLOYER_ADDRESS as `0x${string}`],
      });
      console.log(`✅ ${token.symbol}: ${(Number(balance) / 1e18).toLocaleString()} (블록 ${receipt.blockNumber})`);
    } catch (error) {
      console.log(`❌ ${token.symbol}: 실패`);
    }
  }
}

main().catch(console.error);
