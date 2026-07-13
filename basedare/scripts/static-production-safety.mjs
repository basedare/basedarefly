#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const adminAllowlist = new Map([
  [
    'app/api/admin/approve-tag/route.ts',
    {
      reason: 'Uses TELEGRAM_ADMIN_SECRET for Telegram inline admin actions.',
      required: ['TELEGRAM_ADMIN_SECRET', 'x-telegram-admin-secret', 'hasValidAdminSecret'],
    },
  ],
  [
    'app/api/admin/session/route.ts',
    {
      reason: 'Creates short-lived HttpOnly admin sessions after validating ADMIN_SECRET.',
      required: [
        'isValidAdminSecretCandidate',
        'createAdminSessionCookieValue',
        'ADMIN_SESSION_COOKIE_NAME',
        'httpOnly: true',
        "sameSite: 'strict'",
      ],
    },
  ],
]);

const sensitiveRoutes = [
  {
    label: 'Refund expiry inspector',
    file: 'app/api/refund/expired/route.ts',
    required: ['verifyCronSecret(request)'],
  },
  {
    label: 'Telegram test endpoint',
    file: 'app/api/telegram/test/route.ts',
    required: ['authorizeAdminRequest(request)'],
  },
  {
    label: 'Telegram command endpoint',
    file: 'app/api/telegram/command/route.ts',
    required: ['hasValidTelegramAdminSecret(req)'],
  },
  {
    label: 'Telegram query endpoint',
    file: 'app/api/telegram/query/route.ts',
    required: ['hasValidTelegramAdminSecret(req)'],
  },
];

const failures = [];
const warnings = [];

async function listRouteFiles(dir) {
  const fullDir = path.join(root, dir);
  const entries = await fs.readdir(fullDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listRouteFiles(relativePath));
    } else if (entry.isFile() && entry.name === 'route.ts') {
      files.push(relativePath);
    }
  }

  return files.sort();
}

async function read(relativePath) {
  return fs.readFile(path.join(root, relativePath), 'utf8');
}

function assertContains(file, content, needles, label) {
  for (const needle of needles) {
    if (!content.includes(needle)) {
      failures.push(`${label}: ${file} is missing ${needle}`);
    }
  }
}

async function checkAdminRoutes() {
  const files = await listRouteFiles('app/api/admin');

  for (const file of files) {
    const content = await read(file);
    const allowRule = adminAllowlist.get(file);

    if (allowRule) {
      for (const needle of allowRule.required) {
        if (!content.includes(needle)) {
          failures.push(`Admin route allowlist drift: ${file} no longer matches "${allowRule.reason}"`);
          break;
        }
      }
      warnings.push(`Allowlisted admin route: ${file} (${allowRule.reason})`);
      continue;
    }

    assertContains(
      file,
      content,
      ['authorizeAdminRequest(request)', 'unauthorizedAdminResponse(auth)'],
      'Admin auth guard'
    );
  }
}

async function checkCronRoutes() {
  const files = await listRouteFiles('app/api/cron');

  for (const file of files) {
    const content = await read(file);
    assertContains(file, content, ['verifyCronSecret'], 'Cron auth guard');
  }
}

async function checkSensitiveRoutes() {
  for (const route of sensitiveRoutes) {
    const content = await read(route.file);
    assertContains(route.file, content, route.required, route.label);
  }
}

async function checkFinancialCanon() {
  const contract = await read('contracts/BaseDareBountyV2.sol');
  assertContains(
    'contracts/BaseDareBountyV2.sol',
    contract,
    [
      'PLATFORM_FEE_PERCENT = 4',
      'REFERRAL_FEE_PERCENT = 0',
      'totalFeePercent()',
    ],
    'V2 financial canon',
  );

  const executableCanon = await read('lib/financial-canon.ts');
  assertContains(
    'lib/financial-canon.ts',
    executableCanon,
    [
      'completerPercent: 96',
      'platformPercent: 4',
      'referralPercent: 0',
      'livePotPercent: 0',
      'invoiceTotalUsd: 2_500',
      'serviceFeeUsd: 2_000',
      'grossRewardPoolUsd: 500',
    ],
    'Executable financial canon',
  );

  const campaignRoute = await read('app/api/campaigns/route.ts');
  assertContains(
    'app/api/campaigns/route.ts',
    campaignRoute,
    [
      'if (!isInternalAuthorized)',
      'BUSINESS_INVOICE_REQUIRED',
      'PAID_INTAKE_REQUIRED',
      'PAYMENT_LINES_NOT_CONFIRMED',
      'REWARD_ESCROW_REQUIRED',
      'SPRINT_MISSION_LIMIT_REACHED',
      'PLACE_CAMPAIGN_DB_FALLBACK = false',
      'rakePercent: 0',
    ],
    'Managed campaign invoice gate',
  );

  const buyerComposer = await read('app/brands/portal/ActivationComposer.tsx');
  assertContains(
    'app/brands/portal/ActivationComposer.tsx',
    buyerComposer,
    ['MANAGED_FIELD_SPRINT', 'Request $', 'Sprint invoice'],
    'Buyer portal financial canon',
  );
  if (buyerComposer.includes('submitBountyCreation') || buyerComposer.includes('handleCreateCampaign')) {
    failures.push('Buyer portal financial canon: public composer must not directly fund a managed campaign');
  }

  const activationAdminRoute = await read('app/api/admin/activation-intakes/route.ts');
  if (
    activationAdminRoute.includes('accrueScoutRakeForVenuePayment') ||
    activationAdminRoute.includes('clawbackScoutRakeForPayment')
  ) {
    failures.push('Managed-service revenue must not trigger an automatic scout commission');
  }
  assertContains(
    'app/api/admin/activation-intakes/route.ts',
    activationAdminRoute,
    [
      'rewardPoolConfirmedAmountUsd',
      'designPartnerServiceFeeException',
      'The full $${MANAGED_FIELD_SPRINT.grossRewardPoolUsd} contributor pool must be confirmed before launch.',
    ],
    'Managed-service payment-line gate',
  );

  const publicFeeCopy = [
    'components/RotatingHero.tsx',
    'components/creators/PublicCreators.tsx',
    'components/StakeCard.tsx',
    'components/stake-card.tsx',
  ];
  for (const file of publicFeeCopy) {
    const content = await read(file);
    if (content.includes('10% Platform Fee') || content.includes('10% platform fee') || content.includes('Receive 89%')) {
      failures.push(`Public V2 fee copy drift: ${file} still exposes legacy economics`);
    }
  }
}

await checkAdminRoutes();
await checkCronRoutes();
await checkSensitiveRoutes();
await checkFinancialCanon();

for (const warning of warnings) {
  console.warn(`WARN: ${warning}`);
}

if (failures.length > 0) {
  console.error(`BLOCKED: ${failures.length} production safety issue(s) found.`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('PASS: static production safety guardrails are intact.');
