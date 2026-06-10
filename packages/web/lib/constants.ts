/**
 * Single access point for environment configuration. NEVER read process.env
 * directly in components — import from here.
 *
 * Public (NEXT_PUBLIC_*) values are resolved at RUNTIME, not build time:
 *  - On the server they come from process.env (real at runtime).
 *  - On the client they come from window.__PREDICTX_ENV__, which the root layout
 *    injects per request from process.env.
 * This means the app works on hosts that don't pass env to the Docker build
 * (e.g. Render), and brand/contract config can change with a restart — no rebuild.
 */

import { SOCKET_AUTH_MESSAGE } from '@predictx/shared';

type PublicEnv = Record<string, string>;

/** The exact keys injected into window.__PREDICTX_ENV__ by the root layout. */
export const PUBLIC_ENV_KEYS = [
  'NEXT_PUBLIC_CONTRACT_ADDRESS',
  'NEXT_PUBLIC_USDC_ADDRESS',
  'NEXT_PUBLIC_CHAIN_ID',
  'NEXT_PUBLIC_RPC_URL',
  'NEXT_PUBLIC_ADMIN_ADDRESS',
  'NEXT_PUBLIC_SOCKET_URL',
  'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
] as const;

function readPublic(key: (typeof PUBLIC_ENV_KEYS)[number]): string {
  if (typeof window !== 'undefined') {
    const injected = (window as unknown as { __PREDICTX_ENV__?: PublicEnv }).__PREDICTX_ENV__;
    return injected?.[key] ?? '';
  }
  // Server runtime — process.env is real here.
  return process.env[key] ?? '';
}

/** Builds the object the root layout serializes into the page (server-side). */
export function getPublicEnv(): PublicEnv {
  const out: PublicEnv = {};
  for (const key of PUBLIC_ENV_KEYS) out[key] = process.env[key] ?? '';
  return out;
}

/* ---- Public (client-safe, runtime-resolved) ---- */
export const CONTRACT_ADDRESS = readPublic('NEXT_PUBLIC_CONTRACT_ADDRESS') as `0x${string}`;
export const USDC_ADDRESS = readPublic('NEXT_PUBLIC_USDC_ADDRESS') as `0x${string}`;
export const CHAIN_ID = Number(readPublic('NEXT_PUBLIC_CHAIN_ID') || '84532');
export const PUBLIC_RPC_URL = readPublic('NEXT_PUBLIC_RPC_URL');
export const ADMIN_ADDRESS = readPublic('NEXT_PUBLIC_ADMIN_ADDRESS').toLowerCase();
export const SOCKET_URL = readPublic('NEXT_PUBLIC_SOCKET_URL');
export const WC_PROJECT_ID = readPublic('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID');

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
