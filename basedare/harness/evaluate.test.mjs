import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  inspectCodeGraph,
  planImprovements,
  validateObservation,
} from "./evaluate.mjs";
const observation = (counts) => ({
  source: "fixture",
  windowStart: "2026-11-01T00:00:00Z",
  windowEnd: "2026-11-08T00:00:00Z",
  complete: true,
  unit: "browser_journey_target",
  counts,
});

test("incomparable cohorts yield only a measurement proposal, never a UX winner", () => {
  const result = planImprovements(observation({ ...counts, landings: 200 }));
  assert.deepEqual(
    result.proposals.map((p) => p.id),
    ["audit-stage-coverage"],
  );
  assert.equal(result.rates, null);
});
test("actual CLI rejects arbitrary suites and identities, writes a new private report and refuses overwrite", () => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "basedare-harness-selftest-"),
  );
  try {
    const input = path.join(dir, "observation.json"),
      out = path.join(dir, "report.json");
    fs.writeFileSync(input, JSON.stringify(observation(counts)));
    const run = (args) =>
      spawnSync(process.execPath, ["harness/run.mjs", ...args], {
        encoding: "utf8",
      });
    assert.notEqual(run(["--suite", "mainnet:deploy:v2"]).status, 0);
    const good = run(["--observation", input, "--out", out]);
    assert.equal(good.status, 0, good.stderr);
    const report = JSON.parse(fs.readFileSync(out));
    assert.equal(report.productionAccess, false);
    assert.equal(report.verificationScope, "CODE_GRAPH_ONLY");
    assert.equal(report.releaseReady, false);
    assert.equal(report.evaluations.length, 0);
    assert.match(report.sourceFingerprint, /^[a-f0-9]{64}$/);
    assert.equal(report.mergeOrDeploy, false);
    assert.equal(report.product.measuredImprovement, false);
    assert.equal(fs.statSync(out).mode & 0o777, 0o600);
    const before = fs.readFileSync(out, "utf8");
    assert.notEqual(run(["--observation", input, "--out", out]).status, 0);
    assert.equal(fs.readFileSync(out, "utf8"), before);
    fs.writeFileSync(
      input,
      JSON.stringify({ ...observation(counts), wallet: "private-canary" }),
    );
    const bad = run(["--observation", input]);
    assert.notEqual(bad.status, 0);
    assert.ok(!(bad.stdout+bad.stderr).includes("private-canary"));
    fs.writeFileSync(input,'{"broken":"private-canary');
    const malformed=run(["--observation",input]);assert.notEqual(malformed.status,0);assert.ok(!(malformed.stdout+malformed.stderr).includes("private-canary"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
const counts = {
  entries: 150,
  landings: 100,
  starts: 8,
  selfReportedFinishes: 4,
  shareActions: 1,
  verifiedCompletions: 0,
};

test("runner stops on failure, strips provider credentials and rejects evidence after source changes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basedare-runner-control-"));
  const root = path.join(dir, "source");
  const logs = [];
  try {
    for (const folder of ["harness", "graphify-out", "checks", "lib"]) fs.mkdirSync(path.join(root, folder), { recursive: true });
    for (const file of ["run.mjs", "coverage.mjs", "evaluate.mjs"]) fs.copyFileSync(path.join("harness", file), path.join(root, "harness", file));
    // The real maintained graph is an input, not a replacement for executed checks.
    fs.copyFileSync("graphify-out/graph.json", path.join(root, "graphify-out/graph.json"));
    fs.writeFileSync(path.join(root, "harness/scenarios.json"), JSON.stringify({ failure: ["test:fail", "test:after"], mutation: ["test:change"] }));
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { "test:fail": "node checks/fail.mjs", "test:after": "node checks/after.mjs", "test:change": "node checks/change.mjs" } }));
    fs.writeFileSync(path.join(root, "checks/fail.mjs"), "if(process.env.RESEND_API_KEY || process.env.DATABASE_URL) throw Error('unexpected provider access'); console.log('credential isolation checked'); process.exit(7);");
    fs.writeFileSync(path.join(root, "checks/after.mjs"), "import fs from 'node:fs'; fs.writeFileSync('must-not-run', 'unexpected');");
    fs.writeFileSync(path.join(root, "checks/change.mjs"), "import fs from 'node:fs'; fs.writeFileSync('lib/fixture.ts', 'export const value = 2;');");
    fs.writeFileSync(path.join(root, "lib/fixture.ts"), "export const value = 1;");
    const git = (...args) => { const result = spawnSync("git", args, { cwd: root, encoding: "utf8" }); assert.equal(result.status, 0, result.stderr); };
    git("init", "-q"); git("add", "."); git("-c", "user.name=Harness fixture", "-c", "user.email=fixture@example.invalid", "-c", "core.hooksPath=/dev/null", "commit", "-qm", "isolated runner fixture");
    const run = (suite) => {
      const out = path.join(dir, suite + ".json");
      const result = spawnSync(process.execPath, ["harness/run.mjs", "--suite", suite, "--out", out], { cwd: root, encoding: "utf8", env: { ...process.env, RESEND_API_KEY: "synthetic-canary", DATABASE_URL: "synthetic-canary" } });
      assert.notEqual(result.status, 0);
      const report = JSON.parse(fs.readFileSync(out));
      logs.push(...report.evaluations.map(entry => path.dirname(entry.log)));
      return report;
    };
    const failed = run("failure");
    assert.equal(failed.passed, false);
    assert.equal(failed.releaseReady, false);
    assert.equal(failed.evaluations.length, 1);
    assert.equal(failed.evaluations[0].exitCode, 7);
    assert.match(fs.readFileSync(failed.evaluations[0].log, "utf8"), /credential isolation checked/);
    assert.equal(fs.existsSync(path.join(root, "must-not-run")), false);
    const changed = run("mutation");
    assert.equal(changed.evaluations[0].status, "PASS");
    assert.equal(changed.sourceUnchanged, false);
    assert.equal(changed.passed, false);
  } finally {
    for (const log of new Set(logs)) fs.rmSync(log, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("a low-start fixture produces a hypothesis, never a claimed improvement or verified finish", () => {
  const result = planImprovements(observation(counts));
  assert.ok(result.proposals.some((p) => p.id === "simplify-first-action"));
  assert.equal(result.measuredImprovement, false);
  assert.equal(result.fixture, true);
  assert.equal(result.rates.startsPerLanding, 0.08);
  assert.match(JSON.stringify(result), /founder approval/);
});
test("incomplete evidence is unknown, never zero", () => {
  const result = planImprovements({ ...observation(null), complete: false });
  assert.equal(result.proposals[0].id, "repair-measurement");
  assert.equal(result.rates, null);
  assert.throws(() =>
    validateObservation({ ...observation(counts), complete: false }),
  );
});
test("small samples and incoherent stages are not conversion winners", () => {
  assert.ok(
    planImprovements(
      observation({
        ...counts,
        entries: 3,
        landings: 2,
        starts: 1,
        selfReportedFinishes: 0,
      }),
    ).proposals.some((p) => p.id === "collect-field-evidence"),
  );
  assert.equal(
    planImprovements(observation({ ...counts, starts: 120 })).proposals[0].id,
    "audit-stage-coverage",
  );
});
test("strict aggregate input rejects identities, surprising fields and invalid windows", () => {
  for (const extra of [
    { wallet: "private" },
    { email: "private" },
    { events: [] },
  ])
    assert.throws(() =>
      validateObservation({ ...observation(counts), ...extra }),
    );
  for (const bad of [-1, NaN, Infinity, 1.5])
    assert.throws(() =>
      validateObservation(observation({ ...counts, entries: bad })),
    );
  assert.throws(() =>
    validateObservation({ ...observation(counts), windowEnd: "bad" }),
  );
  assert.throws(() =>
    validateObservation(observation({ ...counts, secret: 1 })),
  );
});
test("Graphify guardian detects missing source files, dangling links and duplicate nodes", () => {
  const graph = { nodes: [{ id: "a", source_file: "app.ts" }], links: [] };
  assert.equal(inspectCodeGraph(graph, ["app.ts"]).passed, true);
  assert.equal(inspectCodeGraph(graph, ["missing.ts"]).passed, false);
  assert.equal(
    inspectCodeGraph({ ...graph, links: [{ source: "a", target: "missing" }] })
      .danglingEdges,
    1,
  );
  assert.equal(
    inspectCodeGraph({ ...graph, nodes: [...graph.nodes, ...graph.nodes] })
      .duplicateIds,
    1,
  );
});

test('absent telemetry requests evidence without diagnosing a broken funnel', () => {
  const result=planImprovements({...observation(null),source:'unavailable',complete:false});
  assert.deepEqual(result.proposals.map(p=>p.id),['provide-reviewed-evidence']); assert.equal(result.rates,null); assert.equal(result.measuredImprovement,false);
  assert.throws(()=>validateObservation({...observation(counts),source:'unavailable'}));
});

test("every planner path produces a reviewable bounded proposal and unmeasured guardrails", () => {
  const examples = [
    { ...observation(null), source: "unavailable", complete: false },
    { ...observation(null), complete: false },
    observation({ ...counts, starts: 120 }),
    observation({ ...counts, entries: 3, landings: 2, starts: 1, selfReportedFinishes: 0 }),
    observation(counts),
    observation({ ...counts, entries: 200, landings: 100, starts: 50, selfReportedFinishes: 20, shareActions: 0 }),
    observation({ ...counts, starts: 50, selfReportedFinishes: 30, shareActions: 10 }),
  ];
  const ids = new Set();
  for (const input of examples) {
    const before = JSON.stringify(input);
    const report = planImprovements(input);
    assert.equal(JSON.stringify(input), before, "analysis must not rewrite evidence");
    assert.equal(report.measuredImprovement, false);
    assert.equal(report.cohortComparability.automaticallyComparable, false);
    assert.match(report.statisticalInference, /triage heuristics, not significance tests/);
    for (const p of report.proposals) {
      ids.add(p.id);
      for (const field of ["observedProblem", "userImpact", "engineeringComplexity", "rollbackApproach"])
        assert.ok(p[field].length > 20, `${p.id} needs ${field}`);
      assert.equal(p.confidence.level, "low");
      assert.equal(p.confidence.statisticalProbability, null);
      assert.ok(p.uncertainty.length >= 3);
      assert.ok(p.safetyRisks.length >= 2);
      assert.ok(p.requiredTests.some((check) => check.includes("test:") || check.includes("--test")));
      assert.deepEqual(p.cohortComparability, report.cohortComparability);
      assert.ok(p.cohortComparability.requiredChecks.some((check) => check.includes("timezone")));
      assert.ok(p.guardrails.some((g) => g.metric.includes("completion quality")));
      assert.ok(p.guardrails.some((g) => g.metric.includes("complaints")));
      assert.ok(p.guardrails.some((g) => g.metric.includes("moderation burden")));
      assert.ok(p.guardrails.every((g) => g.status === "not_measured" && g.stopCondition.length > 20));
    }
  }
  assert.deepEqual([...ids].sort(), [
    "provide-reviewed-evidence", "repair-measurement", "audit-stage-coverage",
    "collect-field-evidence", "simplify-first-action", "inspect-landing-delivery",
    "test-voluntary-invitation", "retain-baseline",
  ].sort());
});

test("large coherent totals remain descriptive and cannot clear a comparison or guardrail gate", () => {
  const report = planImprovements(observation({
    entries: 1000000, landings: 1000000, starts: 1000000,
    selfReportedFinishes: 1000000, shareActions: 1000000, verifiedCompletions: 0,
  }));
  assert.equal(report.rates.startsPerLanding, 1);
  assert.deepEqual(report.proposals.map((p) => p.id), ["retain-baseline"]);
  assert.equal(report.measuredImprovement, false);
  assert.equal(report.cohortComparability.status, "not_assessed_from_aggregate");
  assert.ok(report.guardrails.every((g) => g.status === "not_measured"));
  assert.equal(report.proposals[0].confidence.statisticalProbability, null);
  assert.match(report.proposals[0].uncertainty.join(" "), /distinct participating individuals/);
});

test("complete measured zeros remain distinct from absent, partial or inapplicable counts", () => {
  const zeros = Object.fromEntries(Object.keys(counts).map((key) => [key, 0]));
  assert.equal(validateObservation(observation(zeros)).counts.verifiedCompletions, 0);
  const report = planImprovements(observation(zeros));
  assert.equal(report.observationComplete, true);
  assert.equal(report.rates, null, "zero denominator is undefined, never a zero rate");
  for (const badCounts of [null, { ...counts, starts: null }, { ...counts, verifiedCompletions: undefined }])
    assert.throws(() => validateObservation(observation(badCounts)));
  for (const addedField of ["people", "wvrp", "guardrails", "cohortComparable"])
    assert.throws(() => validateObservation({ ...observation(counts), [addedField]: 1 }));
  assert.throws(() => validateObservation(observation({ ...counts, people: 1 })));
});

test("all simple-funnel stage inversions require evidence audit while separate evidence stages stay separate", () => {
  for (const changes of [{ landings: 200 }, { starts: 120 }, { selfReportedFinishes: 20 }]) {
    const report = planImprovements(observation({ ...counts, ...changes }));
    assert.equal(report.rates, null);
    assert.deepEqual(report.proposals.map((p) => p.id), ["audit-stage-coverage"]);
    assert.equal(report.cohortComparability.automaticallyComparable, false);
  }
  const report = planImprovements(observation({ ...counts, shareActions: 20, verifiedCompletions: 10 }));
  assert.ok(!report.proposals.some((p) => p.id === "audit-stage-coverage"));
  assert.equal(report.rates.startsPerLanding, 0.08);
  assert.equal(report.measuredImprovement, false);
});

test("proposals are deterministic and do not share mutable review gates across calls", () => {
  const baseline = planImprovements(observation(counts));
  assert.deepEqual(planImprovements(observation(counts)), baseline);
  const edited = planImprovements(observation(counts));
  edited.guardrails[0].status = "PASS";
  edited.cohortComparability.requiredChecks.length = 0;
  edited.proposals[0].guardrails[0].status = "PASS";
  edited.proposals[0].cohortComparability.requiredChecks.length = 0;
  assert.deepEqual(planImprovements(observation(counts)), baseline);
});
