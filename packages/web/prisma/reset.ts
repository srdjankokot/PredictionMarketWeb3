import { PrismaClient } from '@prisma/client';

// Clears the cached markets + trades (keeps categories + users). Use after a
// contract redeploy, since DB rows reference the OLD contract's market ids.
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const trades = await prisma.trade.deleteMany();
  const markets = await prisma.market.deleteMany();
  console.log(`Reset: deleted ${trades.count} trade(s) and ${markets.count} market(s); categories kept.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
