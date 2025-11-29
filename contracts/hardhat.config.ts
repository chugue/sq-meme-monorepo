import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-viem/types";
// Explicitly import hardhat-viem to ensure HRE extension
import "@nomicfoundation/hardhat-viem";

import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    insectarium: {
      type: "http",
      chainType: "l1",
      chainId: 43522,
      url: "https://rpc.insectarium.memecore.net",
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
});
