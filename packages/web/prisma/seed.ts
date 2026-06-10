import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_CATEGORIES } from '../lib/categories';

const prisma = new PrismaClient();

interface DeploymentRecord {
  sampleMarkets?: Array<{
    contractId: number;
    question: string;
    description: string;
    categorySlug: string;
    yesLabel: string;
    noLabel: string;
    seedUsdc: number;
    endDateISO: string;
  }>;
}

async function seedCategories(): Promise<void> {
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon, isDefault: true },
      create: { name: c.name, slug: c.slug, icon: c.icon, isDefault: true },
    });
  }
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories.`);
}

async function seedAdmin(): Promise<void> {
  const admin = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();
  if (!admin) return;
  await prisma.user.upsert({
    where: { address: admin },
    update: { role: 'ADMIN' },
    create: { address: admin, role: 'ADMIN' },
  });
  console.log(`Seeded admin user ${admin}.`);
}

async function seedSampleMarkets(): Promise<void> {
  const recordPath = path.resolve(__dirname, '../../contracts/deployments.json');
  if (!fs.existsSync(recordPath)) {
    console.log('No deployments.json found — skipping sample markets. Run `npm run deploy` first.');
    return;
  }
  const record = JSON.parse(fs.readFileSync(recordPath, 'utf8')) as DeploymentRecord;
  const markets = record.sampleMarkets ?? [];

  for (const sm of markets) {
    const category =
      (await prisma.category.findUnique({ where: { slug: sm.categorySlug } })) ??
      (await prisma.category.findUnique({ where: { slug: 'other' } }));
    if (!category) continue;

    const id = String(sm.contractId);
    const half = sm.seedUsdc / 2;
    await prisma.market.upsert({
      where: { id },
      update: {
        question: sm.question,
        description: sm.description,
        categoryId: category.id,
        endDate: new Date(sm.endDateISO),
        yesLabel: sm.yesLabel,
        noLabel: sm.noLabel,
      },
      create: {
        id,
        contractId: sm.contractId,
        question: sm.question,
        description: sm.description,
        categoryId: category.id,
        endDate: new Date(sm.endDateISO),
        status: 'ACTIVE',
        yesLabel: sm.yesLabel,
        noLabel: sm.noLabel,
        yesPool: half,
        noPool: sm.seedUsdc - half,
        volume: 0,
      },
    });
  }
  console.log(`Mirrored ${markets.length} sample market(s) from deployments.json.`);
}

async function main(): Promise<void> {
  await seedCategories();
  await seedAdmin();
  await seedSampleMarkets();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
