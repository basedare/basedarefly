#!/usr/bin/env node
/**
 * Clawdbot Telegram Polling Script
 *
 * Polls Telegram for commands and executes them via the API.
 * Run with: node scripts/clawdbot-poll.js
 *
 * Commands:
 *   /pending - List dares awaiting review
 *   /approve <id> - Approve a dare
 *   /reject <id> <reason> - Reject a dare
 *   /stats - Quick stats
 *   /help - Show commands
 */

require('dotenv').config({ path: '.env.local' });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set in .env.local');
  process.exit(1);
}

if (!TELEGRAM_ADMIN_CHAT_ID) {
  console.error('❌ TELEGRAM_ADMIN_CHAT_ID not set in .env.local');
  process.exit(1);
}

let lastUpdateId = 0;
const POLL_INTERVAL = 2000; // 2 seconds

/**
 * Send message to Telegram
 */
async function sendMessage(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error('Failed to send message:', err.message);
  }
}

/**
 * Call the command API
 */
async function callCommandAPI(cmd, params = {}) {
  const url = new URL(`${API_BASE}/api/telegram/command`);
  url.searchParams.set('cmd', cmd);
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });

  try {
    const res = await fetch(url.toString());
    return await res.json();
  } catch (err) {
    console.error(`API call failed: ${err.message}`);
    return { error: err.message };
  }
}

/**
 * Call the natural language query API
 */
async function callQueryAPI(query) {
  const url = new URL(`${API_BASE}/api/telegram/query`);
  url.searchParams.set('q', query);

  try {
    const res = await fetch(url.toString());
    return await res.json();
  } catch (err) {
    console.error(`Query API failed: ${err.message}`);
    return { error: err.message };
  }
}

/**
 * Check if text is a natural language query (not a command)
 */
function isNaturalLanguageQuery(text) {
  const queryPatterns = [
    /show me/i,
    /how many/i,
    /total/i,
    /dares? (?:over|under|above|below)/i,
    /list/i,
    /find/i,
    /search/i,
    /what.*dares/i,
    /volume/i,
    /biggest/i,
    /top \d+/i,
  ];
  return queryPatterns.some(p => p.test(text));
}

/**
 * Handle incoming command or natural language query
 */
async function handleCommand(text, chatId) {
  // Only process from admin chat
  if (chatId.toString() !== TELEGRAM_ADMIN_CHAT_ID) {
    console.log(`Ignored message from non-admin chat: ${chatId}`);
    return;
  }

  // Check for natural language query (not starting with /)
  if (!text.startsWith('/') && isNaturalLanguageQuery(text)) {
    console.log(`🔍 Natural query: ${text}`);
    await callQueryAPI(text);
    return;
  }

  const parts = text.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase().replace('/', '');
  const args = parts.slice(1);

  console.log(`📥 Command: /${cmd} ${args.join(' ')}`);

  switch (cmd) {
    case 'pending':
      await callCommandAPI('pending');
      break;

    case 'approve':
      if (!args[0]) {
        await sendMessage('❌ Usage: <code>/approve [dare_id]</code>');
        return;
      }
      await callCommandAPI('approve', { id: args[0] });
      break;

    case 'reject':
      if (!args[0]) {
        await sendMessage('❌ Usage: <code>/reject [dare_id] [reason]</code>');
        return;
      }
      await callCommandAPI('reject', {
        id: args[0],
        reason: args.slice(1).join(' ') || 'Rejected by admin'
      });
      break;

    case 'stats':
      await callCommandAPI('stats');
      break;

    case 'query':
    case 'q':
      if (!args.length) {
        await sendMessage('❌ Usage: <code>/query [natural language]</code>\n\nExamples:\n• show me dares over $100\n• how many pending\n• total volume this week');
        return;
      }
      await callQueryAPI(args.join(' '));
      break;

    case 'help':
    case 'start':
      await sendMessage(`
🤖 <b>CLAWDBOT COMMANDS</b>

<b>Review Dares:</b>
/pending - List dares awaiting review
/approve [id] - Approve a dare
/reject [id] [reason] - Reject a dare

<b>Stats & Queries:</b>
/stats - Quick stats overview
/query [text] - Natural language search

<b>Examples:</b>
<code>/approve ftEXgfxL</code>
<code>/reject abc123 Invalid proof</code>
<code>/query dares over $100</code>

<b>Or just ask:</b>
"show me dares over $100"
"how many pending dares"
"total volume this week"
      `.trim());
      break;

    default:
      // Ignore unknown commands
      break;
  }
}

/**
 * Poll for updates
 */
async function poll() {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) {
      console.error('Telegram API error:', data.description);
      return;
    }

    for (const update of data.result || []) {
      lastUpdateId = update.update_id;

      if (update.message?.text?.startsWith('/')) {
        await handleCommand(update.message.text, update.message.chat.id);
      }
    }
  } catch (err) {
    console.error('Poll error:', err.message);
  }
}

/**
 * Main loop
 */
async function main() {
  // First, delete the webhook so polling works
  console.log('🔧 Removing webhook for polling mode...');
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`);

  console.log('🤖 Clawdbot polling started');
  console.log(`📡 Listening for commands in chat ${TELEGRAM_ADMIN_CHAT_ID}`);
  console.log(`🌐 API: ${API_BASE}`);
  console.log('');
  console.log('Commands: /pending /approve /reject /stats /help');
  console.log('Press Ctrl+C to stop');
  console.log('');

  // Send startup message
  await sendMessage('🤖 <b>Clawdbot Online</b>\n\nPolling mode active. Type /help for commands.');

  // Poll loop
  while (true) {
    await poll();
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
