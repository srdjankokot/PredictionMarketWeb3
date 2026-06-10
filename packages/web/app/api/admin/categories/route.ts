import { NextResponse, type NextRequest } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { slugify } from '@/lib/categories';
import { prisma } from '@/lib/prisma';
import { toCategoryDTO } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

/** GET /api/admin/categories — all categories with market counts. */
export async function GET() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { markets: true } } },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
  return NextResponse.json({ categories: categories.map(toCategoryDTO) });
}

/** POST /api/admin/categories — create a custom category (admin only). */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.icon) {
    return NextResponse.json({ error: 'Name and icon are required' }, { status: 400 });
  }

  const name = String(body.name).trim();
  const icon = String(body.icon).trim();
  const slug = slugify(body.slug ? String(body.slug) : name);
  if (!name || !slug) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }

  const clash = await prisma.category.findFirst({
    where: { OR: [{ name }, { slug }] },
  });
  if (clash) {
    return NextResponse.json({ error: 'A category with that name or slug already exists' }, { status: 409 });
  }

  const category = await prisma.category.create({
    data: { name, slug, icon, isDefault: false },
  });
  return NextResponse.json({ category: toCategoryDTO(category) }, { status: 201 });
}
