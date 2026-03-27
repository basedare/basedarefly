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

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

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
 * Send a message to the admin Telegram chat
 */
async function sendMessage(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[TELEGRAM] Bot token or chat ID not configured');
    return false;
  }

  try {
    const payload = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
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
 * Format USDC amount for display
 */
function formatUSDC(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USDC`;
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
    await sendDareReviewAlert({
      dareId: data.dareId,
      shortId: data.shortId,
      title: data.title,
      streamerTag: data.streamerTag,
      confidence: data.confidence,
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
