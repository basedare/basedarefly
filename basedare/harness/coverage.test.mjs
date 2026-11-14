import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { planChangedChecks, changedSourcePlan, sourceFingerprint } from './coverage.mjs';
const suites = JSON.parse(fs.readFileSync(new URL('./scenarios.json', import.meta.url)));
test('buyer privacy and shared wallet changes select real DB checks and deduplicate commands', () => {
  const p = planChangedChecks(['app/api/brands/route.ts', 'lib/wallet-action-auth-server.ts', 'app/brands/portal/ResponseRail.tsx'], suites);
  assert.equal(p.passed, true); assert.ok(p.scripts.includes('test:buyer-workspace:db'));
  assert.ok(p.suites.includes('social')); assert.equal(new Set(p.scripts).size, p.scripts.length);
  assert.ok(p.requiredManualChecks.some(x => x.includes('320px')));
});
test('unknown runtime code cannot quietly become a passing test plan', () => {
  const p = planChangedChecks(['app/unknown-feature/route.ts'], suites);
  assert.equal(p.passed, false); assert.deepEqual(p.uncovered, ['app/unknown-feature/route.ts']);
  assert.throws(() => planChangedChecks(['app/api/brands/route.ts'], {}), /missing or empty/);
});
test('documentation and graph generation never pretend to exercise a user journey', () => {
  const p = planChangedChecks(['docs/plan.md', 'graphify-out/graph.json'], suites);
  assert.deepEqual(p.scripts, []); assert.equal(p.passed, true);
});
test('actual Git comparison includes tracked edits, deletions and new code; content edits invalidate receipts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'basedare-quality-'));
  const git = (...args) => { const r=spawnSync('git',args,{cwd:root,encoding:'utf8'}); assert.equal(r.status,0,r.stderr); return r.stdout.trim(); };
  try {
    git('init','-q'); git('config','user.name','Fixture'); git('config','user.email','fixture@example.test');
    fs.mkdirSync(path.join(root,'lib'));fs.writeFileSync(path.join(root,'lib/buyer-workspace.ts'),'first');
    git('add','.');git('commit','-qm','fixture');
    fs.writeFileSync(path.join(root,'lib/buyer-workspace.ts'),'changed');fs.writeFileSync(path.join(root,'lib/new-feature.ts'),'new');
    const unusual = ['lib/é.ts', 'lib/line\nbreak.ts', 'lib/ space.ts'];
    for (const file of unusual) fs.writeFileSync(path.join(root,file),'unusual source');
    const p=changedSourcePlan(root,'HEAD',suites);
    assert.ok(p.changed.includes('lib/new-feature.ts'));assert.equal(p.passed,false);
    for (const file of unusual) { assert.ok(p.changed.includes(file)); assert.ok(p.uncovered.includes(file)); }
    const unusualBefore=sourceFingerprint(root,p.changed);fs.writeFileSync(path.join(root,'lib/é.ts'),'changed Unicode file');
    assert.notEqual(sourceFingerprint(root,p.changed),unusualBefore);
    const first=sourceFingerprint(root,p.changed);fs.writeFileSync(path.join(root,'lib/buyer-workspace.ts'),'changed again');
    assert.notEqual(sourceFingerprint(root,p.changed),first);
    fs.unlinkSync(path.join(root,'lib/buyer-workspace.ts'));
    assert.ok(changedSourcePlan(root,'HEAD',suites).changed.includes('lib/buyer-workspace.ts'));
    assert.throws(()=>changedSourcePlan(root,'--help',suites),/explicit Git/);
    assert.throws(()=>sourceFingerprint(root,['../secret.ts']),/outside/);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
