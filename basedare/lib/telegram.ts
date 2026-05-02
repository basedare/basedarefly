/**
 * Telegram Bot Integration for BaseDare Admin Alerts
 *
 * Sends notifications to admin chat for key events:
 * - New dare created
 * - Big pledges (>$100)
 * - Verification complete
 * - Payouts processed
 * - Expiring dares
 */

import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';
import { sendDareCreatedAlert, sendDareReviewAlert, sendTagClaimSubmissionAlert } from '@/lib/telegram-bot';
import type { ActivationBrandMemoryInput, ActivationStoryBrief } from '@/lib/activation-brand-memory';
import type { LocalSignalItem } from '@/lib/local-signals';
import { normalizeSignalRoomChatId } from '@/lib/signal-room';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const TELEGRAM_SIGNAL_CHAT_ID = normalizeSignalRoomChatId(
  process.env.TELEGRAM_SIGNAL_CHAT_ID || process.env.TELEGRAM_PUBLIC_CHAT_ID
);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://basedare.xyz';
const EXPLORER_URL = process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
  ? 'https://basescan.org'
  : 'https://sepolia.basescan.org';

interface TelegramResponse {
  ok: boolean;
  description?: string;
}

const TELEGRAM_REQUEST_TIMEOUT_MS = 30_000;
const TELEGRAM_HTTPS_AGENT = new HttpsAgent({
  keepAlive: true,
});

/**
 * Send a message to a specific Telegram chat.
 */
async function sendMessageToChat(
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.warn('[TELEGRAM] Bot token or chat ID not configured');
    return false;
  }

  try {
    const payload = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    });

    const result: TelegramResponse = await new Promise((resolve, reject) => {
      const req = httpsRequest(
        {
          protocol: 'https:',
          hostname: 'api.telegram.org',
          path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          method: 'POST',
          family: 4,
          timeout: TELEGRAM_REQUEST_TIMEOUT_MS,
          agent: TELEGRAM_HTTPS_AGENT,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let raw = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            raw += chunk;
          });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(raw) as TelegramResponse;
              resolve(parsed);
            } catch (parseError) {
              reject(parseError);
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy(new Error(`Telegram request timeout after ${TELEGRAM_REQUEST_TIMEOUT_MS}ms`));
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    if (!result.ok) {
      console.error('[TELEGRAM] Failed to send message:', result.description);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[TELEGRAM] Error sending message:', error);
    return false;
  }
}

/**
 * Send a message to the admin Telegram chat.
 */
async function sendMessage(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
  if (!TELEGRAM_CHAT_ID) {
    console.warn('[TELEGRAM] Admin chat ID not configured');
    return false;
  }

  return sendMessageToChat(TELEGRAM_CHAT_ID, text, parseMode);
}

/**
 * Format USDC amount for display
 */
function formatUSDC(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USDC`;
}

function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function appUrl(path: string): string {
  const base = BASE_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function htmlLink(url: string, label: string): string {
  return `<a href="${escapeHtmlAttribute(url)}">${escapeHtml(label)}</a>`;
}

function compactText(value: string | null | undefined, maxLength = 180): string {
  const clean = (value || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3)}...`;
}

function formatVenuePipelineEvent(eventType: string): string {
  const labels: Record<string, string> = {
    EMAIL_BRIEF: 'Sponsor brief shared',
    CONTACTED: 'Contact handoff received',
    CLAIM_STARTED: 'Venue claim started',
    ACTIVATION_LAUNCHED: 'Activation launched',
    REPEAT_LAUNCHED: 'Repeat activation launched',
  };
  return labels[eventType] || eventType.replace(/_/g, ' ').toLowerCase();
}

function formatVenueAudience(audience: string): string {
  return audience === 'sponsor' ? 'Sponsor / buyer' : 'Venue owner';
}

function formatVenueIntent(intent: string | null | undefined): string | null {
  if (!intent) return null;
  const labels: Record<string, string> = {
    claim: 'claim venue',
    activation: 'launch activation',
    repeat: 'repeat activation',
  };
  return labels[intent] || intent;
}

function formatOwnerWallet(ownerWallet: string | null | undefined): string {
  if (!ownerWallet) return 'unassigned';
  return `${ownerWallet.slice(0, 6)}...${ownerWallet.slice(-4)}`;
}

function formatRelativeAge(date: Date): string {
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.max(1, Math.round(diffHours / 24));
  return `${diffDays}d ago`;
}

// =============================================================================
// ALERT FUNCTIONS
// =============================================================================

/**
 * Alert: New dare created
 */
export async function alertNewDare(data: {
  dareId: string;
  shortId: string;
  title: string;
  amount: number;
  streamerTag: string | null;
  isOpenBounty: boolean;
  stakerAddress?: string | null;
}): Promise<void> {
  await sendDareCreatedAlert(data);
}

/**
 * Public Signal Room alert: only send information already safe for public discovery.
 */
export async function alertSignalRoomDare(data: {
  shortId: string;
  title: string;
  amount: number;
  streamerTag: string | null;
  isOpenBounty: boolean;
  missionMode?: string | null;
  locationLabel?: string | null;
}): Promise<boolean> {
  if (!TELEGRAM_SIGNAL_CHAT_ID) {
    return false;
  }

  const target = data.isOpenBounty ? 'open to anyone' : data.streamerTag || 'targeted creator';
  const locationLine = data.locationLabel ? `\n📍 ${escapeHtml(compactText(data.locationLabel, 80))}` : '';
  const modeLine = data.missionMode ? `\n🎛 ${escapeHtml(data.missionMode)}` : '';
  const message = [
    '⚡ <b>LIVE BASEDARE SIGNAL</b>',
    '',
    `<b>${escapeHtml(compactText(data.title, 140))}</b>`,
    `💰 ${formatUSDC(data.amount)}`,
    `🎯 ${escapeHtml(target)}`,
    `${modeLine}${locationLine}`,
    '',
    htmlLink(appUrl(`/dare/${encodeURIComponent(data.shortId)}`), 'Open the dare'),
  ].join('\n');

  return sendMessageToChat(TELEGRAM_SIGNAL_CHAT_ID, message);
}

export async function alertLocalSignalSubmission(data: {
  signalId: string;
  title: string;
  category: string;
  venueName?: string | null;
  city?: string | null;
  startsAt?: string | null;
  notes?: string | null;
  submittedBy?: string | null;
}): Promise<boolean> {
  const startsAt = data.startsAt ? new Date(data.startsAt) : null;
  const startsLabel =
    startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt.toLocaleString('en-AU', { timeZone: 'Asia/Manila' }) : '';
  const context = [
    `Category: ${escapeHtml(data.category)}`,
    data.venueName ? `Place: ${escapeHtml(data.venueName)}` : null,
    data.city ? `City: ${escapeHtml(data.city)}` : null,
    startsLabel ? `When: ${escapeHtml(startsLabel)} PHT` : null,
    data.submittedBy ? `From: ${escapeHtml(compactText(data.submittedBy, 80))}` : null,
  ].filter(Boolean);

  const message = `
📍 <b>LOCAL SIGNAL SUBMITTED</b>

<b>${escapeHtml(compactText(data.title, 140))}</b>
${context.join('\n')}
${data.notes ? `\nNote: ${escapeHtml(compactText(data.notes, 260))}` : ''}
Signal: <code>${escapeHtml(data.signalId)}</code>

${htmlLink(appUrl(`/admin/local-signals?signalId=${encodeURIComponent(data.signalId)}`), 'Review local signal')} · ${htmlLink(appUrl('/map'), 'Open map')}
`.trim();

  return sendMessage(message);
}

export async function alertSignalRoomLocalSignal(signal: LocalSignalItem): Promise<boolean> {
  if (!TELEGRAM_SIGNAL_CHAT_ID) {
    return false;
  }

  const startsAt = signal.startsAt ? new Date(signal.startsAt) : null;
  const startsLabel =
    startsAt && !Number.isNaN(startsAt.getTime())
      ? startsAt.toLocaleString('en-AU', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'Asia/Manila',
        })
      : 'Now / check locally';
  const placeLine = [signal.venueName, signal.city].filter(Boolean).join(' · ');

  const message = [
    '📡 <b>LOCAL SIGNAL</b>',
    '',
    `<b>${escapeHtml(compactText(signal.title, 140))}</b>`,
    `🕒 ${escapeHtml(startsLabel)} PHT`,
    `🏷 ${escapeHtml(signal.category)}`,
    placeLine ? `📍 ${escapeHtml(compactText(placeLine, 100))}` : null,
    signal.notes ? `\n${escapeHtml(compactText(signal.notes, 260))}` : null,
    '',
    htmlLink(appUrl('/map'), 'Open BaseDare map'),
  ]
    .filter(Boolean)
    .join('\n');

  return sendMessageToChat(TELEGRAM_SIGNAL_CHAT_ID, message);
}

/**
 * Alert: Big pledge (>$100)
 */
export async function alertBigPledge(data: {
  dareId: string;
  shortId: string;
  title: string;
  pledgeAmount: number;
  totalPot: number;
  pledgerAddress: string;
  txHash?: string | null;
}): Promise<void> {
  const pledger = `${data.pledgerAddress.slice(0, 6)}...${data.pledgerAddress.slice(-4)}`;
  const txLink = data.txHash
    ? `\n🔍 <a href="${EXPLORER_URL}/tx/${data.txHash}">View TX</a>`
    : '';

  const message = `
🐋 <b>BIG PLEDGE ALERT</b>

<b>${data.title}</b>
💵 Pledge: ${formatUSDC(data.pledgeAmount)}
🏦 Total Pot: ${formatUSDC(data.totalPot)}
👛 From: <code>${pledger}</code>
${txLink}
🔗 <a href="${BASE_URL}/dare/${data.shortId}">View Dare</a>
`.trim();

  await sendMessage(message);
}

/**
 * Alert: Verification complete
 */
export async function alertVerification(data: {
  dareId: string;
  shortId: string;
  title: string;
  streamerTag: string | null;
  result: 'VERIFIED' | 'FAILED' | 'PENDING_REVIEW';
  bounty?: number;
  proofUrl?: string | null;
  confidence?: number;
  payout?: number;
  txHash?: string | null;
}): Promise<void> {
  const emojiMap = { VERIFIED: '✅', FAILED: '❌', PENDING_REVIEW: '⏳' };
  const statusMap = { VERIFIED: 'VERIFIED', FAILED: 'FAILED', PENDING_REVIEW: 'NEEDS REVIEW' };
  const emoji = emojiMap[data.result];
  const status = statusMap[data.result];
  const target = data.streamerTag || 'Open Dare';

  const payoutLine = data.result === 'VERIFIED' && data.payout
    ? `\n💸 Payout: ${formatUSDC(data.payout)}`
    : '';

  const confidenceLine = data.confidence
    ? `\n🤖 AI Confidence: ${data.confidence}%`
    : '';

  const txLink = data.txHash
    ? `\n🔍 <a href="${EXPLORER_URL}/tx/${data.txHash}">View TX</a>`
    : '';

  const reviewNote = data.result === 'PENDING_REVIEW'
    ? '\n\n⚠️ High-value bounty - manual review required'
    : '';

  if (data.result === 'PENDING_REVIEW') {
    await alertDareNeedsReview({
      dareId: data.dareId,
      shortId: data.shortId,
      title: data.title,
      streamerTag: data.streamerTag,
      bounty: data.bounty,
      proofUrl: data.proofUrl,
      confidence: data.confidence,
      reviewReason: 'High-value bounty requires manual verification.',
    });
    return;
  }

  const message = `
${emoji} <b>DARE ${status}</b>

<b>${data.title}</b>
👤 ${target}${confidenceLine}${payoutLine}${txLink}${reviewNote}

🔗 <a href="${BASE_URL}/dare/${data.shortId}">View Dare</a>
`.trim();

  await sendMessage(message);
}

/**
 * Alert: Dare needs admin review
 */
export async function alertDareNeedsReview(data: {
  dareId: string;
  shortId: string;
  title: string;
  streamerTag: string | null;
  bounty?: number;
  proofUrl?: string | null;
  confidence?: number;
  reviewReason?: string;
}): Promise<void> {
  await sendDareReviewAlert({
    dareId: data.dareId,
    shortId: data.shortId,
    title: data.title,
    streamerTag: data.streamerTag,
    bounty: data.bounty,
    proofUrl: data.proofUrl,
    confidence: data.confidence,
    reviewReason: data.reviewReason,
  });
}

export async function alertSentinelReviewRequired(data: {
  dareId: string;
  shortId: string;
  title: string;
  qrCheckLabel: string;
}): Promise<void> {
  const message = `
🔍 <b>SENTINEL REVIEW REQUIRED</b>

<b>${data.title}</b>
ID: <code>${data.dareId}</code>
QR Check: ${data.qrCheckLabel}

🔗 <a href="${BASE_URL}/dare/${data.shortId || data.dareId}">Review link</a>
`.trim();

  await sendMessage(message);
}

export async function alertSentinelQueueThreshold(data: {
  pendingCount: number;
  threshold: number;
}): Promise<boolean> {
  const message = `
⚠️ <b>SENTINEL QUEUE ALERT</b>

${data.pendingCount} pending reviews (threshold: ${data.threshold})

Use <code>/sentinelpending</code> to review the queue.
`.trim();

  return sendMessage(message);
}

export async function alertSentinelHardPauseToggled(data: {
  enabled: boolean;
  reason?: string | null;
  pendingCount: number;
  threshold: number;
}): Promise<boolean> {
  const message = data.enabled
    ? `
✅ <b>SENTINEL RESUMED</b>

New Sentinel opt-ins are live again.
Pending queue: ${data.pendingCount}
Alert threshold: ${data.threshold}
`.trim()
    : `
⛔ <b>SENTINEL PAUSED</b>

Reason: ${data.reason || 'No reason provided'}
Pending queue: ${data.pendingCount}
Alert threshold: ${data.threshold}
`.trim();

  return sendMessage(message);
}

export async function alertVenueLeadFollowUpQueue(data: {
  urgentCount: number;
  threshold: number;
  unownedCount: number;
  assignedOverdueCount: number;
  ownerBuckets: Array<{
    ownerWallet: string;
    count: number;
  }>;
  leads: Array<{
    venueName: string;
    email: string;
    audience: string;
    intent: string | null;
    ownerWallet: string | null;
    reasons: string[];
  }>;
}): Promise<boolean> {
  const preview = data.leads
    .slice(0, 4)
    .map((lead) => {
      const reasons = lead.reasons.map((reason) => escapeHtml(reason)).join(', ') || 'stale';
      const owner = lead.ownerWallet ? `assigned ${formatOwnerWallet(lead.ownerWallet)}` : 'unassigned';
      const intent = lead.intent ? ` · ${escapeHtml(lead.intent)}` : '';
      return `• <b>${escapeHtml(lead.venueName)}</b> · ${escapeHtml(lead.audience)}${intent}\n  ${escapeHtml(lead.email)} · ${escapeHtml(owner)}\n  ${reasons}`;
    })
    .join('\n');

  const ownerBreakdown = data.ownerBuckets.length
    ? `\nAssigned overdue:\n${data.ownerBuckets
        .slice(0, 3)
        .map((bucket) => `• <code>${bucket.ownerWallet.slice(0, 6)}...${bucket.ownerWallet.slice(-4)}</code>: ${bucket.count}`)
        .join('\n')}`
    : '';

  const message = `
📬 <b>VENUE LEAD FOLLOW-UP ALERT</b>

${data.urgentCount} urgent venue report leads need attention (threshold: ${data.threshold})
Unowned: ${data.unownedCount} · Assigned overdue: ${data.assignedOverdueCount}${ownerBreakdown}

${preview}

Open the admin lead inbox to assign owners and set follow-ups.
`.trim();

  return sendMessage(message);
}

export async function alertInboxSupportMessage(data: {
  threadId: string;
  senderWallet: string;
  subject?: string | null;
  body: string;
  redacted?: boolean;
}): Promise<boolean> {
  const sender = formatOwnerWallet(data.senderWallet);
  const body = compactText(data.body, 260);
  const redactedLine = data.redacted ? '\nContact guard: redacted blocked contact details.' : '';

  const message = `
📥 <b>BASEDARE SUPPORT INBOX</b>

From: <code>${escapeHtml(sender)}</code>
Thread: <b>${escapeHtml(data.subject || 'BaseDare Support')}</b>
${body ? `\n${escapeHtml(body)}` : ''}${redactedLine}

${htmlLink(appUrl(`/admin/inbox?threadId=${encodeURIComponent(data.threadId)}`), 'Open admin inbox')} · ${htmlLink(appUrl(`/chat?threadId=${encodeURIComponent(data.threadId)}`), 'Open user thread')}
`.trim();

  return sendMessage(message);
}

export async function alertVenueReportHighIntentEvent(data: {
  venueName: string;
  venueSlug: string;
  city?: string | null;
  country?: string | null;
  audience: string;
  eventType: string;
  channel?: string | null;
  intent?: string | null;
  email?: string | null;
  name?: string | null;
  organization?: string | null;
  notes?: string | null;
  leadId?: string | null;
}): Promise<boolean> {
  const location = [data.city, data.country].filter(Boolean).join(', ');
  const intent = formatVenueIntent(data.intent);
  const reportUrl = appUrl(
    `/venues/${encodeURIComponent(data.venueSlug)}/report?audience=${encodeURIComponent(data.audience)}`
  );
  const launchParams = new URLSearchParams({
    venue: data.venueSlug,
    source: 'telegram',
  });
  if (data.intent) launchParams.set('intent', data.intent);
  if (data.audience) launchParams.set('audience', data.audience);

  const contactLines = [
    data.email ? `Email: ${escapeHtml(data.email)}` : null,
    data.name ? `Name: ${escapeHtml(data.name)}` : null,
    data.organization ? `Org: ${escapeHtml(data.organization)}` : null,
  ].filter(Boolean);
  const notes = compactText(data.notes, 220);

  const message = `
🎯 <b>VENUE PIPELINE SIGNAL</b>

<b>${escapeHtml(formatVenuePipelineEvent(data.eventType))}</b>
🏟️ <b>${escapeHtml(data.venueName)}</b>${location ? ` · ${escapeHtml(location)}` : ''}
Audience: ${escapeHtml(formatVenueAudience(data.audience))}${intent ? ` · Intent: ${escapeHtml(intent)}` : ''}
${data.channel ? `Source: ${escapeHtml(data.channel)}` : ''}
${contactLines.length ? `\n${contactLines.join('\n')}` : ''}
${notes ? `\nNote: ${escapeHtml(notes)}` : ''}
${data.leadId ? `Lead: <code>${escapeHtml(data.leadId)}</code>` : ''}

${htmlLink(reportUrl, 'Open report')} · ${htmlLink(appUrl(`/brands/portal?${launchParams.toString()}`), 'Launch activation')} · ${htmlLink(appUrl('/admin'), 'Lead inbox')}
`.trim();

  return sendMessage(message);
}

export async function alertVenueLeadActivationDigest(data: {
  lookbackHours: number;
  urgentCount: number;
  unownedCount: number;
  assignedOverdueCount: number;
  recentLeadCount: number;
  recentConversionCount: number;
  topLeads: Array<{
    venueName: string;
    venueSlug: string;
    email: string;
    audience: string;
    intent: string | null;
    followUpStatus: string | null;
    ownerWallet: string | null;
    contactedAt: Date;
    reasons?: string[];
  }>;
  recentEvents: Array<{
    venueName: string;
    venueSlug: string;
    eventType: string;
    audience: string;
    channel: string | null;
    createdAt: Date;
  }>;
}): Promise<boolean> {
  const leadPreview = data.topLeads
    .slice(0, 5)
    .map((lead) => {
      const intent = formatVenueIntent(lead.intent) || 'general';
      const reasons = lead.reasons?.length ? ` · ${lead.reasons.map((reason) => escapeHtml(reason)).join(', ')}` : '';
      return `• <b>${escapeHtml(lead.venueName)}</b> · ${escapeHtml(intent)} · ${escapeHtml(formatRelativeAge(lead.contactedAt))}\n  ${escapeHtml(lead.email)} · ${escapeHtml(formatOwnerWallet(lead.ownerWallet))} · ${escapeHtml(lead.followUpStatus || 'NEW')}${reasons}`;
    })
    .join('\n');

  const eventPreview = data.recentEvents
    .slice(0, 5)
    .map((event) => {
      const source = event.channel ? ` · ${event.channel}` : '';
      return `• <b>${escapeHtml(event.venueName)}</b> · ${escapeHtml(formatVenuePipelineEvent(event.eventType))} · ${escapeHtml(formatRelativeAge(event.createdAt))}${escapeHtml(source)}`;
    })
    .join('\n');

  const message = `
📈 <b>VENUE ACTIVATION DIGEST</b>

Last ${data.lookbackHours}h: ${data.recentLeadCount} leads · ${data.recentConversionCount} conversion events
Urgent now: ${data.urgentCount} · Unowned: ${data.unownedCount} · Assigned overdue: ${data.assignedOverdueCount}

${leadPreview ? `<b>Top leads</b>\n${leadPreview}\n` : ''}
${eventPreview ? `<b>Conversion signals</b>\n${eventPreview}\n` : ''}
${htmlLink(appUrl('/admin'), 'Open lead inbox')} · ${htmlLink(appUrl('/brands/portal'), 'Open brand portal')}
`.trim();

  return sendMessage(message);
}

export async function alertActivationIntake(data: {
  leadId: string;
  company: string;
  contactName: string;
  email: string;
  buyerType: string;
  city: string;
  venue?: string | null;
  budgetRange: string;
  timeline: string;
  goal: string;
  packageId?: string | null;
  website?: string | null;
  notes?: string | null;
  routedCreator?: string | null;
  routedVenueSlug?: string | null;
  routedSource?: string | null;
  brandMemory?: ActivationBrandMemoryInput | null;
  activationBrief?: ActivationStoryBrief | null;
}): Promise<boolean> {
  const budgetLabels: Record<string, string> = {
    '500_1500': '$500-$1.5k',
    '1500_5000': '$1.5k-$5k',
    '5000_15000': '$5k-$15k',
    '15000_plus': '$15k+',
  };
  const timelineLabels: Record<string, string> = {
    this_week: 'this week',
    this_month: 'this month',
    next_90_days: 'next 90 days',
    exploring: 'exploring',
  };
  const goalLabels: Record<string, string> = {
    foot_traffic: 'foot traffic',
    ugc: 'verified content',
    launch: 'launch push',
    event: 'event activation',
    repeat_visits: 'repeat visits',
    other: 'other',
  };

  const details = [
    `Contact: ${escapeHtml(data.contactName)} &lt;${escapeHtml(data.email)}&gt;`,
    `Type: ${escapeHtml(data.buyerType)} · Budget: ${escapeHtml(budgetLabels[data.budgetRange] || data.budgetRange)}`,
    `City: ${escapeHtml(data.city)}${data.venue ? ` · Venue: ${escapeHtml(data.venue)}` : ''}`,
    `Timeline: ${escapeHtml(timelineLabels[data.timeline] || data.timeline)} · Goal: ${escapeHtml(goalLabels[data.goal] || data.goal)}`,
    data.packageId ? `Package: ${escapeHtml(data.packageId)}` : null,
    data.website ? `Website: ${escapeHtml(data.website)}` : null,
    data.routedSource ? `Source: ${escapeHtml(data.routedSource)}` : null,
    data.routedCreator ? `Creator route: ${escapeHtml(data.routedCreator)}` : null,
  ].filter(Boolean);
  const notes = compactText(data.notes, 260);
  const brandMemory = data.brandMemory;
  const memoryPreview = [
    brandMemory?.originStory ? `Story: ${compactText(brandMemory.originStory, 120)}` : null,
    brandMemory?.audience ? `Audience: ${compactText(brandMemory.audience, 80)}` : null,
    brandMemory?.vibe ? `Vibe: ${compactText(brandMemory.vibe, 80)}` : null,
    brandMemory?.rituals ? `Rituals: ${compactText(brandMemory.rituals, 90)}` : null,
    brandMemory?.avoid ? `Avoid: ${compactText(brandMemory.avoid, 80)}` : null,
  ].filter(Boolean);
  const activationBrief = data.activationBrief;
  const missionPreview = activationBrief?.missionIdeas
    ?.slice(0, 3)
    .map((mission) => `• ${escapeHtml(mission.title)} - ${escapeHtml(compactText(mission.detail, 100))}`)
    .join('\n');

  const message = `
💸 <b>PAID ACTIVATION INTAKE</b>

<b>${escapeHtml(data.company)}</b>
${details.join('\n')}
${notes ? `\nNote: ${escapeHtml(notes)}` : ''}
${memoryPreview.length ? `\n<b>Brand Memory</b>\n${memoryPreview.map((item) => escapeHtml(String(item))).join('\n')}` : ''}
${activationBrief ? `\n<b>Activation Brief</b>\n${escapeHtml(compactText(activationBrief.positioningLine, 160))}` : ''}
${missionPreview ? `\n${missionPreview}` : ''}
Lead: <code>${escapeHtml(data.leadId)}</code>

${htmlLink(appUrl(`/admin/activation-intakes?leadId=${encodeURIComponent(data.leadId)}`), 'Open intake queue')} · ${data.routedVenueSlug ? `${htmlLink(appUrl(`/venues/${encodeURIComponent(data.routedVenueSlug)}`), 'Open venue')} · ` : ''}${htmlLink(appUrl('/admin/daily-command-loop'), 'Command loop')} · ${htmlLink(appUrl('/brands/portal'), 'Brand portal')}
`.trim();

  return sendMessage(message);
}

export async function alertActivationIntakeStatusUpdate(data: {
  leadId: string;
  company: string;
  status: string;
  assignedVenue?: string | null;
  assignedCreator?: string | null;
  operatorNote?: string | null;
  updatedBy?: string | null;
}): Promise<boolean> {
  const routeLines = [
    data.assignedVenue ? `Venue: ${escapeHtml(data.assignedVenue)}` : null,
    data.assignedCreator ? `Creator: ${escapeHtml(data.assignedCreator)}` : null,
    data.operatorNote ? `Note: ${escapeHtml(compactText(data.operatorNote, 220))}` : null,
    data.updatedBy ? `By: <code>${escapeHtml(data.updatedBy)}</code>` : null,
  ].filter(Boolean);

  const message = `
✅ <b>ACTIVATION INTAKE UPDATED</b>

<b>${escapeHtml(data.company || 'Activation lead')}</b>
Status: <b>${escapeHtml(data.status)}</b>
Lead: <code>${escapeHtml(data.leadId)}</code>
${routeLines.length ? `\n${routeLines.join('\n')}` : ''}

${htmlLink(appUrl(`/admin/activation-intakes?leadId=${encodeURIComponent(data.leadId)}`), 'Open intake queue')} · ${htmlLink(appUrl('/admin/daily-command-loop'), 'Command loop')}
`.trim();

  return sendMessage(message);
}

/**
 * Alert: Creator submitted a claim request for an open activation
 */
export async function alertClaimRequestSubmission(data: {
  dareId: string;
  shortId: string;
  title: string;
  bounty: number;
  claimTag: string;
  walletAddress: string;
}): Promise<void> {
  const wallet = `${data.walletAddress.slice(0, 6)}...${data.walletAddress.slice(-4)}`;
  const message = `
🙋 <b>CLAIM REQUEST SUBMITTED</b>

<b>${data.title}</b>
🏷️ Claimant: <code>${data.claimTag}</code>
👛 Wallet: <code>${wallet}</code>
💰 Pot: ${formatUSDC(data.bounty)}

🔗 <a href="${BASE_URL}/dare/${data.shortId}">Review Dare</a>
`.trim();

  await sendMessage(message);
}

/**
 * Alert: Payout processed
 */
export async function alertPayout(data: {
  dareId: string;
  shortId: string;
  title: string;
  streamerTag: string | null;
  creatorPayout: number;
  platformFee: number;
  referrerPayout?: number;
  txHash: string;
}): Promise<void> {
  const target = data.streamerTag || 'Open Dare Winner';
  const referrerLine = data.referrerPayout
    ? `\n🤝 Referrer: ${formatUSDC(data.referrerPayout)}`
    : '';

  const message = `
💸 <b>PAYOUT PROCESSED</b>

<b>${data.title}</b>
👤 ${target}
💰 Creator: ${formatUSDC(data.creatorPayout)}
🏛️ Platform: ${formatUSDC(data.platformFee)}${referrerLine}

🔍 <a href="${EXPLORER_URL}/tx/${data.txHash}">View TX</a>
`.trim();

  await sendMessage(message);
}

/**
 * Alert: Dare expiring soon (for daily digest)
 */
export async function alertExpiringDares(dares: Array<{
  shortId: string;
  title: string;
  amount: number;
  expiresAt: Date;
  hoursLeft: number;
}>): Promise<void> {
  if (dares.length === 0) return;

  const dareList = dares.map(d =>
    `• <b>${d.title}</b> - ${formatUSDC(d.amount)} (${d.hoursLeft}h left)\n  <a href="${BASE_URL}/dare/${d.shortId}">View</a>`
  ).join('\n\n');

  const message = `
⏰ <b>EXPIRING DARES</b>

${dares.length} dare(s) expiring in the next 24h:

${dareList}
`.trim();

  await sendMessage(message);
}

/**
 * Alert: Flagged content for review
 */
export async function alertFlaggedContent(data: {
  dareId: string;
  shortId: string;
  title: string;
  amount: number;
  reason: string;
  matches: string[];
  confidence: number;
}): Promise<void> {
  const matchList = data.matches.length > 0
    ? `\n🔍 Matches: ${data.matches.join(', ')}`
    : '';

  const message = `
⚠️ <b>FLAGGED CONTENT</b>

<b>${data.title}</b>
💰 ${formatUSDC(data.amount)}
🎯 Confidence: ${Math.round(data.confidence * 100)}%

📝 ${data.reason}${matchList}

🔗 <a href="${BASE_URL}/dare/${data.shortId}">Review Dare</a>

Use /approve or /reject to moderate
`.trim();

  await sendMessage(message);
}

/**
 * Alert: Error/Issue that needs attention
 */
export async function alertError(data: {
  type: 'VERIFICATION_FAILED' | 'PAYOUT_FAILED' | 'REFUND_FAILED' | 'CONTRACT_ERROR';
  dareId?: string;
  shortId?: string;
  error: string;
  context?: string;
}): Promise<void> {
  const dareLink = data.shortId
    ? `\n🔗 <a href="${BASE_URL}/dare/${data.shortId}">View Dare</a>`
    : '';

  const message = `
🚨 <b>ERROR: ${data.type}</b>

${data.context || 'An error occurred'}

<code>${data.error}</code>${dareLink}

⚠️ Manual intervention may be required
`.trim();

  await sendMessage(message);
}

/**
 * Alert: Daily stats summary
 */
export async function alertDailyStats(data: {
  daresCreated: number;
  totalPledged: number;
  daresVerified: number;
  daresFailed: number;
  totalPayouts: number;
  platformRevenue: number;
}): Promise<void> {
  const message = `
📊 <b>DAILY STATS</b>

🆕 Dares Created: ${data.daresCreated}
💰 Total Pledged: ${formatUSDC(data.totalPledged)}
✅ Verified: ${data.daresVerified}
❌ Failed: ${data.daresFailed}
💸 Payouts: ${formatUSDC(data.totalPayouts)}
🏛️ Platform Revenue: ${formatUSDC(data.platformRevenue)}
`.trim();

  await sendMessage(message);
}

/**
 * Alert: New manual tag-claim submission
 */
export async function alertTagClaimSubmission(data: {
  tagClaimId: string;
  tag: string;
  platform: string;
  handle: string;
  walletAddress: string;
}): Promise<void> {
  await sendTagClaimSubmissionAlert(data);
}

/**
 * Alert: Tag-claim moderation decision
 */
export async function alertTagClaimDecision(data: {
  tagClaimId: string;
  tag: string;
  approved: boolean;
  walletAddress: string;
  platform: string;
  handle: string;
}): Promise<void> {
  const wallet = `${data.walletAddress.slice(0, 6)}...${data.walletAddress.slice(-4)}`;
  const status = data.approved ? 'APPROVED ✅' : 'REJECTED ❌';
  const message = `
🛡️ <b>TAG CLAIM ${status}</b>

🏷️ Tag: <code>${data.tag}</code>
📺 Platform: <b>${data.platform}</b>
👤 Handle: <code>${data.handle}</code>
👛 Wallet: <code>${wallet}</code>
🆔 Claim ID: <code>${data.tagClaimId}</code>
`.trim();

  await sendMessage(message);
}

/**
 * Test the bot connection
 */
export async function testBotConnection(): Promise<{ success: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not set' };
  }

  const sent = await sendMessage('🤖 <b>Clawdbot Online</b>\n\nBaseDare admin alerts connected!');
  return { success: sent, error: sent ? undefined : 'Failed to send test message' };
}

export async function testSignalRoomConnection(): Promise<{ success: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN not set' };
  }
  if (!TELEGRAM_SIGNAL_CHAT_ID) {
    return { success: false, error: 'TELEGRAM_SIGNAL_CHAT_ID or TELEGRAM_PUBLIC_CHAT_ID not set' };
  }

  const sent = await sendMessageToChat(
    TELEGRAM_SIGNAL_CHAT_ID,
    [
      '📡 <b>BASEDARE SIGNAL ROOM ONLINE</b>',
      '',
      'Public Signal Room broadcast rail is connected.',
      `Open grid: ${htmlLink(appUrl('/map'), 'BaseDare Map')}`,
    ].join('\n')
  );

  return { success: sent, error: sent ? undefined : 'Failed to send Signal Room test message' };
}
