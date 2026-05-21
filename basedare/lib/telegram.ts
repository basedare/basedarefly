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
import {
  CREATOR_CAPTAIN_AUDIENCE_LABELS,
  CREATOR_CAPTAIN_AVAILABILITY_LABELS,
  CREATOR_CAPTAIN_CATEGORY_LABELS,
  CREATOR_CAPTAIN_HELP_MODE_LABELS,
  CREATOR_CAPTAIN_PLATFORM_LABELS,
  CREATOR_CAPTAIN_PAYOUT_LABELS,
} from '@/lib/creator-captains';
import {
  SCOUT_CREATOR_LEAD_STATUS_LABELS,
  SCOUT_CREATOR_PLATFORM_LABELS,
  SCOUT_RELATIONSHIP_STRENGTH_LABELS,
} from '@/lib/scout-creator-leads';
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
  isCommunitySpark?: boolean;
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
  isCommunitySpark?: boolean;
}): Promise<boolean> {
  if (!TELEGRAM_SIGNAL_CHAT_ID) {
    return false;
  }

  const target = data.isOpenBounty ? 'open to anyone' : data.streamerTag || 'targeted creator';
  const rewardLine = data.isCommunitySpark
    ? '🤝 Community Spark · free proof mission'
    : `💰 ${formatUSDC(data.amount)}`;
  const locationLine = data.locationLabel ? `\n📍 ${escapeHtml(compactText(data.locationLabel, 80))}` : '';
  const modeLine = data.missionMode ? `\n🎛 ${escapeHtml(data.missionMode)}` : '';
  const message = [
    data.isCommunitySpark ? '🌊 <b>COMMUNITY SPARK LIVE</b>' : '⚡ <b>LIVE BASEDARE SIGNAL</b>',
    '',
    `<b>${escapeHtml(compactText(data.title, 140))}</b>`,
    rewardLine,
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

export async function alertPlaceTagSubmission(data: {
  tagId: string;
  venueSlug: string;
  venueName: string;
  city?: string | null;
  country?: string | null;
  creatorTag?: string | null;
  walletAddress: string;
  caption?: string | null;
  vibeTags?: string[];
  proofMediaUrl?: string | null;
  firstMark?: boolean;
  geoDistanceMeters?: number | null;
}): Promise<boolean> {
  const shortTagId = data.tagId.slice(0, 8);
  const creator = data.creatorTag || formatOwnerWallet(data.walletAddress);
  const location = [data.city, data.country].filter(Boolean).join(', ');
  const tagList = data.vibeTags?.length
    ? `\nTags: ${data.vibeTags.map((tag) => `#${escapeHtml(tag)}`).join(' ')}`
    : '';
  const distanceLine = data.geoDistanceMeters !== null && data.geoDistanceMeters !== undefined
    ? `\nGPS: ${data.geoDistanceMeters}m from venue anchor`
    : '';
  const caption = compactText(data.caption, 220);

  const message = [
    '📍 <b>MARK NEEDS APPROVAL</b>',
    '',
    `<b>${escapeHtml(data.venueName)}</b>${location ? ` · ${escapeHtml(location)}` : ''}`,
    data.firstMark ? '⚡ First mark candidate' : 'Memory-layer mark',
    `ID: <code>${escapeHtml(shortTagId)}</code>`,
    `Creator: ${escapeHtml(creator)}`,
    caption ? `\nCaption: ${escapeHtml(caption)}` : null,
    `${tagList}${distanceLine}`,
    '',
    data.proofMediaUrl ? htmlLink(data.proofMediaUrl, 'Open proof') : null,
    htmlLink(appUrl(`/admin?tab=placeTags&placeTagId=${encodeURIComponent(data.tagId)}`), 'Open Chaos Inbox'),
    htmlLink(appUrl(`/map?place=${encodeURIComponent(data.venueSlug)}`), 'Open map'),
    '',
    `Approve: <code>/placeapprove ${escapeHtml(shortTagId)}</code>`,
    `Reject: <code>/placereject ${escapeHtml(shortTagId)} reason</code>`,
    `Flag: <code>/placeflag ${escapeHtml(shortTagId)} reason</code>`,
  ]
    .filter(Boolean)
    .join('\n');

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
  offerId?: string | null;
  website?: string | null;
  notes?: string | null;
  routedCreator?: string | null;
  routedVenueSlug?: string | null;
  routedSource?: string | null;
  routedMissionType?: string | null;
  routedMissionTitle?: string | null;
  routedCreatorSlots?: string | null;
  routedPayout?: string | null;
  routedTimeWindow?: string | null;
  routedProofRequired?: string | null;
  routedContentRequired?: string | null;
  routedGuestMission?: string | null;
  routedPerkLabel?: string | null;
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
    data.offerId ? `Offer: ${escapeHtml(data.offerId)}` : null,
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
  const routedLane = [
    data.routedCreatorSlots ? `${compactText(data.routedCreatorSlots, 40)} slots` : null,
    data.routedPayout ? compactText(data.routedPayout, 70) : null,
    data.routedTimeWindow ? compactText(data.routedTimeWindow, 90) : null,
  ].filter(Boolean).join(' · ');
  const missionRoutePreview = [
    data.routedMissionTitle ? `Mission: ${compactText(data.routedMissionTitle, 120)}` : null,
    data.routedMissionType ? `Type: ${compactText(data.routedMissionType, 60)}` : null,
    data.routedGuestMission ? `Guest loop: ${compactText(data.routedGuestMission, 130)}` : null,
    data.routedPerkLabel ? `Perk: ${compactText(data.routedPerkLabel, 90)}` : null,
    data.routedProofRequired ? `Proof: ${compactText(data.routedProofRequired, 130)}` : null,
    data.routedContentRequired ? `Content: ${compactText(data.routedContentRequired, 130)}` : null,
    routedLane ? `Creator lane: ${routedLane}` : null,
  ].filter(Boolean);

  const message = `
💸 <b>PAID ACTIVATION INTAKE</b>

<b>${escapeHtml(data.company)}</b>
${details.join('\n')}
${notes ? `\nNote: ${escapeHtml(notes)}` : ''}
${missionRoutePreview.length ? `\n<b>Mission Route</b>\n${missionRoutePreview.map((item) => escapeHtml(String(item))).join('\n')}` : ''}
${memoryPreview.length ? `\n<b>Brand Memory</b>\n${memoryPreview.map((item) => escapeHtml(String(item))).join('\n')}` : ''}
${activationBrief ? `\n<b>Activation Brief</b>\n${escapeHtml(compactText(activationBrief.positioningLine, 160))}` : ''}
${missionPreview ? `\n${missionPreview}` : ''}
Lead: <code>${escapeHtml(data.leadId)}</code>

${htmlLink(appUrl(`/admin/activation-intakes?leadId=${encodeURIComponent(data.leadId)}`), 'Open intake queue')} · ${data.routedVenueSlug ? `${htmlLink(appUrl(`/venues/${encodeURIComponent(data.routedVenueSlug)}`), 'Open venue')} · ` : ''}${htmlLink(appUrl('/admin/daily-command-loop'), 'Command loop')} · ${htmlLink(appUrl('/brands/portal'), 'Brand portal')}
`.trim();

  return sendMessage(message);
}

export async function alertCreatorCaptainApplication(data: {
  applicationId: string;
  creatorName: string;
  email: string;
  city: string;
  primaryHandle: string;
  primaryPlatform: string;
  categories: string[];
  helpModes?: string[];
  audienceSize: string;
  availability: string;
  expectedPayout: string;
  venueLead?: string | null;
  priorityScore: number;
  priorityReasons: string[];
}): Promise<boolean> {
  const categoryLine = data.categories
    .map((category) => CREATOR_CAPTAIN_CATEGORY_LABELS[category as keyof typeof CREATOR_CAPTAIN_CATEGORY_LABELS] || category)
    .join(', ');
  const helpModeLine = (data.helpModes || [])
    .map((helpMode) => CREATOR_CAPTAIN_HELP_MODE_LABELS[helpMode as keyof typeof CREATOR_CAPTAIN_HELP_MODE_LABELS] || helpMode)
    .join(', ');
  const details = [
    `Contact: ${escapeHtml(data.creatorName)} &lt;${escapeHtml(data.email)}&gt;`,
    `Handle: <code>${escapeHtml(data.primaryHandle)}</code> · Platform: ${escapeHtml(CREATOR_CAPTAIN_PLATFORM_LABELS[data.primaryPlatform as keyof typeof CREATOR_CAPTAIN_PLATFORM_LABELS] || data.primaryPlatform)}`,
    `City: ${escapeHtml(data.city)} · Audience: ${escapeHtml(CREATOR_CAPTAIN_AUDIENCE_LABELS[data.audienceSize as keyof typeof CREATOR_CAPTAIN_AUDIENCE_LABELS] || data.audienceSize)}`,
    `Lane: ${escapeHtml(categoryLine || 'unknown')} · Available: ${escapeHtml(CREATOR_CAPTAIN_AVAILABILITY_LABELS[data.availability as keyof typeof CREATOR_CAPTAIN_AVAILABILITY_LABELS] || data.availability)}`,
    helpModeLine ? `Captain help: ${escapeHtml(helpModeLine)}` : null,
    `Expected payout: ${escapeHtml(CREATOR_CAPTAIN_PAYOUT_LABELS[data.expectedPayout as keyof typeof CREATOR_CAPTAIN_PAYOUT_LABELS] || data.expectedPayout)}`,
    data.venueLead ? `Venue lead: ${escapeHtml(compactText(data.venueLead, 180))}` : null,
    `Priority: ${data.priorityScore}/100 · ${escapeHtml(data.priorityReasons.join(', '))}`,
  ].filter(Boolean);

  const message = `
🎥 <b>CREATOR CAPTAIN APPLICATION</b>

<b>${escapeHtml(data.primaryHandle)}</b>
${details.join('\n')}
Application: <code>${escapeHtml(data.applicationId)}</code>

${htmlLink(appUrl(`/admin/creator-captains?applicationId=${encodeURIComponent(data.applicationId)}`), 'Open creator queue')} · ${htmlLink(appUrl('/captains'), 'Public form')} · ${htmlLink(appUrl('/admin/activation-intakes'), 'Activation queue')}
`.trim();

  return sendMessage(message);
}

export async function alertCreatorCaptainStatusUpdate(data: {
  applicationId: string;
  creatorName: string;
  primaryHandle: string;
  status: string;
  operatorNote?: string | null;
  updatedBy?: string | null;
}): Promise<boolean> {
  const lines = [
    data.creatorName ? `Creator: ${escapeHtml(data.creatorName)}` : null,
    data.operatorNote ? `Note: ${escapeHtml(compactText(data.operatorNote, 220))}` : null,
    data.updatedBy ? `By: <code>${escapeHtml(data.updatedBy)}</code>` : null,
  ].filter(Boolean);

  const message = `
✅ <b>CREATOR CAPTAIN UPDATED</b>

<b>${escapeHtml(data.primaryHandle || data.creatorName || 'Creator')}</b>
Status: <b>${escapeHtml(data.status)}</b>
Application: <code>${escapeHtml(data.applicationId)}</code>
${lines.length ? `\n${lines.join('\n')}` : ''}

${htmlLink(appUrl(`/admin/creator-captains?applicationId=${encodeURIComponent(data.applicationId)}`), 'Open creator queue')}
`.trim();

  return sendMessage(message);
}

export async function alertScoutCreatorLead(data: {
  leadId: string;
  scoutName: string;
  scoutHandle: string;
  scoutCode: string;
  creatorHandle: string;
  creatorName?: string | null;
  creatorPlatform: string;
  creatorCity: string;
  relationshipStrength: string;
  score: number;
  scoreReasons: string[];
  captainInvitePath: string;
}): Promise<boolean> {
  const details = [
    `Scout: ${escapeHtml(data.scoutHandle || data.scoutName)} · Code: <code>${escapeHtml(data.scoutCode)}</code>`,
    `Creator: <code>${escapeHtml(data.creatorHandle)}</code>${data.creatorName ? ` · ${escapeHtml(data.creatorName)}` : ''}`,
    `City: ${escapeHtml(data.creatorCity)} · Platform: ${escapeHtml(SCOUT_CREATOR_PLATFORM_LABELS[data.creatorPlatform as keyof typeof SCOUT_CREATOR_PLATFORM_LABELS] || data.creatorPlatform)}`,
    `Relationship: ${escapeHtml(SCOUT_RELATIONSHIP_STRENGTH_LABELS[data.relationshipStrength as keyof typeof SCOUT_RELATIONSHIP_STRENGTH_LABELS] || data.relationshipStrength)}`,
    `Score: ${data.score}/100 · ${escapeHtml(data.scoreReasons.join(', '))}`,
  ];

  const message = `
🛰️ <b>SCOUT CREATOR LEAD</b>

${details.join('\n')}
Lead: <code>${escapeHtml(data.leadId)}</code>

${htmlLink(appUrl(`/admin/scouts?leadId=${encodeURIComponent(data.leadId)}`), 'Open scout queue')} · ${htmlLink(appUrl(data.captainInvitePath), 'Captain invite')} · ${htmlLink(appUrl('/scouts'), 'Scout form')}
`.trim();

  return sendMessage(message);
}

export async function alertScoutCreatorLeadStatusUpdate(data: {
  leadId: string;
  creatorHandle: string;
  scoutCode: string;
  status: string;
  operatorNote?: string | null;
  updatedBy?: string | null;
}): Promise<boolean> {
  const statusLabel =
    SCOUT_CREATOR_LEAD_STATUS_LABELS[data.status as keyof typeof SCOUT_CREATOR_LEAD_STATUS_LABELS] || data.status;
  const lines = [
    `Creator: <code>${escapeHtml(data.creatorHandle)}</code>`,
    `Scout code: <code>${escapeHtml(data.scoutCode)}</code>`,
    data.operatorNote ? `Note: ${escapeHtml(compactText(data.operatorNote, 220))}` : null,
    data.updatedBy ? `By: <code>${escapeHtml(data.updatedBy)}</code>` : null,
  ].filter(Boolean);

  const message = `
✅ <b>SCOUT LEAD UPDATED</b>

Status: <b>${escapeHtml(statusLabel)}</b>
Lead: <code>${escapeHtml(data.leadId)}</code>
${lines.length ? `\n${lines.join('\n')}` : ''}

${htmlLink(appUrl(`/admin/scouts?leadId=${encodeURIComponent(data.leadId)}`), 'Open scout queue')}
`.trim();

  return sendMessage(message);
}

export async function alertCaptainMissionProofSubmitted(data: {
  leadId: string;
  creatorHandle: string;
  venueName: string;
  city: string;
  proofCount: number;
  activationHref: string;
}): Promise<boolean> {
  const message = `
⚡ <b>CAPTAIN MISSION PROOF</b>

Creator: <code>${escapeHtml(data.creatorHandle || 'creator')}</code>
Venue: <b>${escapeHtml(data.venueName)}</b>
City: ${escapeHtml(data.city)}
Proof links: ${data.proofCount}
Lead: <code>${escapeHtml(data.leadId)}</code>

${htmlLink(appUrl(`/admin/scouts?leadId=${encodeURIComponent(data.leadId)}`), 'Open scout queue')} · ${htmlLink(appUrl(data.activationHref), 'Open First Spark route')}
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

export async function alertActivationIntakeFollowUpQueue(data: {
  urgentCount: number;
  minAgeHours: number;
  leads: Array<{
    leadId: string;
    company: string;
    contactName: string;
    email: string;
    city: string;
    venue: string;
    status: string;
    budgetRange: string;
    packageId: string;
    source: string;
    ageHours: number;
    reasons: string[];
  }>;
}): Promise<boolean> {
  const budgetLabels: Record<string, string> = {
    '500_1500': '$500-$1.5k',
    '1500_5000': '$1.5k-$5k',
    '5000_15000': '$5k-$15k',
    '15000_plus': '$15k+',
  };
  const preview = data.leads
    .slice(0, 5)
    .map((lead) => {
      const target = [lead.venue, lead.city].filter(Boolean).join(' · ');
      const reasons = lead.reasons.length ? lead.reasons.map((reason) => escapeHtml(reason)).join(', ') : 'no next action';
      return `• <b>${escapeHtml(lead.company)}</b>${target ? ` · ${escapeHtml(target)}` : ''}\n  ${escapeHtml(lead.status)} · ${escapeHtml(budgetLabels[lead.budgetRange] || lead.budgetRange || 'budget unknown')} · ${escapeHtml(lead.packageId || 'package unknown')} · ${lead.ageHours}h old\n  ${escapeHtml(lead.email)} · ${escapeHtml(lead.source || 'direct')} · ${reasons}`;
    })
    .join('\n');

  const message = `
💸 <b>ACTIVATION FOLLOW-UP ALERT</b>

${data.urgentCount} high-intent activation ${data.urgentCount === 1 ? 'lead has' : 'leads have'} no next action after ${data.minAgeHours}h.

${preview}

${htmlLink(appUrl('/admin/activation-intakes'), 'Open activation queue')} · ${htmlLink(appUrl('/admin/daily-command-loop'), 'Command loop')}
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
 * Alert: BaseCash venue credit needs manual payment approval.
 */
export async function alertBaseCashCreditPending(data: {
  creditId: string;
  receiptCode: string;
  venueName: string;
  venueSlug: string;
  buyerWallet: string;
  buyerTag?: string | null;
  denominationPhp: number;
  serviceFeePhp: number;
  totalPhp: number;
  estimatedUsdc: number;
  receiptUrl: string;
}): Promise<void> {
  const wallet =
    data.buyerWallet.length > 12
      ? `${data.buyerWallet.slice(0, 6)}...${data.buyerWallet.slice(-4)}`
      : data.buyerWallet;
  const adminUrl = appUrl('/admin/basecash');
  const venueUrl = appUrl(`/venues/${data.venueSlug}/basecash`);

  const message = [
    '🟡 <b>BASECASH APPROVAL NEEDED</b>',
    '',
    `<b>${escapeHtml(data.venueName)}</b>`,
    `Credit: <b>₱${data.denominationPhp.toLocaleString('en-PH')}</b> + ₱${data.serviceFeePhp.toLocaleString('en-PH')} fee`,
    `Due: <b>₱${data.totalPhp.toLocaleString('en-PH')}</b> ≈ <b>${data.estimatedUsdc.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} USDC</b>`,
    `Buyer: <code>${escapeHtml(data.buyerTag || wallet)}</code>`,
    `Receipt: <code>${escapeHtml(data.receiptCode)}</code>`,
    '',
    'Confirm only after the Base USDC payment is visible.',
    `Approve: <code>/basecashapprove ${escapeHtml(data.receiptCode)}</code>`,
    `With tx: <code>/basecashapprove ${escapeHtml(data.receiptCode)} 0x...</code>`,
    '',
    `${htmlLink(data.receiptUrl, 'Open receipt')} · ${htmlLink(adminUrl, 'Admin ledger')} · ${htmlLink(venueUrl, 'Venue credit page')}`,
  ].join('\n');

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
