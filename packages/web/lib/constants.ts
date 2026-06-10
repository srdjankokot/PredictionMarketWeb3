/**
 * Single access point for environment configuration. NEVER read process.env
 * directly in components — import from here.
 *
 * Two tiers:
 *  - PUBLIC (NEXT_PUBLIC_*) values are inlined into the client bundle.
 *  - SERVER values have no NEXT_PUBLIC_ prefix and are `undefined` on the client;
 *    only reference them in server code (API routes, server.ts, lib/eventListener).
 */

import { SOCKET_AUTH_MESSAGE } from '@predictx/shared';

/* ---- Public (client-safe) ---- */
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '') as `0x${string}`;
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '') as `0x${string}`;
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '84532');
export const PUBLIC_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? '';
export const ADMIN_ADDRESS = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS ?? '').toLowerCase();
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? '';
export const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

/* ---- Server-only (undefined on the client) ---- */
export const SERVER_RPC_URL = process.env.RPC_URL ?? PUBLIC_RPC_URL;
export const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? '';
export const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS ?? '';
export const DATABASE_URL = process.env.DATABASE_URL ?? '';
export const FEE_BPS = Number(process.env.FEE_BPS ?? '100');

/* ---- Derived constants ---- */
export const USDC_DECIMALS = 6;
export const FEE_RATE = FEE_BPS / 10_000;
export const IS_FEE_ENABLED = FEE_BPS > 0;
/** Frontend slippage tolerance applied to minShares (1%). */
export const SLIPPAGE_TOLERANCE = 0.01;
/** Show a price-impact warning above this threshold (5%). */
export const PRICE_IMPACT_WARNING = 0.05;
/** Fixed message Traders/Admins sign for the socket handshake. */
export const AUTH_MESSAGE = SOCKET_AUTH_MESSAGE;

/** True when a connected wallet is the configured admin. */
export function isAdminAddress(address?: string | null): boolean {
  if (!address || !ADMIN_ADDRESS) return false;
  return address.toLowerCase() === ADMIN_ADDRESS;
}

/** Throws at startup if a required public var is missing (call from server only). */
export function assertContractsConfigured(): void {
  if (!CONTRACT_ADDRESS || !USDC_ADDRESS) {
    throw new Error(
      'Missing NEXT_PUBLIC_CONTRACT_ADDRESS / NEXT_PUBLIC_USDC_ADDRESS. Run `npm run deploy` and copy the values into .env.local.',
    );
  }
}
