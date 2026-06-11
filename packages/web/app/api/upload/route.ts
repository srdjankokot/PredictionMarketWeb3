import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { isAdminRequest } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * POST /api/upload — multipart/form-data, field "image".
 * Resizes to a small square (sharp) and returns it as a base64 data URI, which
 * is stored directly in the DB. No filesystem: works on ephemeral hosts (Render
 * free) and survives restarts/spin-downs. For very high volume, swap to S3/R2.
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

  const input = Buffer.from(await file.arrayBuffer());
  let dataUrl: string;
  try {
    const output = await sharp(input)
      .resize(256, 256, { fit: 'cover', position: 'centre' })
      .webp({ quality: 80 })
      .toBuffer();
    dataUrl = `data:image/webp;base64,${output.toString('base64')}`;
  } catch (err) {
    // sharp unavailable/failed — fall back to the original bytes (still capped at 2MB).
    console.error('[upload] sharp failed, storing original', err);
    dataUrl = `data:${file.type};base64,${input.toString('base64')}`;
  }

  return NextResponse.json({ imageUrl: dataUrl });
}
