import hre from "hardhat";
import { defineChain, createWalletClient, createPublicClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const insectarium = defineChain({
  id: 43522,
  name: "Insectarium Testnet",
  nativeCurrency: { name: "Meme", symbol: "M", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.insectarium.memecore.net"] },
  },
});

const GAME_FACTORY_ADDRESS = "0xa1bd295d464e606754e896b9e81429660286f70e";
const MOCK_ERC20_ADDRESS = "0x358db1f21730aa41b46b568cf27fefc47ee19ee4";

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

  // GameFactory ABI (createGame 함수만)
  const gameFactoryAbi = [
    {
      name: "createGame",
      type: "function",
      inputs: [
        { name: "_gameToken", type: "address" },
        { name: "_time", type: "uint256" },
        { name: "_cost", type: "uint256" },
      ],
      outputs: [],
    },
  ] as const;

  console.log("Creating game...");

  const hash = await walletClient.writeContract({
    address: GAME_FACTORY_ADDRESS,
    abi: gameFactoryAbi,
    functionName: "createGame",
    args: [
      MOCK_ERC20_ADDRESS,  // 실제 ERC20 토큰 주소
      BigInt(300),         // 5분 게임
      parseEther("1"),     // 1 토큰 비용
    ],
    gas: 3000000n,
  });

  console.log("Transaction hash:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Game created! Block:", receipt.blockNumber);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
