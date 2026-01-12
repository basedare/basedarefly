'use client';

export async function uploadToIPFS(file: File, dareId?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  if (dareId) formData.append('dareId', dareId);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Upload failed (${res.status})`);
  }

  const data: any = await res.json();
  if (!data?.cid) throw new Error('Upload failed (missing cid)');
  return data.cid as string;
}

