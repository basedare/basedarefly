export interface CapturedProofLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: number;
}

/**
 * Best-effort browser geolocation for a nearby IRL proof submission.
 *
 * Returns null on denial / unavailable / timeout — the server then treats it as
 * missing location and routes to review, NEVER a silent auto-approve. Device GPS
 * is evidence, not spoof-proof truth; the server validates and gates.
 */
export async function captureProofLocation(timeoutMs = 10000): Promise<CapturedProofLocation | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  return new Promise<CapturedProofLocation | null>((resolve) => {
    let settled = false;
    const done = (value: CapturedProofLocation | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    // Hard backstop in case neither geolocation callback ever fires.
    const backstop = setTimeout(() => done(null), timeoutMs + 1000);

    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(backstop);
          done({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
            capturedAt: pos.timestamp || Date.now(),
          });
        },
        () => {
          clearTimeout(backstop);
          done(null);
        },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
      );
    } catch {
      clearTimeout(backstop);
      done(null);
    }
  });
}
