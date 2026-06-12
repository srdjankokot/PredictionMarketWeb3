import { createPublicClient, http } from 'viem';
import { PredictionMarketABI } from '../lib/abi';
const PM = '0x23d2B9ef209E3A6713CA448617B16a18275a9444' as const;
const RPC = 'https://sepolia.base.org';
const c = createPublicClient({ transport: http(RPC) });

(async () => {
  const count = Number(await c.readContract({ address: PM, abi: PredictionMarketABI, functionName: 'marketCount' }));
  console.log(`ON-CHAIN marketCount = ${count}\n`);
  const seen: Record<string, number[]> = {};
  for (let i = 1; i <= count; i++) {
    const m = await c.readContract({ address: PM, abi: PredictionMarketABI, functionName: 'getMarket', args: [BigInt(i)] }) as any;
    const yes = Number(m.yesPool) / 1e6, no = Number(m.noPool) / 1e6;
    const end = new Date(Number(m.endTime) * 1000).toISOString().slice(0, 16);
    console.log(`#${i}  "${m.question}"`);
    console.log(`     pools ${yes}/${no} | ends ${end} | resolved ${m.resolved}${m.resolved ? ' -> ' + (m.outcome ? 'YES' : 'NO') : ''} | totalShares ${Number(m.totalShares)/1e6}`);
    (seen[m.question] ||= []).push(i);
  }
  const dups = Object.entries(seen).filter(([, ids]) => ids.length > 1);
  console.log('\n=== same-question markets (distinct on-chain markets) ===');
  if (dups.length === 0) console.log('none');
  else dups.forEach(([q, ids]) => console.log(`  "${q}" -> ids ${ids.join(', ')}`));
})();
