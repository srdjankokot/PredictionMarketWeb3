'use client';

import { useEffect, useRef } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { AUTH_MESSAGE } from '@/lib/constants';
import { connectSocket } from '@/lib/socket';

/**
 * Owns the single Socket.io connection.
 *  - Guests connect immediately (public rooms only).
 *  - Wallet users sign AUTH_MESSAGE once per session (cached in sessionStorage)
 *    to upgrade to an authenticated socket; admins are then placed in the admin
 *    room by the server. A rejected signature gracefully falls back to guest.
 *
 * Never opens the connect modal — connection is silent.
 */
export function SocketManager() {
  const { address, isConnected, isReconnecting } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (isReconnecting) return; // wait for wagmi to settle
    let cancelled = false;

    async function connect() {
      if (!isConnected || !address) {
        if (lastKey.current !== 'guest') {
          lastKey.current = 'guest';
          connectSocket();
        }
        return;
      }

      const key = address.toLowerCase();
      if (lastKey.current === key) return;

      const cacheKey = `predictx_sig_${key}`;
      let signature = sessionStorage.getItem(cacheKey);
      if (!signature) {
        try {
          signature = await signMessageAsync({ message: AUTH_MESSAGE });
          sessionStorage.setItem(cacheKey, signature);
        } catch {
          // user rejected — connect as guest (still gets public rooms)
          lastKey.current = 'guest';
          connectSocket();
          return;
        }
      }
      if (cancelled) return;
      lastKey.current = key;
      connectSocket({ address, signature, message: AUTH_MESSAGE });
    }

    void connect();
    return () => {
      cancelled = true;
    };
  }, [address, isConnected, isReconnecting, signMessageAsync]);

  return null;
}
