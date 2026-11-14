import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Reviewed mappings select registered suites, never commands supplied by observations.
const rules = [
  [/^(app\/api\/(brands|campaigns)|app\/brands\/|lib\/(buyer-workspace|campaign-|business-|financial-canon)|scripts\/(run-|render-)?buyer-workspace)/, ['buyer', 'business']],
  [/^lib\/wallet-action-auth/, ['buyer', 'safety', 'social']],
  [/^(components\/maps\/|app\/map\/|lib\/(discovery|recommendation|map-entry)|components\/discovery\/)/, ['discovery']],
  [/^(app\/(dashboard|creator|community|moments)\/|components\/(social|ui\/Notification)|lib\/(social|creator|community|moment))/, ['social']],
  [/^(lib\/contribution|app\/api\/(admin\/)?contribution|components\/contributions|app\/island-trials\/seasons)/, ['recognition']],
  [/^(lib\/discovery-qr|app\/go\/|app\/api\/discovery-qr)/, ['qr']],
  [/^(app\/(global\.css|page\.tsx|layout\.tsx)|components\/(Business|MatrixRain|IdentityButton|Providers|home\/)|package(-lock)?\.json|next\.config|prisma\/)/, ['buyer', 'business', 'discovery', 'safety']],
  [/^(harness\/|scripts\/(http-redirect|static-production|expired-refund))/, ['harness', 'safety']],
];
const runtime = /\.(?:[cm]?[jt]sx?|css|prisma|sql|sh|json)$/;
const ignored = /^(docs\/|brain-vault\/|graphify-out\/|tasks\/)|(^|\/)(AGENTS\.md|README\.md)$|\.test\.[cm]?[jt]sx?$/;
export function planChangedChecks(files, suites) {
  const changed = [...new Set(files)].sort();
  const selected = new Set(), uncovered = [], manual = new Set();
  for (const file of changed) {
    if (ignored.test(file) || !runtime.test(file)) continue;
    const matches = rules.filter(([pattern]) => pattern.test(file));
    if (!matches.length) { uncovered.push(file); continue; }
    for (const [, names] of matches) for (const name of names) selected.add(name);
    if (/\.tsx?$/.test(file) && /^(components\/|app\/)/.test(file)) manual.add('Verify the affected browser journey at 320px, 390px and desktop.');
    if (/auth|api\/|prisma\//.test(file)) manual.add('Review authorization, account changes, privacy and failure recovery.');
    if (/campaign|buyer|financial|payment|payout/.test(file)) manual.add('Keep recorded funding, approval and payment distinct; real-money acceptance is separate.');
  }
  const names = [...selected].sort();
  for (const name of names) if (!Array.isArray(suites[name]) || !suites[name].length) throw Error('A selected check suite is missing or empty.');
  return { changed, suites: names, scripts: [...new Set(names.flatMap(name => suites[name]))], uncovered,
    passed: uncovered.length === 0, requiredManualChecks: [...manual] };
}
function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw Error('Cannot resolve the requested source comparison. No command output is included.');
  return result.stdout;
}
export function changedSourcePlan(root, base, suites) {
  // Arguments are never sent to a shell. Ref validation also rejects Git option injection.
  if (!base || base.startsWith('-') || !/^[A-Za-z0-9_./~^@{}:-]+$/.test(base)) throw Error('Choose an explicit Git base revision.');
  const resolved = git(root, ['rev-parse', '--verify', `${base}^{commit}`]).trim();
  const prefix = git(root, ['rev-parse', '--show-prefix']).replace(/\n$/, '');
  // Git's human-readable output quotes Unicode/control characters. NUL paths
  // retain the exact file name so unusual source files cannot evade coverage.
  const tracked = git(root, ['diff', '--name-only', '-z', resolved, '--', '.']).split('\0');
  const untracked = git(root, ['ls-files', '-z', '--others', '--exclude-standard', '--', '.']).split('\0');
  const files = [...tracked, ...untracked].filter(Boolean).map(f => prefix && f.startsWith(prefix) ? f.slice(prefix.length) : f);
  return { base: resolved, ...planChangedChecks(files, suites) };
}
export function sourceFingerprint(root, files) {
  const hash = createHash('sha256');
  const authority = ['package.json', 'harness/scenarios.json', 'harness/run.mjs', 'harness/coverage.mjs'];
  for (const file of [...new Set([...files, ...authority])].sort()) {
    if (/^(docs\/|brain-vault\/|graphify-out\/|tasks\/)/.test(file) || !runtime.test(file)) continue;
    const target = path.resolve(root, file);
    if (!target.startsWith(path.resolve(root) + path.sep)) throw Error('Source path is outside the project.');
    hash.update(file + '\0');
    if (!fs.existsSync(target)) { hash.update('deleted'); continue; }
    const info = fs.lstatSync(target);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 8 * 1024 * 1024) throw Error('Source fingerprint requires bounded ordinary files.');
    hash.update(fs.readFileSync(target));
  }
  return hash.digest('hex');
}
