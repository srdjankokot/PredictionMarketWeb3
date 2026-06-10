import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { isAdminRequest } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * POST /api/upload — multipart/form-data, field "image".
 * Validates type/size, crops to a 400x400 square (sharp), and stores the result.
 * MVP storage is the local public/uploads dir; swap for S3/Cloudinary in prod.
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('image');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image exceeds 2MB' }, { status: 413 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPG, PNG or WebP allowed' }, { status: 415 });
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const output = await sharp(input)
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82 })
      .toBuffer();

    const dir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    await writeFile(path.join(dir, name), output);

    return NextResponse.json({ imageUrl: `/uploads/${name}` });
  } catch (err) {
    console.error('[upload] failed', err);
    return NextResponse.json({ error: 'Image processing failed' }, { status: 500 });
  }
}
