import 'server-only';

type Stream = { isActive?: boolean; isHealthy?: boolean | null; name: string; playbackId?: string };

/** The only Studio SDK operation used by BaseDare; never follows redirects with its key. */
export async function getLivepeerStream(streamId: string, apiKey: string, fetcher: typeof fetch = fetch): Promise<{ stream: Stream }> {
  if (!streamId || streamId.length > 256 || !apiKey) throw new Error('Livepeer stream lookup is not configured');
  let response: Response;
  try {
    response = await fetcher(`https://livepeer.studio/api/stream/${encodeURIComponent(streamId)}`, {
      method: 'GET', headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new Error('Livepeer stream lookup unavailable');
  }
  if (!response.ok) throw new Error(`Livepeer stream lookup failed (${response.status})`);
  let value: unknown;
  try { value = await response.json(); } catch { throw new Error('Livepeer returned an invalid stream'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Livepeer returned an invalid stream');
  const raw = value as Record<string, unknown>;
  if (typeof raw.name !== 'string' ||
      (raw.isActive !== undefined && typeof raw.isActive !== 'boolean') ||
      (raw.isHealthy !== undefined && raw.isHealthy !== null && typeof raw.isHealthy !== 'boolean') ||
      (raw.playbackId !== undefined && typeof raw.playbackId !== 'string')) throw new Error('Livepeer returned an invalid stream');
  return { stream: { isActive: raw.isActive as boolean | undefined, isHealthy: raw.isHealthy as boolean | null | undefined,
    name: raw.name, playbackId: raw.playbackId as string | undefined } };
}
