import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import type { Chain } from 'viem';
import { activeChain } from './chains';
import { PUBLIC_RPC_URL, WC_PROJECT_ID } from './constants';

/**
 * wagmi + RainbowKit config. getDefaultConfig wires the standard connectors
 * (injected + WalletConnect) and persists the last connector to localStorage,
 * so wagmi silently reconnects on mount (isReconnecting). We never auto-open
 * the connect modal — see useRole / RoleGate for the reconnect guard.
 */
export const wagmiConfig = getDefaultConfig({
  appName: 'PredictX',
  projectId: WC_PROJECT_ID || 'predictx_dev_placeholder',
  chains: [activeChain] as [Chain, ...Chain[]],
  transports: {
    [activeChain.id]: http(PUBLIC_RPC_URL || undefined),
  },
  ssr: true,
});
