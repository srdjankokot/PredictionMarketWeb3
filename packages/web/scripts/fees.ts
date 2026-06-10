import { createPublicClient, http } from 'viem';
import { PredictionMarketABI, ERC20ABI } from '../lib/abi';
const RPC = 'https://sepolia.base.org';
const PM = '0xCb523F45503155680046d96b2f85948424c09C70' as const;
const USDC = '0x3Eed6D7D3470804e1354bf88B88dc56837A74162' as const;
const c = createPublicClient({ transport: http(RPC) });
(async () => {
  const [feeBps, treasury, fees] = await Promise.all([
    c.readContract({ address: PM, abi: PredictionMarketABI, functionName: 'feeBps' }) as Promise<bigint>,
    c.readContract({ address: PM, abi: PredictionMarketABI, functionName: 'treasury' }) as Promise<string>,
    c.readContract({ address: PM, abi: PredictionMarketABI, functionName: 'accumulatedFees' }) as Promise<bigint>,
  ]);
  const treBal = await c.readContract({ address: USDC, abi: ERC20ABI, functionName: 'balanceOf', args: [treasury] }) as bigint;
  console.log('feeBps:', Number(feeBps), `(${Number(feeBps)/100}% po trejdu)`);
  console.log('treasury:', treasury);
  console.log('accumulatedFees (ceka withdraw):', Number(fees)/1e6, 'USDC');
  console.log('treasury USDC balance:', Number(treBal)/1e6, 'USDC');
})();
