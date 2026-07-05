/**
 * The Proof Receipt — a shareable thermal-statement PNG of a verified
 * check-in. Canvas-rendered client-side (1080x1440) so the artifact itself
 * travels through native share sheets: Stories, WhatsApp, iMessage — no link
 * unfurl required. The receipt metaphor, made literal.
 */

export const PROOF_RECEIPT_W = 1080;
export const PROOF_RECEIPT_H = 1440;

const TAU = Math.PI * 2;

const PAPER = '#f2ece0';
const INK = '#1d1c26';
const GOLD = '#8a5a00';
const GOLD_BRIGHT = '#b47a10';
const FAINT = '#8f8b79';

export type ProofReceiptData = {
  venueName: string;
  venueHandle?: string | null;
  creatorTag?: string | null;
  submittedAt: string;
  firstMark: boolean;
  streakDays?: number | null;
  crossedCount?: number | null;
  /** Global serial — receipt #42 is #42 forever. Low numbers = founding cohort. */
  receiptNumber?: number | null;
  /** Pre-loaded PeeBear stamp image (skip the stamp when null). */
  bearImage?: HTMLImageElement | null;
};

function receiptRow(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  y: number,
  padX: number,
  valueColor = INK
) {
  ctx.font = '26px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText(label, padX, y);
  const labelWidth = ctx.measureText(label).width;
  const valueWidth = ctx.measureText(value).width;
  ctx.setLineDash([2, 7]);
  ctx.strokeStyle = FAINT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX + labelWidth + 16, y - 8);
  ctx.lineTo(PROOF_RECEIPT_W - padX - valueWidth - 16, y - 8);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = 'right';
  ctx.fillStyle = valueColor;
  ctx.fillText(value, PROOF_RECEIPT_W - padX, y);
}

export function drawProofReceipt(ctx: CanvasRenderingContext2D, data: ProofReceiptData) {
  const W = PROOF_RECEIPT_W;
  const H = PROOF_RECEIPT_H;
  const padX = 92;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // faint ruled paper lines
  ctx.strokeStyle = 'rgba(138,90,0,0.05)';
  ctx.lineWidth = 1;
  for (let y = 260; y < H - 150; y += 52) {
    ctx.beginPath();
    ctx.moveTo(padX, y + 8);
    ctx.lineTo(W - padX, y + 8);
    ctx.stroke();
  }

  // perforated edges
  ctx.fillStyle = '#0b0b16';
  for (let x = 26; x <= W - 20; x += 36) {
    ctx.beginPath();
    ctx.arc(x, 4, 9, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, H - 4, 9, 0, TAU);
    ctx.fill();
  }

  // letterhead
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = '900 56px Impact, "Arial Black", sans-serif';
  ctx.fillText('{ BASEDARE } PROOF CO.', W / 2, 114);
  ctx.fillStyle = INK;
  ctx.font = '22px "Courier New", monospace';
  ctx.fillText('PROOF OF PRESENCE · OFFICIAL RECEIPT', W / 2, 152);
  ctx.fillStyle = FAINT;
  ctx.font = '17px "Courier New", monospace';
  const submitted = new Date(data.submittedAt);
  const dateLabel = submitted
    .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    .toUpperCase();
  const timeLabel = submitted.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toUpperCase();
  const serialLabel =
    typeof data.receiptNumber === 'number' && data.receiptNumber > 0
      ? `RECEIPT #${String(data.receiptNumber).padStart(4, '0')} · `
      : '';
  ctx.fillText(`${serialLabel}ISSUED ${dateLabel} · ${timeLabel}`, W / 2, 188);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, 218);
  ctx.lineTo(W - padX, 218);
  ctx.stroke();

  // itemised section
  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD;
  ctx.font = '900 27px Impact, "Arial Black", sans-serif';
  ctx.fillText('ITEMISED PROOF', padX, 262);

  let y = 312;
  const venue = data.venueName.length > 24 ? `${data.venueName.slice(0, 22).trim()}…` : data.venueName;
  receiptRow(ctx, 'VENUE', venue.toUpperCase(), y, padX);
  y += 52;
  if (data.venueHandle) {
    receiptRow(ctx, 'HANDLE', `@${data.venueHandle.replace(/^@/, '').toUpperCase()}`, y, padX);
    y += 52;
  }
  const patron = data.creatorTag ? `@${data.creatorTag.replace(/^@/, '').toUpperCase()}` : 'ANONYMOUS BEAR';
  receiptRow(ctx, 'PATRON', patron, y, padX);
  y += 52;
  receiptRow(ctx, 'GPS CHECK', 'VERIFIED ✓', y, padX, GOLD);
  y += 52;
  receiptRow(ctx, 'VENUE QR', 'VERIFIED ✓', y, padX, GOLD);
  y += 52;
  if (data.firstMark) {
    receiptRow(ctx, 'FIRST PROOF', 'YES — SPOT CLAIMED', y, padX, GOLD_BRIGHT);
    y += 52;
  }
  if (typeof data.streakDays === 'number' && data.streakDays >= 2) {
    receiptRow(ctx, 'STREAK', `${data.streakDays}-DAY RUN`, y, padX);
    y += 52;
  }
  if (typeof data.crossedCount === 'number' && data.crossedCount > 0) {
    receiptRow(ctx, 'CROSSED PATHS', `${data.crossedCount} VERIFIED`, y, padX);
    y += 52;
  }
  receiptRow(ctx, 'MIDDLEMEN', 'NONE', y, padX);
  y += 44;

  // double rule
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(W - padX, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(padX, y + 6);
  ctx.lineTo(W - padX, y + 6);
  ctx.stroke();

  // total
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = '24px "Courier New", monospace';
  ctx.fillText('TOTAL HUMANS VERIFIED', W / 2, y + 70);
  ctx.fillStyle = INK;
  ctx.font = '900 170px Impact, "Arial Black", sans-serif';
  ctx.fillText('1', W / 2, y + 226);

  // stamp: rotated #HUMANONLY + PeeBear
  ctx.save();
  ctx.translate(W / 2, y + 316);
  ctx.rotate(-0.08);
  ctx.strokeStyle = GOLD_BRIGHT;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-240, -40, 480, 80, 10);
  ctx.stroke();
  ctx.fillStyle = GOLD_BRIGHT;
  ctx.font = '900 42px Impact, "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('#HUMANONLY', 0, 15);
  ctx.restore();

  if (data.bearImage) {
    try {
      ctx.drawImage(data.bearImage, W - padX - 128, y + 250, 128, 128);
    } catch {
      // Stamp is decoration — a failed image never blocks the receipt.
    }
  }

  // barcode (deterministic from the check-in time)
  let bx = padX;
  const by = 1192;
  ctx.fillStyle = INK;
  let seed = (submitted.getTime() % 100000) + data.venueName.length * 7 + 3;
  while (bx < W - padX) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const barWidth = 1 + ((seed >> 8) % 5);
    if ((seed >> 4) & 1) ctx.fillRect(bx, by, barWidth, 86);
    bx += barWidth + 2;
  }

  // footer
  ctx.textAlign = 'center';
  ctx.fillStyle = FAINT;
  ctx.font = '19px "Courier New", monospace';
  ctx.fillText('THIS RECEIPT CANNOT BE FAKED. NOT EVEN BY AI.', W / 2, 1318);
  ctx.fillStyle = GOLD;
  ctx.font = '22px "Courier New", monospace';
  ctx.fillText('basedare.xyz · proof of presence', W / 2, 1354);
}
