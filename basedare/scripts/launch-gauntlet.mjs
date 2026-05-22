#!/usr/bin/env node

import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const baseUrl =
  process.env.BASEDARE_GAUNTLET_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000';

const routeList = (
  process.env.BASEDARE_GAUNTLET_ROUTES ||
  [
    '/',
    '/map?city=siargao',
    '/create',
    '/dashboard',
    '/creators',
    '/how-it-works',
    '/leaderboard',
    '/venues/hideaway',
    '/venues/the-cat-and-gun/basecash',
  ].join(',')
)
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);

const linkLimit = Number.parseInt(process.env.BASEDARE_GAUNTLET_LINK_LIMIT || '50', 10);
const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
].filter(Boolean);

const chromePath = chromeCandidates.find((candidate) => candidate && fs.existsSync(candidate));

const viewports = [
  { name: 'iphone-se', width: 375, height: 667, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'iphone-modern', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  { name: 'desktop', width: 1440, height: 960, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
];

const findings = [];
const discoveredLinks = new Map();
const baseOrigin = new URL(baseUrl).origin;

function report(severity, route, viewport, title, detail, fixPrompt) {
  findings.push({ severity, route, viewport, title, detail, fixPrompt });
  const marker = severity === 'block' ? 'BLOCK' : severity === 'warn' ? 'WARN' : 'PASS';
  console.log(`[${marker}] ${viewport || 'all'} ${route}: ${title} - ${detail}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sameOriginPath(href) {
  try {
    const url = new URL(href, baseUrl);
    if (url.origin !== baseOrigin) return null;
    if (url.pathname.startsWith('/api/')) return null;
    if (url.pathname.startsWith('/admin/')) return null;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function isIgnoredConsole(message) {
  return [
    'favicon.ico',
    'The AudioContext was not allowed to start',
    'Permissions-Policy',
    'manifest.webmanifest',
    'Download the React DevTools',
  ].some((needle) => message.includes(needle));
}

function fixPromptFor(kind, route, viewport, detail) {
  const location = viewport ? `${route} at ${viewport}` : route;
  return `Fix ${kind} on ${location}. Reproduction: launch BaseDare at ${baseUrl}, open ${route}, use ${viewport || 'default viewport'}, and observe: ${detail}. Keep the existing BaseDare visual language, minimize new copy, and add a regression check where practical.`;
}

async function auditRoute(browser, route, viewport) {
  const page = await browser.newPage();
  const url = new URL(route, baseUrl).toString();
  const pageFindingsBefore = findings.length;

  await page.setViewport(viewport);
  if (viewport.isMobile) {
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );
  }

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (isIgnoredConsole(text)) return;
    report(
      'block',
      route,
      viewport.name,
      'Console error',
      text.slice(0, 220),
      fixPromptFor('the console error', route, viewport.name, text)
    );
  });

  page.on('pageerror', (error) => {
    report(
      'block',
      route,
      viewport.name,
      'Runtime crash',
      error.message.slice(0, 260),
      fixPromptFor('the runtime crash', route, viewport.name, error.message)
    );
  });

  page.on('response', (response) => {
    const status = response.status();
    if (status < 400) return;
    const request = response.request();
    const path = sameOriginPath(response.url());
    if (!path) return;
    if (['image', 'font', 'media'].includes(request.resourceType())) return;
    report(
      status >= 500 ? 'block' : 'warn',
      route,
      viewport.name,
      `HTTP ${status}`,
      path,
      fixPromptFor(`HTTP ${status} response`, route, viewport.name, path)
    );
  });

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const status = response?.status() ?? 0;

    if (!response || status >= 400) {
      report(
        'block',
        route,
        viewport.name,
        'Page did not load',
        `HTTP ${status || 'no response'}`,
        fixPromptFor('the failed page load', route, viewport.name, `HTTP ${status || 'no response'}`)
      );
      await page.close();
      return;
    }

    await sleep(viewport.isMobile ? 1800 : 1200);

    const audit = await page.evaluate(() => {
      const visible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          Number(style.opacity) !== 0
        );
      };

      const labelFor = (el) =>
        (el.getAttribute('aria-label') ||
          el.textContent ||
          el.getAttribute('href') ||
          el.getAttribute('name') ||
          el.tagName)
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80);

      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(doc.scrollWidth, body?.scrollWidth || 0) - window.innerWidth;

      const interactives = Array.from(
        document.querySelectorAll('a[href], button, input, textarea, select, [role="button"]')
      ).filter(visible);

      const smallTargets = interactives
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            label: labelFor(el),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        })
        .filter((item) => item.width < 36 || item.height < 36)
        .slice(0, 8);

      const clippedText = interactives
        .concat(Array.from(document.querySelectorAll('[class*="button"], [class*="pill"], [class*="chip"]')).filter(visible))
        .map((el) => ({
          label: labelFor(el),
          overflowX: Math.round(el.scrollWidth - el.clientWidth),
          overflowY: Math.round(el.scrollHeight - el.clientHeight),
        }))
        .filter((item) => item.label && (item.overflowX > 3 || item.overflowY > 6))
        .slice(0, 8);

      const emptyInternalLinks = Array.from(document.querySelectorAll('a[href]'))
        .filter(visible)
        .map((el) => ({ href: el.href, label: labelFor(el) }))
        .filter((item) => !item.label)
        .slice(0, 8);

      const links = Array.from(document.querySelectorAll('a[href]'))
        .map((el) => el.href)
        .filter(Boolean)
        .slice(0, 200);

      return {
        title: document.title,
        overflowX: Math.round(overflowX),
        smallTargets,
        clippedText,
        emptyInternalLinks,
        links,
      };
    });

    for (const href of audit.links) {
      const path = sameOriginPath(href);
      if (path && !discoveredLinks.has(path)) discoveredLinks.set(path, route);
    }

    if (audit.overflowX > 8) {
      report(
        viewport.isMobile ? 'block' : 'warn',
        route,
        viewport.name,
        'Horizontal overflow',
        `${audit.overflowX}px beyond viewport`,
        fixPromptFor('horizontal overflow', route, viewport.name, `${audit.overflowX}px beyond viewport`)
      );
    }

    if (audit.clippedText.length > 0) {
      report(
        'warn',
        route,
        viewport.name,
        'Possible clipped button/link text',
        audit.clippedText.map((item) => `${item.label} (${item.overflowX}x/${item.overflowY}y)`).join('; '),
        fixPromptFor('clipped interactive text', route, viewport.name, JSON.stringify(audit.clippedText))
      );
    }

    if (viewport.isMobile && audit.smallTargets.length > 0) {
      report(
        'warn',
        route,
        viewport.name,
        'Small tap targets',
        audit.smallTargets.map((item) => `${item.label} ${item.width}x${item.height}`).join('; '),
        fixPromptFor('small mobile tap targets', route, viewport.name, JSON.stringify(audit.smallTargets))
      );
    }

    if (audit.emptyInternalLinks.length > 0) {
      report(
        'warn',
        route,
        viewport.name,
        'Unnamed links',
        audit.emptyInternalLinks.map((item) => item.href).join('; '),
        fixPromptFor('unnamed accessible links', route, viewport.name, JSON.stringify(audit.emptyInternalLinks))
      );
    }
  } catch (error) {
    report(
      'block',
      route,
      viewport.name,
      'Navigation timed out or crashed',
      error instanceof Error ? error.message : String(error),
      fixPromptFor('the navigation timeout', route, viewport.name, error instanceof Error ? error.message : String(error))
    );
  } finally {
    if (findings.length === pageFindingsBefore) {
      console.log(`[PASS] ${viewport.name} ${route}: loaded without gauntlet blockers`);
    }
    await page.close();
  }
}

async function auditLinks() {
  const links = Array.from(discoveredLinks.keys()).slice(0, linkLimit);
  if (links.length === 0) return;

  console.log(`\nChecking ${links.length} discovered internal links...`);
  for (const path of links) {
    try {
      const targetUrl = new URL(path, baseUrl);
      let response = null;
      let lastError = null;

      for (const timeoutMs of [15_000, 30_000]) {
        try {
          response = await fetch(targetUrl, {
            redirect: 'manual',
            signal: AbortSignal.timeout(timeoutMs),
          });
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!response) {
        throw lastError ?? new Error('link check failed');
      }

      if ([301, 302, 303, 307, 308].includes(response.status)) continue;
      if (response.status >= 400) {
        const from = discoveredLinks.get(path);
        report(
          response.status >= 500 ? 'block' : 'warn',
          from || 'crawl',
          null,
          `Broken internal link HTTP ${response.status}`,
          path,
          `Fix the broken internal link ${path}. It was discovered from ${from || 'the crawled page'} while running the launch gauntlet against ${baseUrl}. Either restore the target route or update/remove the link.`
        );
      }
    } catch (error) {
      const from = discoveredLinks.get(path);
      report(
        'warn',
        from || 'crawl',
        null,
        'Internal link check failed',
        `${path}: ${error instanceof Error ? error.message : String(error)}`,
        `Investigate internal link ${path}; the launch gauntlet could not verify it from ${from || 'the crawled page'}.`
      );
    }
  }
}

if (!chromePath) {
  console.error('BLOCKED: Chrome/Brave/Chromium executable was not found. Set CHROME_PATH to run safety:ux.');
  process.exit(2);
}

console.log(`BaseDare launch gauntlet: ${baseUrl}`);
console.log(`Browser: ${chromePath}`);
console.log(`Routes: ${routeList.join(', ')}`);

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

try {
  for (const route of routeList) {
    for (const viewport of viewports) {
      await auditRoute(browser, route, viewport);
    }
  }
} finally {
  await browser.close();
}

await auditLinks();

const blockers = findings.filter((finding) => finding.severity === 'block');
const warnings = findings.filter((finding) => finding.severity === 'warn');

console.log(`\nSummary: ${blockers.length} blockers, ${warnings.length} warnings`);

if (findings.length > 0) {
  console.log('\nFix prompts:');
  for (const [index, finding] of findings.entries()) {
    console.log(`\n${index + 1}. [${finding.severity.toUpperCase()}] ${finding.title}`);
    console.log(finding.fixPrompt);
  }
}

if (blockers.length > 0) {
  process.exit(1);
}

console.log('PASS: launch gauntlet found no blockers.');
