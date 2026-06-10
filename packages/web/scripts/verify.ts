import { createPublicClient, http } from 'viem';
import { PredictionMarketABI } from '../lib/abi';
const PM = '0x23d2B9ef209E3A6713CA448617B16a18275a9444' as const;
const c = createPublicClient({ transport: http('https://sepolia.base.org') });
(async () => {
  const code = await c.getBytecode({ address: PM });
  const [usdc, feeBps, treasury, count] = await Promise.all([
    c.readContract({ address: PM, abi: PredictionMarketABI, functionName: 'usdc' }),
    c.readContract({ address: PM, abi: PredictionMarketABI, functionName: 'feeBps' }),
    c.readContract({ address: PM, abi: PredictionMarketABI, functionName: 'treasury' }),
    c.readContract({ address: PM, abi: PredictionMarketABI, functionName: 'marketCount' }),
  ]);
  console.log('deployed:', (code?.length ?? 0) > 2);
  console.log('usdc:', usdc);
  console.log('feeBps:', Number(feeBps as bigint));
  console.log('treasury:', treasury);
  console.log('marketCount:', Number(count as bigint));
})();
