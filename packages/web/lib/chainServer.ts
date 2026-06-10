import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { activeChain } from './chains';
import { DEPLOYER_PRIVATE_KEY, SERVER_RPC_URL } from './constants';

/** Server-side viem client used by the event listener and server reads. */
export const publicClient: PublicClient = createPublicClient({
  chain: activeChain,
  transport: http(SERVER_RPC_URL || undefined),
});

/**
 * Owner wallet client for server-side admin actions (e.g. resolving markets),
 * signing with DEPLOYER_PRIVATE_KEY (the contract owner). Returns null when no
 * key is configured — callers should treat that as "not available".
 */
export function getServerWallet(): WalletClient | null {
  if (!DEPLOYER_PRIVATE_KEY) return null;
  const key = DEPLOYER_PRIVATE_KEY.startsWith('0x')
    ? (DEPLOYER_PRIVATE_KEY as `0x${string}`)
    : (`0x${DEPLOYER_PRIVATE_KEY}` as `0x${string}`);
  const account = privateKeyToAccount(key);
  return createWalletClient({
    account,
    chain: activeChain,
    transport: http(SERVER_RPC_URL || undefined),
  });
}
