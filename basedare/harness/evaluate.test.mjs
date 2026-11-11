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
