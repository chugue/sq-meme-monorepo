import { createPublicClient, createWalletClient, http, defineChain, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const formicarium = defineChain({
  id: 43521,
  name: "Formicarium Testnet",
  nativeCurrency: { name: "Meme", symbol: "M", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.formicarium.memecore.net"] },
  },
});

// 전송 정보
const PRIVATE_KEY = "0x295c93e649e07996472fab5bcca64442d3dafecac85f142e39f9d857643a4d57";
const TOKEN_ADDRESS = "0x2721b16bee3cb7a3a4071fb8bb2b49631cb6a9e7";
const TO_ADDRESS = "0xdc52a1590982eb5fb784471dfe4c1e7ccee6533c";
const AMOUNT = "10000000"; // 1000만개

const erc20Abi = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
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
] as const;

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

  console.log("=== Token Transfer ===\n");
  console.log("From:", account.address);
  console.log("To:", TO_ADDRESS);
  console.log("Token:", TOKEN_ADDRESS);
  console.log("Amount:", AMOUNT, "(before decimals)");
  console.log("");

  const publicClient = createPublicClient({
    chain: formicarium,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: formicarium,
    transport: http(),
  });

  // 토큰 정보 조회
  const [decimals, symbol] = await Promise.all([
    publicClient.readContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "decimals",
    }),
    publicClient.readContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "symbol",
    }),
  ]);

  const amountInWei = parseUnits(AMOUNT, decimals);
  console.log("Amount in Wei:", amountInWei.toString());
  console.log("");

  // 전송 전 잔액 확인
  const balanceBefore = await publicClient.readContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  console.log("=== Before Transfer ===");
  console.log("Sender Balance:", formatUnits(balanceBefore, decimals), symbol);

  const toBalanceBefore = await publicClient.readContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [TO_ADDRESS as `0x${string}`],
  });
  console.log("Receiver Balance:", formatUnits(toBalanceBefore, decimals), symbol);
  console.log("");

  // 전송 실행
  console.log("Sending transaction...");
  const hash = await walletClient.writeContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: "transfer",
    args: [TO_ADDRESS as `0x${string}`, amountInWei],
  });

  console.log("Transaction Hash:", hash);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Transaction Status:", receipt.status);
  console.log("");

  // 전송 후 잔액 확인
  const balanceAfter = await publicClient.readContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  const toBalanceAfter = await publicClient.readContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [TO_ADDRESS as `0x${string}`],
  });

  console.log("=== After Transfer ===");
  console.log("Sender Balance:", formatUnits(balanceAfter, decimals), symbol);
  console.log("Receiver Balance:", formatUnits(toBalanceAfter, decimals), symbol);
  console.log("");
  console.log("Transfer Complete!");
}

main().catch(console.error);
