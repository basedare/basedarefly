import { SIARGAO_CHALLENGE_ID, SIARGAO_VERDICTS } from '@/lib/siargao-challenge';
import { renderProofCard } from '@/lib/og-proof-card';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; verdict: string }> }) {
  const { id, verdict } = await params;
  const choice = id === SIARGAO_CHALLENGE_ID && SIARGAO_VERDICTS.find((item) => item.id === verdict);
  if (!choice) return new Response('Not found', { status: 404 });
  const fallback = () => renderProofCard({
    eyebrow: 'MY SIARGAO TAKE', title: choice.headline, location: 'General Luna · Siargao',
    stats: [{ value: 'What’s your verdict?', label: choice.invitation }],
    badge: 'TRY IT YOURSELF', badgeTone: 'gold',
    footerNote: 'Personal opinion · Self-reported adventure',
  });
  let response: ImageResponse;
  try {
    const [logo, bear, font] = await Promise.all([
      readFile(path.join(process.cwd(), 'public/assets/siargao-challenge/wordmark.png')),
      readFile(path.join(process.cwd(), 'public/assets/siargao-challenge/peebear.png')),
      readFile(path.join(process.cwd(), 'public/assets/siargao-challenge/figtree-800.woff')),
    ]);
    response = new ImageResponse(<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 1200, height: 630, padding: 54, color: '#fff8df', background: 'linear-gradient(125deg,#10121f,#241131 70%,#15101b)', fontFamily: 'Figtree', fontWeight: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Satori renders ordinary image elements into the generated PNG. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${logo.toString('base64')}`} width={300} height={83} alt="BaseDare" style={{ objectFit: 'contain' }} />
        <div style={{ display: 'flex', color: '#ffe16b', fontSize: 20, letterSpacing: 3 }}>MY SIARGAO TAKE</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 26 }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 710 }}>
          <div style={{ display: 'flex', fontSize: 72, lineHeight: 1.02, letterSpacing: -2 }}>{choice.headline}</div>
          <div style={{ display: 'flex', color: '#dbc5f4', fontSize: 28, marginTop: 26 }}>{choice.invitation}</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${bear.toString('base64')}`} width={270} height={300} alt="PeeBear" style={{ objectFit: 'contain', transform: 'rotate(-7deg)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '3px solid #bc80dc', paddingTop: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}><span style={{ fontSize: 22 }}>General Luna · Siargao</span><span style={{ fontSize: 17, color: '#c2b6cc' }}>Personal opinion · Self-reported adventure</span></div>
        <div style={{ display: 'flex', padding: '17px 23px', borderRadius: 16, background: '#ffe16b', color: '#211427', fontSize: 23 }}>TAKE THE CHALLENGE →</div>
      </div>
    </div>, { width: 1200, height: 630, fonts: [{ name: 'Figtree', data: font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) as ArrayBuffer, weight: 800 }] });
  } catch { response = fallback(); }
  response.headers.set('Content-Disposition', 'inline; filename="basedare-siargao-verdict.png"');
  response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  return response;
}
