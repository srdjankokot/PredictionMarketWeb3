import { NextResponse, type NextRequest } from 'next/server';
import { PredictionMarketABI } from '@/lib/abi';
import { isAdminRequest } from '@/lib/auth';
import { getServerWallet, publicClient } from '@/lib/chainServer';
import { CONTRACT_ADDRESS } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { activeChain } from '@/lib/chains';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/resolve/[id] — resolves a market on-chain using the owner
 * (deployer) key, then lets the event listener sync DB + emit market:resolved.
 *
 * Body: { outcome: boolean }  (true = YES wins)
 *
 * Requires DEPLOYER_PRIVATE_KEY. If you prefer resolving from the admin's
 * browser wallet instead, the client can call the contract directly; this
 * endpoint is the server-side path.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.outcome !== 'boolean') {
    return NextResponse.json({ error: 'Body must include outcome: boolean' }, { status: 400 });
  }

  const market = await prisma.market.findUnique({ where: { id: params.id } });
  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 });
  if (market.resolved) return NextResponse.json({ error: 'Already resolved' }, { status: 400 });

  const wallet = getServerWallet();
  if (!wallet || !CONTRACT_ADDRESS) {
    return NextResponse.json(
      { error: 'Server-side resolution unavailable (set DEPLOYER_PRIVATE_KEY), or resolve from the admin wallet.' },
      { status: 501 },
    );
  }

  try {
    const hash = await wallet.writeContract({
      account: wallet.account!,
      chain: activeChain,
      address: CONTRACT_ADDRESS,
      abi: PredictionMarketABI,
      functionName: 'resolveMarket',
      args: [BigInt(market.contractId), body.outcome],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    // Optimistically reflect in DB; the event listener will also sync + emit.
    await prisma.market.update({
      where: { id: market.id },
      data: { resolved: true, outcome: body.outcome ? 'YES' : 'NO', status: 'RESOLVED' },
    });

    return NextResponse.json({ ok: true, txHash: hash });
  } catch (err) {
    console.error('[resolve] on-chain resolve failed', err);
    return NextResponse.json({ error: 'On-chain resolution failed' }, { status: 500 });
  }
}
