import type { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import { verifyMessage } from 'viem';
import {
  ADMIN_ROOM,
  MARKET_LIST_ROOM,
  marketRoom,
  SOCKET_AUTH_MESSAGE,
  type SocketAuth,
} from '@predictx/shared';
import { isAdminAddress } from './constants';
import { setIO, type AppIO } from './realtime';

/**
 * Creates the Socket.io server, verifies wallet signatures, and wires room
 * join/leave. Guests connect with no auth (public rooms only). Traders/Admins
 * send { address, signature, message }; admins are additionally placed in the
 * `admin` room for resolve notifications.
 */
export function initSocketServer(httpServer: HTTPServer): AppIO {
  const io: AppIO = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use(async (socket, next) => {
    socket.data.address = null;
    socket.data.role = 'GUEST';
    try {
      const auth = socket.handshake.auth as Partial<SocketAuth>;
      if (auth?.address && auth?.signature) {
        const valid = await verifyMessage({
          address: auth.address as `0x${string}`,
          message: auth.message ?? SOCKET_AUTH_MESSAGE,
          signature: auth.signature as `0x${string}`,
        });
        if (valid) {
          socket.data.address = auth.address.toLowerCase();
          socket.data.role = isAdminAddress(auth.address) ? 'ADMIN' : 'TRADER';
        }
      }
    } catch {
      // fall through as guest
    }
    next();
  });

  io.on('connection', (socket) => {
    if (socket.data.role === 'ADMIN') {
      socket.join(ADMIN_ROOM);
    }
    socket.on('join:market', (marketId) => socket.join(marketRoom(marketId)));
    socket.on('leave:market', (marketId) => socket.leave(marketRoom(marketId)));
    socket.on('join:list', () => socket.join(MARKET_LIST_ROOM));
    socket.on('leave:list', () => socket.leave(MARKET_LIST_ROOM));
  });

  setIO(io);
  return io;
}
