'use client';

import { useEffect } from 'react';
import type { AdminResolvePendingEvent } from '@predictx/shared';
import { getSocket } from '@/lib/socket';
import { useAdminStore } from '@/store/adminStore';
import { useRole } from './useRole';

/**
 * Mounted at the Header level. Only authenticated admins are placed in the
 * `admin` room by the server, so only they receive admin:resolve:pending.
 * Updates the admin store badge + pending list in realtime.
 */
export function useAdminSocket(): void {
  const { role } = useRole();
  const addPending = useAdminStore((s) => s.addPending);

  useEffect(() => {
    if (role !== 'ADMIN') return;
    const socket = getSocket();
    const onPending = (e: AdminResolvePendingEvent) => addPending(e);
    socket.on('admin:resolve:pending', onPending);
    return () => {
      socket.off('admin:resolve:pending', onPending);
    };
  }, [role, addPending]);
}
