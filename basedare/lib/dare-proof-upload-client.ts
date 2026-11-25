type Consent = { processing: boolean; publication: boolean; rightsConfirmed: boolean };
export type PendingVideoUpload = { file: File; ticket: string; cid: string; consent: Consent };

/** Only small authenticated metadata requests hit BaseDare; the original bytes go to Pinata. */
export async function uploadDareVideo(input: { dareId: string; file: File; consent: Consent; headers: () => Promise<Record<string,string>>; pending?: PendingVideoUpload | null; onPending: (value: PendingVideoUpload | null) => void }) {
  const post = async (body: Record<string, unknown>) => {
    const response = await fetch('/api/upload/dare-proof', { method: 'POST', headers: { 'Content-Type': 'application/json', ...await input.headers() }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      if (body.action === 'complete' && result.code === 'UPLOAD_TICKET_EXPIRED') input.onPending(null);
      throw new Error(result.error || 'Could not complete video upload. Try again.');
    }
    return result as { ticket?: string; uploadUrl?: string; existingProof?: boolean; url?: string; cid?: string };
  };
  let pending = input.pending?.file === input.file ? input.pending : null;
  if (!pending) {
    const sha256 = input.consent.processing ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await input.file.arrayBuffer()))).map(byte => byte.toString(16).padStart(2, '0')).join('') : null;
    const prepared = await post({ action: 'prepare', dareId: input.dareId, name: input.file.name, mime: input.file.type, size: input.file.size, sha256, consent: input.consent });
    if (prepared.existingProof && prepared.url) return prepared;
    if (!prepared.ticket || !prepared.uploadUrl) throw new Error('Video upload authorization is missing.');
    const signed = new URL(prepared.uploadUrl);
    if (signed.protocol !== 'https:' || signed.hostname !== 'uploads.pinata.cloud') throw new Error('Invalid video storage destination.');
    const { PinataSDK } = await import('pinata');
    // The vendor SDK handles multipart and large resumable uploads; no API key enters the browser.
    const pinata = new PinataSDK({ pinataJwt: '' });
    let uploaded;
    try {
      uploaded = await pinata.upload.public.file(input.file).url(prepared.uploadUrl).name(`BaseDare_Proof_${input.dareId}`).keyvalues({ basedareDare: input.dareId, basedareTicket: prepared.ticket, app: 'basedare' });
    } catch {
      throw new Error('Video storage did not finish the upload. Please retry on a stable connection.');
    }
    if (!uploaded.cid) throw new Error('Storage did not confirm the uploaded video.');
    pending = { file: input.file, ticket: prepared.ticket, cid: uploaded.cid, consent: input.consent };
    input.onPending(pending);
  }
  // Refresh the existing proof signature after a potentially long phone upload.
  return post({ action: 'complete', dareId: input.dareId, ticket: pending.ticket, cid: pending.cid });
}
