'use client';

import { useState, type ReactNode } from 'react';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { AppLoader } from '@/components/AppLoader';
import { SocketManager } from '@/components/SocketManager';
import { TenantProvider } from '@/components/TenantProvider';
import { ToastProvider } from '@/components/shared/Toast';
import { UnclaimedWinningsNotifier } from '@/components/UnclaimedWinningsNotifier';
import { WalletSync } from '@/components/WalletSync';
import { wagmiConfig } from '@/lib/wagmi';
import type { TenantConfig } from '@/lib/tenant.config';

export function Providers({ tenant, children }: { tenant: TenantConfig; children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: tenant.primary, borderRadius: 'medium' })}>
          <TenantProvider tenant={tenant}>
            <ToastProvider>
              <WalletSync />
              <SocketManager />
              <UnclaimedWinningsNotifier />
              <AppLoader />
              {children}
            </ToastProvider>
          </TenantProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
