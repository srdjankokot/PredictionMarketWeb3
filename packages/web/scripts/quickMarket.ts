import '../lib/loadEnv'; // load packages/web/.env first
import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ERC20ABI, PredictionMarketABI } from '../lib/abi';
import { activeChain } from '../lib/chains';
import {
  ADMIN_ADDRESS,
  CONTRACT_ADDRESS,
  DEPLOYER_PRIVATE_KEY,
  SERVER_RPC_URL,
  USDC_ADDRESS,
} from '../lib/constants';

/**
 * Dev helper: creates a market that expires ~2 minutes from now so the
 * expiry-cron + resolve flow can be tested quickly. Creates it on-chain with the
 * deployer key, then registers metadata via the same POST /api/markets the UI uses.
 */
async function main() {
  const minutes = Number(process.argv[2] ?? '2');
  const key = DEPLOYER_PRIVATE_KEY.startsWith('0x')
    ? (DEPLOYER_PRIVATE_KEY as `0x${string}`)
    : (`0x${DEPLOYER_PRIVATE_KEY}` as `0x${string}`);
  const account = privateKeyToAccount(key);
  const transport = http(SERVER_RPC_URL);
  const wallet = createWalletClient({ account, chain: activeChain, transport });
  const pub = createPublicClient({ chain: activeChain, transport });

  // Ensure allowance (deploy already approved MaxUint256, but be safe).
  const seed = parseUnits('100', 6);
  const allowance = (await pub.readContract({
    address: USDC_ADDRESS,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: [account.address, CONTRACT_ADDRESS],
  })) as bigint;
  if (allowance < seed) {
    const ah = await wallet.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESS, seed * 100n],
    });
    await pub.waitForTransactionReceipt({ hash: ah });
  }

  const endMs = Date.now() + minutes * 60 * 1000;
  const endSec = BigInt(Math.floor(endMs / 1000));
  const question = `TEST · Will this market be resolved? (expires in ${minutes} min)`;

  const hash = await wallet.writeContract({
    address: CONTRACT_ADDRESS,
    abi: PredictionMarketABI,
    functionName: 'createMarket',
    args: [question, endSec, seed],
  });
  await pub.waitForTransactionReceipt({ hash });

  const contractId = Number(
    await pub.readContract({ address: CONTRACT_ADDRESS, abi: PredictionMarketABI, functionName: 'marketCount' }),
  );
  console.log(`On-chain market #${contractId} created, ends ${new Date(endMs).toLocaleTimeString()}`);

  // Register metadata via the running app (same path as the UI).
  const cats = await fetch('http://localhost:3000/api/admin/categories').then((r) => r.json());
  const crypto = cats.categories.find((c: { slug: string }) => c.slug === 'crypto') ?? cats.categories[0];

  const res = await fetch('http://localhost:3000/api/markets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-wallet-address': ADMIN_ADDRESS },
    body: JSON.stringify({
      contractId,
      question,
      description: 'Temporary test market used to exercise the expiry + resolve flow.',
      categoryId: crypto.id,
      endDate: new Date(endMs).toISOString(),
      yesLabel: 'YES',
      noLabel: 'NO',
    }),
  });
  console.log(`Metadata POST -> ${res.status}. Open http://localhost:3000/market/${contractId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
