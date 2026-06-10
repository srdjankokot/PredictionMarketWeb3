import cron, { type ScheduledTask } from 'node-cron';
import { getNoPrice, getYesPrice } from './amm';
import { prisma } from './prisma';
import { emitAdminPending, emitExpired } from './realtime';

/**
 * Runs every minute: flips ACTIVE markets whose endDate has passed to EXPIRED,
 * then emits market:expired (to the market + list rooms) and admin:resolve:pending
 * (to the admin room) so the resolve dashboard updates live.
 */
export function startCron(): ScheduledTask {
  const task = cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const expired = await prisma.market.findMany({
        where: { status: 'ACTIVE', endDate: { lte: now } },
      });

      for (const m of expired) {
        await prisma.market.update({ where: { id: m.id }, data: { status: 'EXPIRED' } });
        const expiredAtISO = now.toISOString();

        emitExpired({ marketId: m.id, expiredAt: expiredAtISO });
        emitAdminPending({
          marketId: m.id,
          question: m.question,
          endDate: m.endDate.toISOString(),
          yesPool: m.yesPool,
          noPool: m.noPool,
          yesPrice: getYesPrice(m.yesPool, m.noPool),
          noPrice: getNoPrice(m.yesPool, m.noPool),
          yesLabel: m.yesLabel,
          noLabel: m.noLabel,
          volume: m.volume,
          imageUrl: m.imageUrl,
        });
      }

      if (expired.length > 0) {
        console.log(`[cron] expired ${expired.length} market(s)`);
      }
    } catch (err) {
      console.error('[cron] expiry sweep failed', err);
    }
  });

  console.log('[cron] market-expiry job scheduled (every minute)');
  return task;
}
