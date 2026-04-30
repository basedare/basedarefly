#!/usr/bin/env node

const baseUrl =
  process.env.BASEDARE_SAFETY_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000';
const adminSecret = process.env.ADMIN_SECRET || process.env.BASEDARE_ADMIN_SECRET;

if (!adminSecret) {
  console.error('BLOCKED: ADMIN_SECRET or BASEDARE_ADMIN_SECRET is required.');
  process.exit(2);
}

const url = new URL('/api/admin/production-safety', baseUrl);

try {
  const response = await fetch(url, {
    headers: {
      'x-admin-secret': adminSecret,
    },
  });
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    console.error(`BLOCKED: production safety endpoint failed (${response.status}).`);
    console.error(payload.hint || payload.error || 'Unknown error');
    process.exit(2);
  }

  const report = payload.data;
  console.log(`BaseDare production safety: ${url.origin}`);
  console.log(`Generated: ${report.generatedAt}`);
  console.log(
    `Summary: ${report.summary.blockers} blockers, ${report.summary.warnings} warnings, ${report.summary.passes} passes`
  );

  for (const check of report.checks) {
    const marker =
      check.severity === 'block'
        ? 'BLOCK'
        : check.severity === 'warn'
          ? 'WARN'
          : 'PASS';
    console.log(`\n[${marker}] ${check.label}`);
    console.log(check.detail);
    if (check.nextAction) {
      console.log(`Next: ${check.nextAction}`);
    }
  }

  if (report.activationSmoke) {
    const smoke = report.activationSmoke;
    console.log(`\nPaid activation smoke: ${smoke.modeLabel}`);
    console.log(
      `Activation rail: ${smoke.summary.linkedVenueCampaigns} linked venue campaigns, ${smoke.summary.liveVenueDares} live venue dares, ${smoke.summary.readyToInvoiceIntakes} ready invoices, ${smoke.summary.staleFundingVenueDares} stale funding`
    );

    for (const check of smoke.checks) {
      const marker =
        check.severity === 'block'
          ? 'BLOCK'
          : check.severity === 'warn'
            ? 'WARN'
            : 'PASS';
      console.log(`\n[${marker}] ${check.label}`);
      console.log(check.detail);
      if (check.nextAction) {
        console.log(`Next: ${check.nextAction}`);
      }
    }
  }

  if (report.summary.blockers > 0) {
    process.exit(1);
  }
} catch (error) {
  console.error('BLOCKED: production safety check crashed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
