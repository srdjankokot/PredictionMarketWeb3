import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, SocketAuth } from '@predictx/shared';
import { SOCKET_URL } from './constants';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/** Lazily create the (not-yet-connected) singleton socket. */
export function getSocket(): AppSocket {
  if (!socket) {
    // Empty SOCKET_URL -> same origin as the custom Next/Socket.io server.
    socket = io(SOCKET_URL || undefined, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

/**
 * Connect (optionally authenticated). Guests pass no auth and join public rooms;
 * Traders/Admins pass { address, signature, message } for verification.
 */
export function connectSocket(auth?: SocketAuth): AppSocket {
  const s = getSocket();
  // Re-handshake so a changed identity (guest -> wallet, or switched account)
  // is re-evaluated by the server's auth middleware.
  if (s.connected) s.disconnect();
  s.auth = auth ? { ...auth } : {};
  s.connect();
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
