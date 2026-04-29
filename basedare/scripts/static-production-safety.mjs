#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const adminAllowlist = new Map([
  [
    'app/api/admin/approve-tag/route.ts',
    'Uses TELEGRAM_ADMIN_SECRET for Telegram inline admin actions.',
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
    const allowReason = adminAllowlist.get(file);

    if (allowReason) {
      const hasTelegramSecret =
        content.includes('TELEGRAM_ADMIN_SECRET') &&
        content.includes('x-telegram-admin-secret') &&
        content.includes('hasValidAdminSecret');

      if (!hasTelegramSecret) {
        failures.push(`Admin route allowlist drift: ${file} no longer matches "${allowReason}"`);
      } else {
        warnings.push(`Allowlisted admin route: ${file} (${allowReason})`);
      }
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

await checkAdminRoutes();
await checkCronRoutes();
await checkSensitiveRoutes();

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
