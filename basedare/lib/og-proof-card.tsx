import { ImageResponse } from 'next/og';

/**
 * Branded "proof receipt" share card — the unit of distribution.
 * Every shareable surface (venue, recap, dare, creator) unfurls as one of
 * these on X / Farcaster / iMessage, so the product markets itself.
 *
 * Pure presentation. Callers derive the copy/stats from their own data and
 * pass them in. Renders fontless (next/og built-in font) so it never depends
 * on a runtime font fetch.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';
export const OG_ALT = 'BaseDare — verified human action';

const GOLD = '#f5c518';

type Stat = { value: string; label: string };

type ProofCardOptions = {
  eyebrow: string;
  title: string;
  location?: string;
  stats: Stat[];
  badge?: string;
  badgeTone?: 'emerald' | 'gold';
  footerNote?: string;
  /** Venue-branded verification seal — turns every shared receipt into venue marketing. */
  venueStamp?: { name: string } | null;
};

function titleFontSize(title: string): number {
  const len = title.length;
  if (len <= 16) return 80;
  if (len <= 24) return 64;
  if (len <= 34) return 52;
  return 42;
}

export function renderProofCard(opts: ProofCardOptions): ImageResponse {
  const {
    eyebrow,
    title,
    location,
    stats,
    badge = 'VERIFIED',
    badgeTone = 'emerald',
    footerNote = 'verified human action · no middlemen',
    venueStamp = null,
  } = opts;

  const badgeColor = badgeTone === 'gold' ? GOLD : '#34d399';
  const badgeBg = badgeTone === 'gold' ? 'rgba(245,197,24,0.12)' : 'rgba(52,211,153,0.12)';
  const badgeBorder = badgeTone === 'gold' ? 'rgba(245,197,24,0.5)' : 'rgba(52,211,153,0.5)';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          position: 'relative',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          background: 'linear-gradient(135deg, #0a0a18 0%, #05050c 60%, #0a0712 100%)',
          color: '#ffffff',
        }}
      >
        {venueStamp ? (
          <div
            style={{
              position: 'absolute',
              right: '76px',
              top: '196px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '212px',
              height: '212px',
              borderRadius: '9999px',
              border: '3px solid rgba(245,197,24,0.75)',
              boxShadow: 'inset 0 0 0 8px #05050c, inset 0 0 0 11px rgba(245,197,24,0.45)',
              background: 'rgba(245,197,24,0.07)',
              transform: 'rotate(-8deg)',
              color: GOLD,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '16px',
                letterSpacing: '3px',
                fontWeight: 700,
                color: 'rgba(245,197,24,0.8)',
              }}
            >
              VERIFIED AT
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                textAlign: 'center',
                maxWidth: '176px',
                margin: '8px 0',
                fontSize: venueStamp.name.length > 12 ? '23px' : '30px',
                fontWeight: 800,
                letterSpacing: '1px',
              }}
            >
              {venueStamp.name.toUpperCase()}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '14px',
                letterSpacing: '2px',
                color: 'rgba(245,197,24,0.7)',
              }}
            >
              ✓ #HUMANONLY
            </div>
          </div>
        ) : null}
        {/* top row: wordmark + verified badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: '34px', fontWeight: 800, letterSpacing: '2px', color: GOLD }}>
            {'{ BASEDARE }'}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 22px',
              borderRadius: '999px',
              background: badgeBg,
              border: `1px solid ${badgeBorder}`,
              color: badgeColor,
              fontSize: '24px',
              fontWeight: 700,
              letterSpacing: '1px',
            }}
          >
            {badge}
          </div>
        </div>

        {/* middle: eyebrow + title + location */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '26px',
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '3px',
              fontWeight: 600,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: `${titleFontSize(title)}px`,
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: venueStamp ? '790px' : '1060px',
            }}
          >
            {title}
          </div>
          {location ? (
            <div style={{ display: 'flex', fontSize: '30px', color: GOLD, fontWeight: 600 }}>{location}</div>
          ) : null}
        </div>

        {/* stat row */}
        <div style={{ display: 'flex', gap: '48px' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: '44px', fontWeight: 800, color: '#ffffff' }}>{s.value}</div>
              <div style={{ display: 'flex', fontSize: '22px', color: 'rgba(255,255,255,0.5)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '24px',
            fontSize: '24px',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <div style={{ display: 'flex' }}>{footerNote}</div>
          <div style={{ display: 'flex', color: GOLD, fontWeight: 700 }}>www.basedare.xyz</div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
