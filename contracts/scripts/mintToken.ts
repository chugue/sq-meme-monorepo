import {
  defineChain,
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const formicarium = defineChain({
  id: 43521,
  name: "Formicarium Testnet",
  nativeCurrency: { name: "Meme", symbol: "M", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.formicarium.memecore.net"] },
  },
});

const mockERC20Abi = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// 민팅할 토큰 주소
const TOKEN_ADDRESS = "0x2721b16bee3cb7a3a4071fb8bb2b49631cb6a9e7";
// 민팅할 양 (1000만개)
const MINT_AMOUNT = "10000000";

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

  console.log(`Minting ${MINT_AMOUNT} tokens to ${account.address}...`);
  console.log(`Token address: ${TOKEN_ADDRESS}\n`);

  // 토큰 정보 조회
  const [symbol, decimals] = await Promise.all([
    publicClient.readContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: mockERC20Abi,
      functionName: "symbol",
    }),
    publicClient.readContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: mockERC20Abi,
      functionName: "decimals",
    }),
  ]);

  console.log(`Token: ${symbol}, Decimals: ${decimals}`);

  // 민팅 전 잔액 조회
  const balanceBefore = await publicClient.readContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: mockERC20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  console.log(
    `Balance before: ${Number(balanceBefore) / 10 ** decimals} ${symbol}`
  );

  // 1000만개 민팅 (decimals 적용)
  const mintAmount = parseUnits(MINT_AMOUNT, decimals);

  const hash = await walletClient.writeContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: mockERC20Abi,
    functionName: "mint",
    args: [account.address, mintAmount],
  });

  console.log(`\nTransaction hash: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Status: ${receipt.status}`);

  // 민팅 후 잔액 조회
  const balanceAfter = await publicClient.readContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: mockERC20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  console.log(
    `\nBalance after: ${Number(balanceAfter) / 10 ** decimals} ${symbol}`
  );
  console.log(
    `Minted: ${(Number(balanceAfter) - Number(balanceBefore)) / 10 ** decimals} ${symbol}`
  );
}

main().catch(console.error);
