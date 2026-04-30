#!/usr/bin/env node

const baseUrl =
  process.env.BASEDARE_SAFETY_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://basedare.xyz';
const adminSecret = process.env.BASEDARE_ADMIN_SECRET || process.env.ADMIN_SECRET;
const cronSecret = process.env.BASEDARE_CRON_SECRET || process.env.CRON_SECRET;

const checks = [];

function record(severity, label, detail) {
  checks.push({ severity, label, detail });
  const marker = severity === 'block' ? 'BLOCK' : severity === 'warn' ? 'WARN' : 'PASS';
  console.log(`[${marker}] ${label}: ${detail}`);
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(new URL(path, baseUrl), {
      ...options,
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // Some framework responses are HTML; status is what matters for smoke checks.
    }
    return { response, json, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function expectProtected(path, options = {}) {
  try {
    const { response } = await request(path, options);
    if (response.status === 401 || response.status === 403 || response.status === 503) {
      record('pass', `${options.method || 'GET'} ${path}`, `protected with HTTP ${response.status}`);
      return;
    }
    record('block', `${options.method || 'GET'} ${path}`, `expected protected response, got HTTP ${response.status}`);
  } catch (error) {
    record('block', `${options.method || 'GET'} ${path}`, error instanceof Error ? error.message : String(error));
  }
}

async function checkProductionSafetyEndpoint() {
  if (!adminSecret) {
    record(
      'warn',
      'Authenticated production safety endpoint',
      'Skipped because BASEDARE_ADMIN_SECRET or ADMIN_SECRET is not set.'
    );
    return;
  }

  try {
    const { response, json } = await request('/api/admin/production-safety', {
      headers: {
        'x-admin-secret': adminSecret,
      },
    });

    if (!response.ok || !json?.success) {
      record('block', 'Authenticated production safety endpoint', `failed with HTTP ${response.status}`);
      return;
    }

    const summary = json.data?.summary;
    if (!summary) {
      record('block', 'Authenticated production safety endpoint', 'returned no summary payload');
      return;
    }

    const severity = summary.blockers > 0 ? 'block' : summary.warnings > 0 ? 'warn' : 'pass';
    record(
      severity,
      'Authenticated production safety endpoint',
      `${summary.blockers} blockers, ${summary.warnings} warnings, ${summary.passes} passes`
    );
  } catch (error) {
    record(
      'block',
      'Authenticated production safety endpoint',
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function checkCronWithSecret() {
  if (!cronSecret) {
    record('warn', 'Authenticated cron smoke', 'Skipped because BASEDARE_CRON_SECRET or CRON_SECRET is not set.');
    return;
  }

  try {
    const { response, json } = await request('/api/cron/venue-report-leads', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    if (!response.ok || !json?.success) {
      const detail =
        response.status === 401
          ? 'production rejected the configured cron secret with HTTP 401; align Vercel CRON_SECRET with BASEDARE_CRON_SECRET/CRON_SECRET before relying on scheduled jobs.'
          : response.status === 503
            ? 'production cron route is fail-closed because CRON_SECRET is missing in the deployed environment.'
            : `venue lead cron failed with HTTP ${response.status}`;
      record('block', 'Authenticated cron smoke', detail);
      return;
    }

    record('pass', 'Authenticated cron smoke', 'venue lead cron accepted the configured secret.');
  } catch (error) {
    record('block', 'Authenticated cron smoke', error instanceof Error ? error.message : String(error));
  }
}

console.log(`BaseDare production endpoint smoke: ${new URL(baseUrl).origin}`);

await expectProtected('/api/admin/debug');
await expectProtected('/api/admin/production-safety');
await expectProtected('/api/telegram/test');
await expectProtected('/api/refund/expired');
await expectProtected('/api/cron/retry-payouts', { method: 'POST' });
await expectProtected('/api/cron/refund-expired', { method: 'POST' });
await expectProtected('/api/cron/venue-report-leads', { method: 'POST' });
await checkProductionSafetyEndpoint();
await checkCronWithSecret();

const blockers = checks.filter((check) => check.severity === 'block').length;
const warnings = checks.filter((check) => check.severity === 'warn').length;
const passes = checks.filter((check) => check.severity === 'pass').length;

console.log(`\nSummary: ${blockers} blockers, ${warnings} warnings, ${passes} passes`);

if (blockers > 0) {
  process.exit(1);
}
