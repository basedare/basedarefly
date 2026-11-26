'use client';

import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download, QrCode, Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { publicDareUrl } from '@/lib/dare-share';
import { trackClientEvent } from '@/lib/analytics';

const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.055] px-3 text-xs font-bold text-white hover:bg-white/10';

function downloadSvg(svg: SVGSVGElement, name: string) {
  const output = svg.cloneNode(true) as SVGSVGElement;
  output.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(output)], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DareShareButton({ shortId, title, missionId }: { shortId: string; title: string; missionId?: string }) {
  const [notice, setNotice] = useState('');
  const qr = useRef<SVGSVGElement>(null);
  const sticker = useRef<SVGSVGElement>(null);
  const url = publicDareUrl(shortId);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setNotice('Dare link copied.'); }
    catch { setNotice('Select and copy the link below.'); }
  };
  const share = async () => {
    if (!navigator.share) { await copy(); return; }
    try { await navigator.share({ title: `BaseDare · ${title}`, text: 'Find this dare on BaseDare.', url }); }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) await copy(); }
  };

  return <Dialog onOpenChange={open => { if (open) { setNotice(''); if (missionId) trackClientEvent('creator_mission_share_started', { mission_id: missionId }); } }}>
    <DialogTrigger asChild><button type="button" className={actionClass}><QrCode className="h-4 w-4" aria-hidden="true" /> Share dare</button></DialogTrigger>
    <DialogContent className="max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-2xl border-purple-300/25 bg-[#100d1b] text-white">
      <DialogHeader><DialogTitle>Share this dare</DialogTitle><DialogDescription className="text-white/60">Scan to open the exact dare. The page shows its current availability and reward; scanning is not proof of completion.</DialogDescription></DialogHeader>
      <div className="mx-auto rounded-xl bg-white p-1"><QRCodeSVG ref={qr} value={url} size={224} level="H" marginSize={4} bgColor="#fff" fgColor="#000" /></div>
      <input aria-label="Public dare link" readOnly value={url} onFocus={event => event.currentTarget.select()} className="min-h-11 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-xs text-white/80" />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={actionClass} onClick={() => void copy()}><Copy className="h-4 w-4" /> Copy link</button>
        <button type="button" className={actionClass} onClick={() => void share()}><Share2 className="h-4 w-4" /> Share</button>
        <button type="button" className={actionClass} onClick={() => qr.current && downloadSvg(qr.current, `basedare-${shortId}-qr.svg`)}><Download className="h-4 w-4" /> QR code</button>
        <button type="button" className={actionClass} onClick={() => sticker.current && downloadSvg(sticker.current, `basedare-${shortId}-sticker.svg`)}><Download className="h-4 w-4" /> Print sticker</button>
      </div>
      <p aria-live="polite" className="text-xs text-white/70">{notice}</p>
      <svg ref={sticker} xmlns="http://www.w3.org/2000/svg" width="100mm" height="140mm" viewBox="0 0 600 840" className="sr-only" aria-hidden="true" fontFamily="Arial, sans-serif">
        <rect width="600" height="840" fill="#100d1b" /><rect x="20" y="20" width="560" height="800" rx="26" fill="none" stroke="#a855f7" strokeWidth="6" />
        <text x="300" y="96" textAnchor="middle" fill="#f5c518" fontSize="48" fontWeight="900" fontStyle="italic">BASEDARE</text>
        <text x="300" y="156" textAnchor="middle" fill="#fff" fontSize="36" fontWeight="900">DO THE DARE.</text>
        <text x="300" y="199" textAnchor="middle" fill="#fff" fontSize="36" fontWeight="900">FILM IT. GET PAID.</text>
        <QRCodeSVG x="120" y="235" value={url} size={360} level="H" marginSize={4} bgColor="#fff" fgColor="#000" />
        <text x="300" y="650" textAnchor="middle" fill="#fff" fontSize="23" fontWeight="700">{title.slice(0, 40)}{title.length > 40 ? '…' : ''}</text>
        <text x="300" y="696" textAnchor="middle" fill="#f5c518" fontSize="24" fontWeight="900">SCAN FOR THE DARE</text>
        <text x="300" y="744" textAnchor="middle" fill="#fff" fontSize="20">www.basedare.xyz</text>
        <text x="300" y="777" textAnchor="middle" fill="#c1b9d3" fontSize="15">Check the live reward and status online.</text>
      </svg>
    </DialogContent>
  </Dialog>;
}
