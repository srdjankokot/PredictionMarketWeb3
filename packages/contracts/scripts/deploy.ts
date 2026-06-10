import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploys MockUSDC + PredictionMarket, mints test USDC to the deployer, seeds a
 * handful of sample markets on-chain, and writes packages/contracts/deployments.json
 * (consumed by the web seed to mirror on-chain markets into the DB).
 *
 * Usage:
 *   npm run deploy:local          (against `npm run node`)
 *   npm run deploy:baseSepolia    (needs DEPLOYER_PRIVATE_KEY + RPC_URL in .env)
 *
 * After deploy, copy the printed NEXT_PUBLIC_* / address vars into your .env.local.
 */

const FEE_BPS = Number(process.env.FEE_BPS ?? "100");

interface SampleMarket {
  question: string;
  description: string;
  categorySlug: string;
  yesLabel: string;
  noLabel: string;
  seedUsdc: number;
  durationDays: number;
}

const SAMPLE_MARKETS: SampleMarket[] = [
  {
    question: "Will BTC close above $100k on Dec 31, 2026?",
    description:
      "Resolves YES if the BTC/USD price on Coinbase at 23:59 UTC on 2026-12-31 is at or above $100,000.",
    categorySlug: "crypto",
    yesLabel: "YES",
    noLabel: "NO",
    seedUsdc: 1000,
    durationDays: 30,
  },
  {
    question: "Will the incumbent party win the 2026 general election?",
    description: "Resolves YES if the incumbent party retains the executive after the 2026 vote is certified.",
    categorySlug: "politics",
    yesLabel: "YES",
    noLabel: "NO",
    seedUsdc: 1000,
    durationDays: 14,
  },
  {
    question: "Will the Lakers win their next game?",
    description: "Resolves to the winner of the Lakers' next scheduled regular-season game.",
    categorySlug: "sports",
    yesLabel: "Lakers",
    noLabel: "Opponent",
    seedUsdc: 1000,
    durationDays: 2,
  },
  {
    question: "Will the next Starship flight reach orbital velocity?",
    description: "Resolves YES if SpaceX's next Starship test flight achieves orbital velocity per the official webcast.",
    categorySlug: "science",
    yesLabel: "YES",
    noLabel: "NO",
    seedUsdc: 1000,
    durationDays: 21,
  },
  {
    question: "Will the Fed cut rates at its next meeting?",
    description: "Resolves YES if the FOMC lowers the federal funds target range at its next scheduled meeting.",
    categorySlug: "finance",
    yesLabel: "Cut",
    noLabel: "Hold",
    seedUsdc: 1000,
    durationDays: 10,
  },
  {
    question: "Will a category 5 hurricane form in the Atlantic this season?",
    description: "Resolves YES if the NHC classifies any Atlantic storm as Category 5 during the current season.",
    categorySlug: "world-events",
    yesLabel: "YES",
    noLabel: "NO",
    seedUsdc: 1000,
    durationDays: 45,
  },
];

async function main() {
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      "No signer available. Set DEPLOYER_PRIVATE_KEY in .env for live networks, or run against `npm run node` for localhost.",
    );
  }
  const deployer = signers[0];
  const deployerAddr = await deployer.getAddress();
  const treasury = process.env.TREASURY_ADDRESS && process.env.TREASURY_ADDRESS.startsWith("0x")
    ? process.env.TREASURY_ADDRESS
    : deployerAddr;

  console.log(`\n=== PredictX deploy ===`);
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployerAddr}`);
  console.log(`Treasury: ${treasury}`);
  console.log(`Fee bps:  ${FEE_BPS}`);

  // 1. MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log(`\nMockUSDC deployed:        ${usdcAddr}`);

  // 2. PredictionMarket (AMMPricer is an internal library — inlined, no separate deploy)
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const market = await PredictionMarket.deploy(usdcAddr, treasury, FEE_BPS);
  await market.waitForDeployment();
  const marketAddr = await market.getAddress();
  console.log(`PredictionMarket deployed: ${marketAddr}`);

  // 3. Mint test USDC to the deployer and approve the market for seeding
  const totalSeed = SAMPLE_MARKETS.reduce((acc, m) => acc + m.seedUsdc, 0);
  const mintAmount = ethers.parseUnits(String(Math.max(1_000_000, totalSeed * 10)), 6);
  await (await usdc.mint(deployerAddr, mintAmount)).wait();
  await (await usdc.approve(marketAddr, ethers.MaxUint256)).wait();
  console.log(`Minted ${ethers.formatUnits(mintAmount, 6)} USDC to deployer & approved market.`);

  // 4. Seed sample markets on-chain (skip with SEED_MARKETS=false — e.g. on a
  //    shared testnet where the admin creates markets via the UI instead).
  const seedMarkets = process.env.SEED_MARKETS !== 'false';
  const now = Math.floor(Date.now() / 1000);
  const created: Array<SampleMarket & { contractId: number; endTime: number; endDateISO: string }> = [];
  for (const sm of seedMarkets ? SAMPLE_MARKETS : []) {
    const endTime = now + sm.durationDays * 24 * 60 * 60;
    const tx = await market.createMarket(sm.question, endTime, ethers.parseUnits(String(sm.seedUsdc), 6));
    await tx.wait();
    const contractId = Number(await market.marketCount());
    created.push({ ...sm, contractId, endTime, endDateISO: new Date(endTime * 1000).toISOString() });
    console.log(`  created market #${contractId}: ${sm.question}`);
  }

  // 5. Persist deployment record for the web seed
  const record = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployerAddr,
    treasury,
    feeBps: FEE_BPS,
    usdc: usdcAddr,
    predictionMarket: marketAddr,
    deployedAt: new Date().toISOString(),
    sampleMarkets: created,
  };
  const outPath = path.resolve(__dirname, "../deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
  console.log(`\nWrote ${outPath}`);

  // 6. Print env block to copy into .env.local
  console.log(`\n--- copy into .env.local -------------------------------------`);
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS="${marketAddr}"`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS="${usdcAddr}"`);
  console.log(`NEXT_PUBLIC_CHAIN_ID="${record.chainId}"`);
  console.log(`TREASURY_ADDRESS="${treasury}"`);
  console.log(`FEE_BPS="${FEE_BPS}"`);
  console.log(`# admin = the deployer wallet`);
  console.log(`NEXT_PUBLIC_ADMIN_ADDRESS="${deployerAddr}"`);
  console.log(`--------------------------------------------------------------\n`);
  console.log(`Next: npm run db:push && npm run db:seed && npm run dev`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
