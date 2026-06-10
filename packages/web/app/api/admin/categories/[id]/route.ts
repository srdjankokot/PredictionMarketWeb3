import { NextResponse, type NextRequest } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/admin/categories/[id] — admin only, custom categories only.
 * Default categories are protected. Any markets under the deleted category are
 * moved to "Other" first.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const category = await prisma.category.findUnique({
    where: { id: params.id },
    include: { _count: { select: { markets: true } } },
  });
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }
  if (category.isDefault) {
    return NextResponse.json({ error: 'Default categories cannot be deleted' }, { status: 400 });
  }

  if (category._count.markets > 0) {
    const other = await prisma.category.findUnique({ where: { slug: 'other' } });
    if (!other) {
      return NextResponse.json({ error: '"Other" category is missing — cannot reassign markets' }, { status: 500 });
    }
    await prisma.market.updateMany({
      where: { categoryId: category.id },
      data: { categoryId: other.id },
    });
  }

  await prisma.category.delete({ where: { id: category.id } });
  return NextResponse.json({ ok: true });
}
