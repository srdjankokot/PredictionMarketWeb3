import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "path";

// Load shared env from the monorepo root (.env then .env.local overrides).
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env.local"), override: true });

const rawKey = process.env.DEPLOYER_PRIVATE_KEY ?? "";
// Accept keys with or without the 0x prefix.
const DEPLOYER_PRIVATE_KEY = rawKey && !rawKey.startsWith("0x") ? `0x${rawKey}` : rawKey;
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];
const RPC_URL = process.env.RPC_URL ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    baseSepolia: {
      url: RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts,
    },
    polygonAmoy: {
      url: RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY ?? "",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
