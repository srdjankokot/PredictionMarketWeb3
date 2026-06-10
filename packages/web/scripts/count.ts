import { createPublicClient, http } from 'viem';
import { PredictionMarketABI } from '../lib/abi';
const PM = '0x23d2B9ef209E3A6713CA448617B16a18275a9444' as const;
const c = createPublicClient({ transport: http('https://sepolia.base.org') });
(async () => {
  const count = await c.readContract({ address: PM, abi: PredictionMarketABI, functionName: 'marketCount' }) as bigint;
  console.log('on-chain marketCount:', Number(count));
  for (let i = 1; i <= Number(count); i++) {
    const m = await c.readContract({ address: PM, abi: PredictionMarketABI, functionName: 'getMarket', args: [BigInt(i)] }) as any;
    console.log(`  #${i}: "${m.question}"`);
  }
})();
