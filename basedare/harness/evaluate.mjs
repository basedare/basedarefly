// Deterministic analysis of aggregate evidence. No network, model, secrets or production writes.
export const STAGES = [
  "entries",
  "landings",
  "starts",
  "selfReportedFinishes",
  "shareActions",
  "verifiedCompletions",
];
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
  const add = (id, priority, evidence, hypothesis, scope, successCriterion) =>
    proposals.push({
      id,
      priority,
      evidence,
      hypothesis,
      scope,
      cost: "small, bounded change",
      expectedImpact: "Hypothesis only; no improvement has been measured.",
      successCriterion,
      approval:
        "Independent review and founder approval before merge/deployment. No financial, identity, moderation or consent-policy changes.",
    });
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
      return {
        evidenceSource: o.source,
        fixture: o.source === "fixture",
        observationComplete: true,
        rates: null,
        proposals,
        measuredImprovement: false,
      };
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
  return {
    evidenceSource: o.source,
    fixture: o.source === "fixture",
    observationComplete: o.complete,
    rates:
      o.complete && o.counts.landings
        ? { startsPerLanding: o.counts.starts / o.counts.landings }
        : null,
    proposals,
    measuredImprovement: false,
  };
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
