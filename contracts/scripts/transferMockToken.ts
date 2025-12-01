import { defineChain, createWalletClient, createPublicClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const insectarium = defineChain({
  id: 43522,
  name: "Insectarium Testnet",
  nativeCurrency: { name: "Meme", symbol: "M", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.insectarium.memecore.net"] },
  },
});

const MOCK_ERC20_ADDRESS = "0xfda7278df9b004e05dbaa367fc2246a4a46271c9";
const RECIPIENT_ADDRESS = "0x08546b36ba6b9e5e09c7fb9e1b2a67a4dfb13652";

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
      name: "balanceOf",
      type: "function",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ type: "uint256" }],
      stateMutability: "view",
    },
    {
      name: "transfer",
      type: "function",
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ type: "bool" }],
    },
    {
      name: "decimals",
      type: "function",
      inputs: [],
      outputs: [{ type: "uint8" }],
      stateMutability: "view",
    },
  ] as const;

  console.log("�� MockToken 전송 스크립트");
  console.log("=".repeat(50));
  console.log(`보내는 주소: ${account.address}`);
  console.log(`받는 주소: ${RECIPIENT_ADDRESS}`);

  // 현재 잔액 조회
  const balance = await publicClient.readContract({
    address: MOCK_ERC20_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  console.log(`현재 잔액: ${formatEther(balance)} MTK`);

  // 80% 계산
  const transferAmount = (balance * 80n) / 100n;
  console.log(`전송할 금액 (80%): ${formatEther(transferAmount)} MTK`);

  if (transferAmount === 0n) {
    console.log("❌ 전송할 잔액이 없습니다.");
    return;
  }

  // 전송 실행
  console.log("\n🚀 전송 중...");
  const hash = await walletClient.writeContract({
    address: MOCK_ERC20_ADDRESS,
    abi: erc20Abi,
    functionName: "transfer",
    args: [RECIPIENT_ADDRESS, transferAmount],
  });

  console.log(`✅ 트랜잭션 전송 완료: ${hash}`);

  // 트랜잭션 확인 대기
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`✅ 트랜잭션 확인됨 (블록: ${receipt.blockNumber})`);

  // 전송 후 잔액 확인
  const newBalance = await publicClient.readContract({
    address: MOCK_ERC20_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  const recipientBalance = await publicClient.readContract({
    address: MOCK_ERC20_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [RECIPIENT_ADDRESS],
  });

  console.log("\n📊 전송 후 잔액:");
  console.log(`  보낸 주소: ${formatEther(newBalance)} MTK`);
  console.log(`  받은 주소: ${formatEther(recipientBalance)} MTK`);
}

main().catch(console.error);
