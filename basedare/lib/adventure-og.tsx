import { renderProofCard } from './og-proof-card';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Bundled, approved brand art. No remote media or font downloads. */
export async function adventureOg({ title, eyebrow, invitation, footer }: { title: string; eyebrow: string; invitation: string; footer: string }) {
  try {
  // Literal paths let Next include the owned artwork/font in each server bundle.
  const [logo, bear, font] = await Promise.all([
    readFile(path.join(process.cwd(), 'public/assets/siargao-challenge/wordmark.png')),
    readFile(path.join(process.cwd(), 'public/assets/siargao-challenge/peebear.png')),
    readFile(path.join(process.cwd(), 'public/assets/siargao-challenge/figtree-800.woff')),
  ]);
  return new ImageResponse(<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 1200, height: 630, padding: 50, color: '#fff8df', background: 'linear-gradient(130deg,#111620,#291735 72%,#211a0e)', fontFamily: 'Figtree', fontWeight: 800 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${logo.toString('base64')}`} width={265} height={72} alt="BaseDare" />
      <div style={{ display: 'flex', fontSize: 21, color: '#e5bbff' }}>{eyebrow}</div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}><div style={{ display: 'flex', flexDirection: 'column', width: 805 }}><div style={{ display: 'flex', fontSize: title.length > 35 ? 58 : 76, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div><div style={{ display: 'flex', marginTop: 25, fontSize: 26, color: '#dbc6ea' }}>{invitation}</div></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${bear.toString('base64')}`} width={235} height={276} alt="PeeBear" style={{ objectFit: 'contain', transform: 'rotate(-7deg)' }} />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #bc80dc', paddingTop: 24 }}><div style={{ display: 'flex', maxWidth: 720, fontSize: 19, color: '#cfc4db' }}>{footer}</div><div style={{ display: 'flex', background: '#f7cf4b', color: '#211525', padding: '16px 22px', borderRadius: 18, fontSize: 24 }}>YOUR TURN</div></div>
  </div>, { width: 1200, height: 630, fonts: [{ name: 'Figtree', data: font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) as ArrayBuffer, weight: 800 }] });
  } catch {
    return renderProofCard({ title, eyebrow, stats: [{ value: 'Your turn', label: invitation }], badge: 'TRY IT', badgeTone: 'gold', footerNote: footer });
  }
}
