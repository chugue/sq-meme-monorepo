import { createPublicClient, http, defineChain, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const insectarium = defineChain({
  id: 43522,
  name: "Insectarium Testnet",
  nativeCurrency: { name: "Meme", symbol: "M", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.insectarium.memecore.net"] },
  },
});

const GAME_FACTORY_ADDRESS = "0xd05c307975ddb188b9de81b30562a34cd4557e3d";
const MOCK_ERC20_ADDRESS = "0xd28510be5086d84e79de3d3b5459abf8964d2543";

async function main() {
  let privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not found");
  if (!privateKey.startsWith("0x")) privateKey = `0x${privateKey}`;

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log("Account:", account.address);

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
      name: "allowance",
      type: "function",
      inputs: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
      ],
      outputs: [{ type: "uint256" }],
      stateMutability: "view",
    },
  ] as const;

  const balance = await publicClient.readContract({
    address: MOCK_ERC20_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  const allowance = await publicClient.readContract({
    address: MOCK_ERC20_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account.address, GAME_FACTORY_ADDRESS],
  });

  const cost = parseEther("1");

  console.log("\n=== Token Status ===");
  console.log("Balance:", balance.toString(), "wei");
  console.log("Balance (ETH):", Number(balance) / 1e18);
  console.log("Allowance for GameFactory:", allowance.toString(), "wei");
  console.log("Allowance (ETH):", Number(allowance) / 1e18);
  console.log("Required cost:", cost.toString(), "wei");
  console.log("\n=== Check ===");
  console.log("Has enough balance:", balance >= cost);
  console.log("Has enough allowance:", allowance >= cost);
}

main().catch(console.error);
