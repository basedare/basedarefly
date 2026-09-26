import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { eventPosterError, eventPosterMatchesBytes, MAX_EVENT_POSTER_BYTES } from '@/lib/event-poster';
import { uploadPublicMediaFile } from '@/lib/media-upload';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  if (!checkRateLimit(`event-poster:${auth.walletAddress}`, { limit: 10, windowMs: 60000 }).allowed) {
    return NextResponse.json({ success: false, error: 'Too many uploads. Try again in a minute.' }, { status: 429 });
  }
  if (Number(request.headers.get('content-length')) > MAX_EVENT_POSTER_BYTES + 65536) {
    return NextResponse.json({ success: false, error: 'Choose a poster smaller than 4 MB.' }, { status: 413 });
  }
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: 'Choose a poster.' }, { status: 400 });
    const error = eventPosterError(file);
    if (error) return NextResponse.json({ success: false, error }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!eventPosterMatchesBytes(file.type, bytes)) return NextResponse.json({ success: false, error: 'The file is not a valid JPG or PNG.' }, { status: 415 });
    const normalized = new File([bytes], file.type === 'image/png' ? 'event-poster.png' : 'event-poster.jpg', { type: file.type });
    const upload = await uploadPublicMediaFile({ file: normalized, name: 'BaseDare_Event_Poster', keyvalues: { app: 'basedare', kind: 'event-source' } });
    return NextResponse.json({ success: true, data: { url: upload.url, cid: upload.cid } });
  } catch {
    return NextResponse.json({ success: false, error: 'Poster upload failed. Your draft is still here; retry or use a public source link.' }, { status: 503 });
  }
}
