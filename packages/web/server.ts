import './lib/loadEnv'; // must run before any module that reads process.env
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { startCron } from './lib/cron';
import { startEventListener } from './lib/eventListener';
import { initSocketServer } from './lib/socketServer';

/**
 * Custom server: Next.js + Socket.io + cron + on-chain event listener, all in
 * one process so they can share the Socket.io instance (via globalThis).
 *
 * Boot order: prepare Next -> HTTP server -> attach Socket.io -> cron ->
 * event listener -> listen.
 */
const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOSTNAME ?? 'localhost';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main(): Promise<void> {
  await app.prepare();

  const server = createServer((req, res) => {
    handle(req, res, parse(req.url ?? '/', true));
  });

  initSocketServer(server);
  startCron();
  startEventListener();

  server.listen(port, () => {
    console.log(`\n▲ PredictX ready on http://${hostname}:${port}  (dev=${dev})\n`);
  });
}

main().catch((err) => {
  console.error('Fatal: failed to start server', err);
  process.exit(1);
});
