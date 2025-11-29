import hre from "hardhat";
import { defineChain, createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const insectarium = defineChain({
  id: 43522,
  name: "Insectarium Testnet",
  nativeCurrency: { name: "Meme", symbol: "M", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.insectarium.memecore.net"] },
  },
});

async function main() {
  let privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not found in environment");
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

  console.log("Deploying MockERC20 with account:", account.address);

  const artifact = await hre.artifacts.readArtifact("MockERC20");

  // Insectarium RPC가 eth_estimateGas를 지원하지 않아서 가스 한도 직접 지정
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: ["Squid Token", "SQUID"],
    gas: 2000000n,
  });

  console.log("Transaction hash:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("MockERC20 deployed to:", receipt.contractAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
