import 'server-only';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

type MissionPassEmailInput = {
  to: string;
  title: string;
  continueUrl: string;
  expiresAt: Date;
  idempotencyKey: string;
};

export async function sendMissionPassEmail(input: MissionPassEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MISSION_PASS_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error('Mission Pass email delivery is not configured.');
  }

  const safeTitle = escapeHtml(input.title);
  const safeUrl = escapeHtml(input.continueUrl);
  const expiry = input.expiresAt.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Your BaseDare Mission Pass — ${input.title}`,
      text: [
        `You saved: ${input.title}`,
        '',
        'Open your private Mission Pass in Safari or Chrome:',
        input.continueUrl,
        '',
        `This pass expires ${expiry}. It can restore the mission, but it cannot claim rewards or authorize payments.`,
      ].join('\n'),
      html: `
        <div style="background:#07070b;color:#f7f4ea;font-family:Arial,sans-serif;padding:32px;line-height:1.55">
          <div style="max-width:560px;margin:0 auto;border:1px solid rgba(255,220,80,.28);border-radius:20px;overflow:hidden;background:#0d0d14">
            <div style="padding:28px 28px 14px;color:#f5c518;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase">BaseDare Mission Pass</div>
            <div style="padding:0 28px 28px">
              <h1 style="font-size:26px;line-height:1.15;margin:8px 0 12px;color:#fff">${safeTitle}</h1>
              <p style="color:#b8b5c3;margin:0 0 22px">Your place is saved. Open this pass in Safari or Chrome when you are ready to continue.</p>
              <a href="${safeUrl}" style="display:inline-block;background:#f5c518;color:#15120c;text-decoration:none;font-weight:900;border-radius:12px;padding:14px 20px">Open mission</a>
              <p style="color:#777383;font-size:12px;margin:22px 0 0">Private link · expires ${expiry} · restores intent only · never authorizes a claim or payment</p>
            </div>
          </div>
        </div>`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Mission Pass email failed (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ''}`);
  }
}
