'use client';

import { useAccount } from 'wagmi';
import type { Role } from '@predictx/shared';
import { isAdminAddress } from '@/lib/constants';

/**
 * Current role from the connected wallet. Critically, while wagmi is silently
 * reconnecting from localStorage we report isLoading (NOT guest) so UI/routing
 * don't flash the guest view or wrongly redirect.
 */
export function useRole(): { role: Role; address?: `0x${string}`; isLoading: boolean } {
  const { address, isConnected, isReconnecting, isConnecting } = useAccount();

  if (isReconnecting || isConnecting) {
    return { role: 'GUEST', isLoading: true };
  }
  if (!isConnected || !address) {
    return { role: 'GUEST', isLoading: false };
  }
  return {
    role: isAdminAddress(address) ? 'ADMIN' : 'TRADER',
    address,
    isLoading: false,
  };
}
