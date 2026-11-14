import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { changedSourcePlan, sourceFingerprint } from "./coverage.mjs";
import { inspectCodeGraph, planImprovements } from "./evaluate.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const value = (key) =>
  args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
if (
  args.some(
    (arg, i) =>
      i % 2 === 0 && !["--suite", "--observation", "--out", "--base", "--plan-only"].includes(arg),
  ) ||
  args.length % 2
)
  throw Error(
    "Use --suite, --base, --plan-only, --observation and --out with explicit values.",
  );
const suites = JSON.parse(
  fs.readFileSync(new URL("./scenarios.json", import.meta.url)),
);
const selected = value("--suite");
if (new Set(args.filter((_, i) => i % 2 === 0)).size !== args.length / 2) throw Error("Duplicate options are not supported.");
if (value("--plan-only") && value("--plan-only") !== "true") throw Error("Use --plan-only true or omit it.");
const coverage = selected === "auto" ? changedSourcePlan(root, value("--base"), suites) : null;
const sourceBase = coverage?.base ?? "HEAD";
const fingerprintBefore = sourceFingerprint(root, changedSourcePlan(root, sourceBase, suites).changed);
if (selected && selected !== "all" && selected !== "auto" && !Object.hasOwn(suites, selected))
  throw Error("Choose a registered evaluation suite.");
const scripts = coverage ? coverage.scripts :
  selected === "all"
    ? [...new Set(Object.values(suites).flat())]
    : (suites[selected] ?? []);
const requiredFiles = [
  "app/go/[slug]/route.ts",
  "app/api/social/route.ts",
  "lib/discovery-qr-server.ts",
  "lib/discovery-intelligence-server.ts",
  "lib/discovery-relations-server.ts",
  "lib/contribution-pilot-server.ts",
  "lib/buyer-workspace-auth.ts",
  "lib/community-stories.ts",
  "lib/creator-attribution-server.ts",
];
const graph = inspectCodeGraph(
  JSON.parse(fs.readFileSync(path.join(root, "graphify-out/graph.json"))),
  requiredFiles,
);
const start = Date.now();
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).stdout?.trim() || "unknown";
const dirty = Boolean(
  spawnSync("git", ["status", "--porcelain"], {
    cwd: root,
    encoding: "utf8",
  }).stdout?.trim(),
);
// Run only version-controlled fixed npm scripts. Do not inherit production/provider credentials.
const env = Object.fromEntries(
  ["PATH", "HOME", "TMPDIR", "LANG", "SHELL", "USER"].flatMap((key) =>
    process.env[key] ? [[key, process.env[key]]] : [],
  ),
);
const observedPath = value("--observation");
if (observedPath && fs.statSync(observedPath).size > 65536)
  throw Error("Observation export is too large.");
const readObservation = () => { try { return JSON.parse(fs.readFileSync(observedPath, "utf8")); } catch { throw Error("Aggregate observation could not be read as valid JSON. No file content is included."); } };
const observation = observedPath
  ? readObservation()
  : {
      source: "unavailable",
      windowStart: "2026-11-01T00:00:00Z",
      windowEnd: "2026-11-08T00:00:00Z",
      unit: "browser_journey_target",
      complete: false,
      counts: null,
    };
const product = planImprovements(observation);
const out = value("--out");
const outputTarget = out ? path.join(fs.realpathSync(path.dirname(path.resolve(out))), path.basename(out)) : null;
if (outputTarget && (outputTarget.startsWith(root) || !outputTarget.endsWith(".json") || fs.existsSync(outputTarget))) throw Error("Save a new JSON report outside the source tree. Existing files are never overwritten.");
const logDir = fs.mkdtempSync(path.join(os.tmpdir(), "basedare-harness-"));
fs.chmodSync(logDir, 0o700);
const evaluations = [];
for (const script of value("--plan-only") || coverage?.passed === false ? [] : scripts) {
  if (!/^test:[a-z0-9:-]+$/.test(script) && script !== "safety:static")
    throw Error("Invalid registered command.");
  const log = path.join(logDir, script.replaceAll(":", "-") + ".log"),
    fd = fs.openSync(log, "w", 0o600),
    began = Date.now();
  const run = spawnSync("npm", ["run", script], {
    cwd: root,
    env,
    stdio: ["ignore", fd, fd],
    timeout: 600000,
  });
  fs.closeSync(fd);
  evaluations.push({
    script,
    status: run.status === 0 ? "PASS" : "FAIL",
    durationMs: Date.now() - began,
    exitCode: run.status, signal: run.signal, timedOut: run.error?.code === "ETIMEDOUT",
    log,
  });
  if (run.status !== 0) break;
}
const sourceUnchanged = (fingerprintBefore === sourceFingerprint(root, changedSourcePlan(root, sourceBase, suites).changed) && revision === spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout?.trim());
const report = {
  version: 2,
  at: new Date().toISOString(),
  revision,
  dirty,
  passed: graph.passed && (!coverage || coverage.passed) && sourceUnchanged && evaluations.every((e) => e.status === "PASS"),
  graph,
  coverage,
  sourceFingerprint: fingerprintBefore, sourceUnchanged,
  verificationScope: value("--plan-only") ? "PLAN_ONLY" : evaluations.length ? "REGISTERED_SCENARIOS" : "CODE_GRAPH_ONLY",
  releaseReady: false,
  requiredManualChecks: coverage?.requiredManualChecks ?? ["Verify affected user journeys and the exact release independently."],
  evaluations,
  product,
  productionAccess: false,
  automaticCodeChanges: false,
  mergeOrDeploy: false,
  durationMs: Date.now() - start,
};
const proposal = report.product.proposals[0];
report.draftPullRequest = { state: 'DRAFT', title: 'Investigate: ' + proposal.id, evidence: proposal.evidence, hypothesis: proposal.hypothesis, boundedChange: proposal.scope, successCriterion: proposal.successCriterion, validation: { revision, dirty, graphPassed: graph.passed, evaluations }, independentReviewRequired: true, founderReleaseApprovalRequired: true, automaticSubmission: false, note: 'Prepared brief only. No code change, PR, merge, release, outreach or product lift is inferred.' };
if (outputTarget) {
  fs.writeFileSync(outputTarget, JSON.stringify(report, null, 2) + "\n", {
    mode: 0o600,
    flag: "wx",
  });
  console.log("Harness report saved: " + out);
}
console.log(
  JSON.stringify({
    passed: report.passed,
    revision,
    dirty,
    verificationScope: report.verificationScope,
    sourceUnchanged,
    uncovered: coverage?.uncovered ?? [],
    releaseReady: false,
    codeGraph: graph.passed,
    evaluations: evaluations.length,
    productEvidence: observedPath
      ? "explicit aggregate export"
      : "unavailable; no product claim",
    proposals: report.product.proposals.map((p) => p.id),
  }),
);
if (!report.passed) process.exitCode = 1;
