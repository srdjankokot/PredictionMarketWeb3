import type { Chain } from 'viem';
import { base, baseSepolia, hardhat, mainnet, polygonAmoy, sepolia } from 'viem/chains';
import { CHAIN_ID } from './constants';

/** Chains the app knows how to talk to, keyed by chain id. */
const SUPPORTED: Record<number, Chain> = {
  [baseSepolia.id]: baseSepolia, // 84532
  [polygonAmoy.id]: polygonAmoy, // 80002
  [hardhat.id]: hardhat, // 31337 (local node)
  [base.id]: base,
  [sepolia.id]: sepolia,
  [mainnet.id]: mainnet,
};

/** The single chain this deployment operates on (driven by NEXT_PUBLIC_CHAIN_ID). */
export const activeChain: Chain = SUPPORTED[CHAIN_ID] ?? baseSepolia;
