// Deterministic analysis of aggregate evidence. No network, model, secrets or production writes.
export const STAGES = [
  "entries",
  "landings",
  "starts",
  "selfReportedFinishes",
  "shareActions",
  "verifiedCompletions",
];

// These checks are review requirements, not facts inferred from six totals.
const COMPARABILITY_CHECKS = [
  "Review export provenance, completeness, stage definitions and deduplication at the same revision.",
  "Match destination eligibility, inventory, channel/QR placement, device/network mix, consent and attribution rules.",
  "Match window duration, destination timezone, weekday/time and follow-up opportunity; record releases and seasonality.",
  "Account for repeat browser journeys, bots, frozen intents and missing renders; do not equate journeys with distinct people.",
  "Predeclare the primary outcome, denominator, comparison method and stopping rule; report sample sizes, uncertainty and confounders.",
];
const GUARDRAILS = [
  {
    metric: "completion quality and verification",
    stopCondition: "Any bypass of eligibility, existing review rules or a self-report presented as verified evidence.",
  },
  {
    metric: "complaints, consent and privacy",
    stopCondition: "Any consent/withdrawal failure, unauthorized disclosure, forced sharing or unwanted contact.",
  },
  {
    metric: "moderation burden and reliability",
    stopCondition: "An authorization/availability regression, broken guest start/resume, or material support/review burden beyond the predeclared limit.",
  },
];
const PROPOSAL_DETAILS = {
  "provide-reviewed-evidence": {
    observedProblem: "Approved product evidence is unavailable; product friction is unknown.",
    userImpact: "Avoid changing a working journey on an unsupported diagnosis.",
    complexity: "Review an existing export; implementation effort is unknown until a real source issue is found.",
    risk: "Mistaking absent telemetry for zero participation or inventing a new collector.",
    tests: ["node --test harness/evaluate.test.mjs"],
    rollback: "Discard the proposed diagnosis and retain the current product; preserve the unavailable-evidence record.",
  },
  "repair-measurement": {
    observedProblem: "The supplied observation is incomplete, so rates cannot be assessed.",
    userImpact: "Restore honest diagnosis without adding tracking or changing participation.",
    complexity: "Bounded report investigation; repair effort requires source inspection.",
    risk: "Publishing partial counts as a complete cohort or expanding private-data collection.",
    tests: ["npm run test:adventure-sharing:db"],
    rollback: "Revert only the report repair; keep incomplete observations unknown and retain historical evidence.",
  },
  "audit-stage-coverage": {
    observedProblem: "Stage ordering is incoherent for a simple funnel; cohort coverage needs review.",
    userImpact: "Prevent an unsupported UX change driven by incompatible denominators.",
    complexity: "Bounded stage/attribution investigation; no UX implementation is justified yet.",
    risk: "Fabricated backfill or treating independently recorded stages as one verified funnel.",
    tests: ["npm run test:adventure-sharing:db"],
    rollback: "Retain the existing UX and original exports; revert any invalid report change without rewriting events.",
  },
  "collect-field-evidence": {
    observedProblem: "Counts fall below the planner's descriptive triage thresholds.",
    userImpact: "Find actual first-action friction through consented observation before choosing a variant.",
    complexity: "Small qualitative study using the existing journey; no new collector or experiment service.",
    risk: "Selection bias, collecting identities unnecessarily or treating a small sample as a conversion winner.",
    tests: ["npm run test:usability", "npm run test:adventure-sharing:db"],
    rollback: "Stop the study, retain sanitized negative/inconclusive findings and leave the product baseline in place.",
  },
  "simplify-first-action": {
    observedProblem: "Observed starts per landing are below the planner's descriptive triage threshold.",
    userImpact: "A clearer existing action could help a guest understand and start an eligible activity.",
    complexity: "One existing action or copy change; inspect scope before estimating effort.",
    risk: "Hiding eligibility/effort, adding sign-in friction or breaking saved guest progress.",
    tests: ["npm run test:discovery", "npm run test:usability", "npm run test:adventure-sharing:db"],
    rollback: "Revert the single UI/copy change to the recorded baseline revision; preserve guest progress and attribution history.",
  },
  "inspect-landing-delivery": {
    observedProblem: "Recorded landings per entry are below the planner's descriptive triage threshold.",
    userImpact: "A real redirect/render failure could prevent someone reaching a useful destination.",
    complexity: "Bounded redirect/render and low-bandwidth device investigation before any fix.",
    risk: "Equating scans with people, bypassing paused-source controls or collecting more location data.",
    tests: ["npm run test:adventure-sharing:db", "npm run test:usability"],
    rollback: "Revert a confirmed delivery fix if reliability regresses; never reactivate revoked links or alter historical attribution.",
  },
  "test-voluntary-invitation": {
    observedProblem: "Recorded share actions per self-reported finish are below a descriptive triage threshold.",
    userImpact: "A clearer optional invitation could help a consenting recipient find an activity.",
    complexity: "One existing invitation action/copy change; no messaging or rewards service.",
    risk: "Forced sharing, unwanted messages, self-referrals or presenting a share click as a recipient start.",
    tests: ["npm run test:adventure-sharing:db", "npm run test:usability"],
    rollback: "Restore the previous invitation copy/action; keep sharing voluntary and preserve prior links and evidence.",
  },
  "retain-baseline": {
    observedProblem: "No preset friction threshold was crossed; actual product quality remains uncertain.",
    userImpact: "Preserve the current journey while seeking qualitative feedback and comparable later evidence.",
    complexity: "Evidence review only; no product implementation proposed.",
    risk: "Mistaking absence of a flag for success or ignoring complaints and missing evidence.",
    tests: ["node --test harness/evaluate.test.mjs"],
    rollback: "No product change to revert; record later contradictory evidence rather than deleting this decision.",
  },
};
export function validateObservation(input) {
  const allowed = [
    "source",
    "windowStart",
    "windowEnd",
    "complete",
    "unit",
    "counts",
  ];
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((k) => !allowed.includes(k))
  )
    throw Error("Only the approved aggregate observation fields are accepted.");
  if (
    !["admin-free-adventure-qr", "fixture", "unavailable"].includes(input.source) ||
    input.unit !== "browser_journey_target"
  )
    throw Error("Unknown source or measurement unit.");
  const from = Date.parse(input.windowStart),
    to = Date.parse(input.windowEnd);
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    from >= to ||
    to - from > 91 * 86400000 ||
    typeof input.complete !== "boolean"
  )
    throw Error("A valid bounded observation window is required.");
  if (input.source === "unavailable" && input.complete) throw Error("Unavailable evidence cannot be complete.");
  if (!input.complete) {
    if (input.counts !== null)
      throw Error("Incomplete observations must not publish counts.");
    return input;
  }
  if (
    !input.counts ||
    Object.keys(input.counts).length !== STAGES.length ||
    STAGES.some(
      (k) =>
        !Number.isSafeInteger(input.counts[k]) ||
        input.counts[k] < 0 ||
        input.counts[k] > 10000000,
    )
  )
    throw Error("Complete observations need all six bounded aggregate counts.");
  if (Object.keys(input.counts).some((k) => !STAGES.includes(k)))
    throw Error("Unexpected count field.");
  return input;
}
export function planImprovements(observation) {
  const o = validateObservation(observation),
    proposals = [];
  const comparison = () => ({
    status: "not_assessed_from_aggregate",
    automaticallyComparable: false,
    requiredChecks: [...COMPARABILITY_CHECKS],
  });
  const guardrails = () => GUARDRAILS.map((g) => ({ ...g, status: "not_measured" }));
  const result = (rates) => ({
    evidenceSource: o.source,
    fixture: o.source === "fixture",
    observationComplete: o.complete,
    rates,
    proposals,
    cohortComparability: comparison(),
    guardrails: guardrails(),
    statisticalInference: "Not estimated: aggregate stage totals do not establish comparable cohorts or independent trials. Thresholds are triage heuristics, not significance tests.",
    measuredImprovement: false,
  });
  const add = (id, priority, evidence, hypothesis, scope, successCriterion) => {
    const details = PROPOSAL_DETAILS[id];
    proposals.push({
      id,
      priority,
      observedProblem: details.observedProblem,
      evidence,
      hypothesis,
      confidence: {
        level: "low",
        basis: o.source === "fixture"
          ? "Synthetic fixture demonstrates a rule, not evidence about real users."
          : "Deterministic triage only; product-effect confidence needs reviewed field evidence.",
        statisticalProbability: null,
      },
      uncertainty: [
        "No causal effect, measured lift or conversion winner is established.",
        "Cohort selection, duplicates, attribution, consent and technical delivery can change the observed ratios.",
        "Guardrail outcomes and distinct participating individuals are not available in this aggregate schema.",
      ],
      userImpact: details.userImpact,
      scope,
      cost: "Bounded investigation; confirm implementation effort during source review.",
      engineeringComplexity: details.complexity,
      safetyRisks: [details.risk, "Preserve financial, identity, moderation, consent and current-source safety gates."],
      expectedImpact: "Hypothesis only; no improvement has been measured.",
      successCriterion,
      requiredTests: [...details.tests, "Manual 320px/390px and keyboard/real-phone checks where UI changes; automated checks do not establish device/provider acceptance."],
      rollbackApproach: details.rollback,
      cohortComparability: comparison(),
      guardrails: guardrails(),
      approval:
        "Independent review and founder approval before merge/deployment. No financial, identity, moderation or consent-policy changes.",
    });
  };
  if (o.source === "unavailable")
    add("provide-reviewed-evidence", "P1", ["No approved aggregate observation was supplied."], "Product friction cannot be assessed without comparable evidence.", "Export the existing bounded report and review its provenance; do not add a collector or infer a product fault.", "A reviewed aggregate export, or an explicit record that field evidence is still unavailable.");
  else if (!o.complete)
    add(
      "repair-measurement",
      "P0",
      ["Observation is incomplete; counts are unavailable."],
      "A source limit or failed read prevents trustworthy comparison.",
      "Repair or narrow the existing report; do not add tracking or infer a zero.",
      "A bounded, complete export with unchanged privacy rules.",
    );
  else {
    const c = o.counts;
    if (
      c.landings > c.entries ||
      c.starts > c.landings ||
      c.selfReportedFinishes > c.starts
    ) {
      add(
        "audit-stage-coverage",
        "P0",
        [c],
        "Independent stage events, missing renders or frozen attribution may make funnel stages incomparable.",
        "Inspect the existing journey/touch scoping and event semantics before changing UX.",
        "Document comparable cohorts and pass the real local attribution tests; no fabricated backfill.",
      );
      return result(null);
    }
    if (c.entries < 30 || c.landings < 20)
      add(
        "collect-field-evidence",
        "P1",
        [c],
        "The sample is too small to choose a conversion winner.",
        "Observe consenting Siargao users scanning, opening and starting; record friction without private identities.",
        "A documented field observation and enough comparable qualified landings for a bounded experiment.",
      );
    else if (c.starts / c.landings < 0.2)
      add(
        "simplify-first-action",
        "P1",
        [`${c.starts} starts from ${c.landings} client-reported landings`],
        "The first action may be unclear or slow; this is not proof of causality.",
        "Test one clearer existing start action, preserving guest progress, consent and review.",
        "Compare starts per qualified landing over matched source/window/device conditions; report sample sizes and uncertainty.",
      );
    if (c.entries >= 30 && c.landings / c.entries < 0.6)
      add(
        "inspect-landing-delivery",
        "P1",
        [
          `${c.landings} landings from ${c.entries} browser-journey/target entries`,
        ],
        "Bots, network conditions, consent or rendering gaps may explain missing landing events.",
        "Check existing redirect/render timing and a real low-bandwidth phone before adding telemetry.",
        "Reproduce or rule out a technical failure; do not equate entries with people or presence.",
      );
    if (
      c.selfReportedFinishes >= 20 &&
      c.shareActions / c.selfReportedFinishes < 0.1
    )
      add(
        "test-voluntary-invitation",
        "P2",
        [
          `${c.shareActions} share actions after ${c.selfReportedFinishes} self-reported finishes`,
        ],
        "A clearer voluntary invitation may help another person try the activity.",
        "Use existing invitation links; no automatic messaging, forced posting or referral reward.",
        "Compare independent recipient starts, not clipboard clicks, delivered messages or revenue.",
      );
    if (!proposals.length)
      add(
        "retain-baseline",
        "P2",
        [c],
        "No preset friction threshold has been crossed; absence of a flag is not product perfection.",
        "Keep the current experience and inspect qualitative feedback.",
        "Record a comparable later observation before proposing a change.",
      );
  }
  return result(
    o.complete && o.counts.landings
      ? { startsPerLanding: o.counts.starts / o.counts.landings }
      : null,
  );
}
export function inspectCodeGraph(graph, requiredFiles = []) {
  if (!Array.isArray(graph?.nodes) || !Array.isArray(graph?.links))
    throw Error("Graphify code graph is unavailable.");
  const ids = new Set(graph.nodes.map((n) => n.id)),
    files = new Set(graph.nodes.map((n) => n.source_file));
  const duplicateIds = graph.nodes.length - ids.size,
    danglingEdges = graph.links.filter(
      (e) => !ids.has(e.source) || !ids.has(e.target),
    ).length;
  const missingFiles = requiredFiles.filter((f) => !files.has(f));
  return {
    kind: "code_graph_only",
    nodes: ids.size,
    edges: graph.links.length,
    duplicateIds,
    danglingEdges,
    missingFiles,
    passed: duplicateIds === 0 && danglingEdges === 0 && !missingFiles.length,
    meaning:
      "Graphify indexes code. This does not establish runtime product relationships, participation or revenue.",
  };
}
