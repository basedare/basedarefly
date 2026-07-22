import type {
  GrowthOperatingInputs,
  GrowthOsReport,
  GrowthQuest,
  GrowthRole,
  GrowthScoreInputs,
  GrowthScoreSignal,
  GrowthTarget,
} from './growth-os-types';

const SCORE_RULES = [
  {
    id: 'sprint-funded',
    label: 'Sprint funded',
    field: 'fundedSprints',
    pointsEach: 100,
    evidence: 'Funding is confirmed against the locked $2,500 Sprint economics.',
  },
  {
    id: 'sprint-completed',
    label: 'Buyer receipt completed',
    field: 'completedSprints',
    pointsEach: 200,
    evidence: 'A four-mission Sprint reached COMPLETE and produced its durable receipt.',
  },
  {
    id: 'buyer-repeat',
    label: 'Buyer requested a repeat',
    field: 'buyerRepeatRequests',
    pointsEach: 150,
    evidence: 'The buyer recorded a REPEAT decision; this is intent, not booked revenue.',
  },
  {
    id: 'dare-settled',
    label: 'Mission settled',
    field: 'settledDares',
    pointsEach: 20,
    evidence: 'Proof was accepted and the Dare reached a settled state.',
  },
  {
    id: 'place-memory',
    label: 'Place record approved',
    field: 'approvedPlaceRecords',
    pointsEach: 8,
    evidence: 'A reviewed place contribution became durable map intelligence.',
  },
  {
    id: 'station-arrival',
    label: 'Field Station arrival verified',
    field: 'verifiedStationArrivals',
    pointsEach: 12,
    evidence: 'A station-attributed journey reached the secure arrival boundary.',
  },
  {
    id: 'check-in',
    label: 'Venue check-in confirmed',
    field: 'confirmedCheckIns',
    pointsEach: 2,
    evidence: 'A confirmed check-in created presence signal; it is not a purchase claim.',
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  field: keyof GrowthScoreInputs;
  pointsEach: number;
  evidence: string;
}>;

const LEVELS = [
  { label: 'Scout', minimum: 0 },
  { label: 'Operator', minimum: 100 },
  { label: 'Closer', minimum: 300 },
  { label: 'Grid Builder', minimum: 600 },
] as const;

export function buildGrowthScore(inputs: GrowthScoreInputs) {
  const signals: GrowthScoreSignal[] = SCORE_RULES.map((rule) => {
    const count = Math.max(0, Math.floor(inputs[rule.field]));
    return {
      id: rule.id,
      label: rule.label,
      count,
      pointsEach: rule.pointsEach,
      points: count * rule.pointsEach,
      evidence: rule.evidence,
    };
  });
  const total = signals.reduce((sum, signal) => sum + signal.points, 0);
  const levelIndex = LEVELS.findLastIndex((level) => total >= level.minimum);
  const level = LEVELS[Math.max(0, levelIndex)];
  const nextLevel = LEVELS[levelIndex + 1] ?? null;

  return {
    total,
    level: level.label,
    nextLevel: nextLevel?.label ?? null,
    nextLevelAt: nextLevel?.minimum ?? null,
    pointsToNextLevel: nextLevel ? Math.max(0, nextLevel.minimum - total) : 0,
    signals,
  };
}

function sprintQuest(inputs: GrowthOperatingInputs): GrowthQuest | null {
  const sprint = inputs.activeSprint;
  if (!sprint) return null;

  if (sprint.status === 'DRAFT') {
    return {
      id: 'advance-draft-sprint',
      title: `Turn ${sprint.buyerLabel}'s question into funded work`,
      lane: 'buyer',
      owner: 'Founder / closer',
      priority: 92,
      status: 'ready',
      why: 'A scoped Sprint is closer to revenue than new cold prospecting.',
      definitionOfDone: 'Buyer approves the bounded question and funding is confirmed against the locked economics.',
      evidence: [sprint.question, `${sprint.missionCount} independent missions planned`],
      href: '/admin/field-sprints',
      scoreOutcome: '+100 only after funding is actually confirmed.',
      approvalGate: 'Founder approves scope, price, contract, and funding confirmation.',
    };
  }

  if (sprint.status === 'FUNDED' || sprint.status === 'ROUTING') {
    return {
      id: 'route-funded-sprint',
      title: `Route ${sprint.missionCount} independent contributors`,
      lane: 'supply',
      owner: 'Contributor router',
      priority: 96,
      status: 'ready',
      why: 'Funded demand is the highest-value supply task in the system.',
      definitionOfDone: 'Every Sprint contract has one eligible, distinct contributor and a real escrow link.',
      evidence: [sprint.question, `Sprint state: ${sprint.status}`],
      href: '/admin/field-sprints',
      scoreOutcome: '+20 per mission only after accepted proof settles.',
      approvalGate: 'Founder or authorized ops approves assignments; no operator may approve their own proof.',
    };
  }

  if (sprint.status === 'COLLECTING') {
    return {
      id: 'collect-funded-sprint',
      title: 'Get every funded mission to proof',
      lane: 'supply',
      owner: 'Contributor router',
      priority: 97,
      status: 'ready',
      why: 'The buyer has paid; contributor follow-through now determines time-to-receipt.',
      definitionOfDone: 'All four contributors submit server-pinned evidence inside the freshness window.',
      evidence: [sprint.question, `Sprint state: ${sprint.status}`],
      href: '/admin/field-sprints',
      scoreOutcome: 'No points for chasing; points appear only after verified settlement.',
      approvalGate: 'Proof acceptance and payouts remain with independent verifier/ops.',
    };
  }

  return {
    id: 'close-sprint-review',
    title: 'Close review and issue the buyer receipt',
    lane: 'trust',
    owner: 'Verifier / ops',
    priority: 99,
    status: 'ready',
    why: 'A nearly complete Sprint has more leverage than any new campaign.',
    definitionOfDone: 'Four independent outcomes are accepted and settled, limitations are visible, and the receipt reaches COMPLETE.',
    evidence: [sprint.question, `Sprint state: ${sprint.status}`],
    href: '/admin/field-sprints',
    scoreOutcome: '+200 when the complete receipt is durably issued.',
    approvalGate: 'Growth staff cannot accept proof, settle payouts, or change outcome labels.',
  };
}

export function buildGrowthQuests(inputs: GrowthOperatingInputs): GrowthQuest[] {
  const quests: GrowthQuest[] = [];

  if (inputs.reviewQueue > 0 || inputs.payoutBacklog > 0) {
    quests.push({
      id: 'clear-trust-money',
      title: 'Clear trust and money before adding demand',
      lane: inputs.payoutBacklog > 0 ? 'money' : 'trust',
      owner: 'Verifier / ops',
      priority: 100,
      status: 'ready',
      why: 'Unreviewed proof and queued payouts destroy contributor trust faster than marketing can rebuild it.',
      definitionOfDone: 'Every due proof has an independent decision and every payable result has an authoritative settlement state.',
      evidence: [`${inputs.reviewQueue} proof reviews`, `${inputs.payoutBacklog} payouts queued`],
      href: '/admin/daily-command-loop',
      scoreOutcome: 'No points for clicking through a queue; settled missions score from their final state.',
      approvalGate: 'Only authorized reviewers and settlement operators may decide proof or money.',
    });
  }

  const activeSprintQuest = sprintQuest(inputs);
  if (activeSprintQuest) quests.push(activeSprintQuest);

  if (inputs.completedSprintAwaitingDecision) {
    quests.push({
      id: 'ask-for-repeat',
      title: `Ask ${inputs.completedSprintAwaitingDecision.buyerLabel} for the next decision`,
      lane: 'buyer',
      owner: 'Founder / closer',
      priority: 90,
      status: 'ready',
      why: 'A buyer with a completed receipt is the warmest commercial lead BaseDare can have.',
      definitionOfDone: 'Buyer records REPEAT, ADJUST, ASK, or STOP from the receipt; no ambiguous “sounds good” remains.',
      evidence: [`Completed receipt ${inputs.completedSprintAwaitingDecision.receiptCode}`],
      href: `/field-sprints/${inputs.completedSprintAwaitingDecision.receiptCode}`,
      scoreOutcome: '+150 for REPEAT intent; it is still not booked revenue until funding is confirmed.',
      approvalGate: 'Founder approves the external message and any price or scope commitment.',
    });
  }

  if (!inputs.activeSprint) {
    quests.push({
      id: 'create-buyer-question',
      title: 'Convert one real buyer problem into one bounded question',
      lane: 'buyer',
      owner: 'Growth administrator',
      priority: 86,
      status: 'ready',
      why: 'BaseDare sells verified answers, not generic exposure.',
      definitionOfDone: 'One qualified decision-maker replies, names a place question, and accepts a next meeting or scope review.',
      evidence: [
        `${inputs.activeActivationIntakes} active buyer intakes`,
        `${inputs.activeVenueLeads} active venue leads`,
      ],
      href: inputs.activeActivationIntakes > 0 ? '/admin/activation-intakes' : '/admin/venue-scout-command',
      scoreOutcome: 'No points for messages sent. The first scored state is confirmed Sprint funding.',
      approvalGate: 'Operator drafts and schedules; founder approves offers, pricing, and commitments.',
    });
  }

  if (inputs.activeCreators < 4) {
    quests.push({
      id: 'confirm-contributor-bench',
      title: 'Build a four-person route-ready contributor bench',
      lane: 'supply',
      owner: 'Contributor router',
      priority: 78,
      status: 'ready',
      why: 'A Sprint cannot produce four independent answers without four distinct reliable people.',
      definitionOfDone: 'Four contributors confirm area, availability, wallet readiness, proof capability, and no conflict with the buyer.',
      evidence: [`${inputs.activeCreators} active creators currently visible`],
      href: '/admin/creator-captains',
      scoreOutcome: 'No points for roster size; each accepted and settled mission earns +20.',
      approvalGate: 'Assignments remain bounded; contributors never approve their own work.',
    });
  }

  quests.push({
    id: 'station-health',
    title: 'Keep two Field Station entry points honest',
    lane: 'distribution',
    owner: 'Field Station keeper',
    priority: inputs.verifiedStationArrivals > 0 ? 55 : 72,
    status: inputs.fieldStationCount > 0 ? 'ready' : 'blocked',
    why: 'A physical scan only compounds growth when the QR works and the promised nearby inventory is real.',
    definitionOfDone: 'Two permissioned stations pass QR, physical-condition, destination-density, and mobile-handoff checks.',
    evidence: [
      `${inputs.fieldStationCount} configured stations`,
      `${inputs.verifiedStationArrivals} verified station arrivals in the score period`,
    ],
    href: '/admin/field-stations',
    scoreOutcome: '+12 only when a station-attributed journey reaches verified arrival.',
    approvalGate: 'Physical placement requires venue permission; poster scans never prove presence.',
  });

  if (inputs.dailyCommand) {
    quests.push({
      id: 'brain-command',
      title: inputs.dailyCommand.title,
      lane: 'buyer',
      owner: 'Growth administrator',
      priority: 60,
      status: 'ready',
      why: inputs.dailyCommand.why,
      definitionOfDone: inputs.dailyCommand.nextAction,
      evidence: inputs.dailyCommand.evidence,
      href: inputs.dailyCommand.href,
      scoreOutcome: 'Only the resulting verified outcome can change the Growth score.',
      approvalGate: 'Respect the risk label and approval boundary on the Daily Command Loop.',
    });
  }

  return quests.sort((a, b) => b.priority - a.priority).slice(0, 6);
}

export function buildGrowthTargets(inputs: GrowthScoreInputs): GrowthTarget[] {
  return [
    { id: 'funded-sprint', label: 'Fund one Sprint', current: inputs.fundedSprints, target: 1, unit: 'Sprint', evidence: 'fundedAt + confirmed economics' },
    { id: 'settled-missions', label: 'Settle four missions', current: inputs.settledDares, target: 4, unit: 'missions', evidence: 'verified/paid/completed Dare state' },
    { id: 'buyer-receipt', label: 'Deliver one receipt', current: inputs.completedSprints, target: 1, unit: 'receipt', evidence: 'VerifiedFieldSprint COMPLETE' },
    { id: 'repeat-decision', label: 'Get one repeat decision', current: inputs.buyerRepeatRequests, target: 1, unit: 'decision', evidence: 'buyer chose REPEAT' },
    { id: 'place-memory', label: 'Approve four place records', current: inputs.approvedPlaceRecords, target: 4, unit: 'records', evidence: 'approved place-memory rows' },
    { id: 'station-arrivals', label: 'Verify four station arrivals', current: inputs.verifiedStationArrivals, target: 4, unit: 'arrivals', evidence: 'station-attributed secure arrivals' },
  ];
}

export function growthRoles(): GrowthRole[] {
  return [
    {
      id: 'founder-closer',
      title: 'Founder / closer',
      mission: 'Turn verified buyer pain into approved scope, funding, receipts, and repeats.',
      dailyOutputs: ['One buyer conversation', 'One concrete next decision', 'Every external commitment approved'],
      allowed: ['Discovery calls', 'Scope and price approval', 'Invoices and partner commitments'],
      forbidden: ['Inflating outcomes', 'Calling intent revenue', 'Bypassing proof or payout rails'],
      successMetric: 'Funded Sprints, completed receipts, and funded repeats.',
    },
    {
      id: 'growth-admin',
      title: 'Growth administrator',
      mission: 'Research, prepare, and advance qualified buyer and venue conversations.',
      dailyOutputs: ['10 researched targets', '5 personal drafts', '3 follow-ups', 'Clean next steps on every active lead'],
      allowed: ['Research', 'Drafting', 'CRM hygiene', 'Scheduling', 'Preparing receipt-led follow-ups'],
      forbidden: ['Sending unapproved claims', 'Changing price', 'Signing contracts', 'Confirming money', 'Using the global admin secret'],
      successMetric: 'Qualified replies and meetings that become scoped buyer questions.',
    },
    {
      id: 'contributor-router',
      title: 'Contributor router',
      mission: 'Maintain a reliable, conflict-free bench and move funded work to evidence.',
      dailyOutputs: ['Availability confirmations', 'Mission fit checks', 'Submission reminders', 'Blockers escalated'],
      allowed: ['Recruiting', 'Readiness checks', 'Routing recommendations', 'Contributor support'],
      forbidden: ['Approving proof', 'Changing rewards', 'Triggering payouts', 'Promising assignments'],
      successMetric: 'Time from funded mission to valid submission and settled completion.',
    },
    {
      id: 'station-keeper',
      title: 'Field Station keeper',
      mission: 'Keep permissioned physical entry points working and their promises truthful.',
      dailyOutputs: ['QR scan check', 'Damage/tamper check', 'Inventory check', 'Photo health record'],
      allowed: ['Permissioned maintenance', 'QR testing', 'Inventory reporting', 'Placement notes'],
      forbidden: ['Unapproved placements', 'Treating scans as arrivals', 'Changing offers', 'Concealed local employment'],
      successMetric: 'Healthy scans that progress to target opens and verified arrivals.',
    },
    {
      id: 'verifier-ops',
      title: 'Verifier / ops',
      mission: 'Protect evidence quality, contributor trust, and truthful settlement.',
      dailyOutputs: ['Review SLA cleared', 'Payout states reconciled', 'Rejected evidence explained', 'Receipts limitations checked'],
      allowed: ['Independent review', 'Sentinel escalation', 'Settlement operations', 'Receipt QA'],
      forbidden: ['Growth quotas influencing decisions', 'Self-review', 'Changing buyer outcomes to please sales'],
      successMetric: 'Accurate decisions, fast settlement, and zero duplicated or concealed outcomes.',
    },
  ];
}

export function buildGrowthOsReport(
  inputs: GrowthOperatingInputs,
  period: GrowthOsReport['period'],
  generatedAt: string
): GrowthOsReport {
  const score = buildGrowthScore(inputs);
  const today = buildGrowthQuests(inputs);
  const leadQuest = today[0];

  return {
    generatedAt,
    period,
    score,
    headline: {
      title: leadQuest?.title ?? 'Create one verified outcome',
      detail: leadQuest?.why ?? 'The system is quiet. Start from one buyer question, not a broad campaign.',
    },
    today,
    weeklyTargets: buildGrowthTargets(inputs),
    roles: growthRoles(),
    antiGamingRules: [
      'Messages sent, followers, impressions, scans, drafts, and dashboards opened earn zero points.',
      'A direction click or Mission Pass is intent—not an arrival, completion, or sale.',
      'Negative and inconclusive field answers count as valid delivery when evidence is accepted.',
      'Buyer REPEAT is intent; only confirmed funding counts as revenue.',
      'Growth staff never approve their own proof, trigger payouts, or rewrite outcome labels.',
    ],
    approvalGates: [
      'Founder: pricing, contracts, invoices, buyer scope, venue promises, and external sends.',
      'Verifier / ops: evidence decisions, Sentinel escalation, settlement, payout, and receipt truth.',
      'Venue: physical placement, perks, official contacts, ambassador permissions, and commercial reuse.',
      'Legal review: sponsor commercial-reuse terms before the first sponsor-usable deliverable.',
    ],
    operatingCadence: {
      daily: [
        { block: 'Read the field', minutes: 20, output: 'Open queues, one bottleneck, and today’s top three quests.' },
        { block: 'Buyer pipeline', minutes: 90, output: '10 researched targets, 5 personal drafts, 3 follow-ups, 1 real conversation.' },
        { block: 'Contributor bench', minutes: 45, output: 'Availability and readiness confirmed for every funded or likely mission.' },
        { block: 'Sprint delivery', minutes: 60, output: 'One funded-work blocker removed; evidence and receipt path advanced.' },
        { block: 'Distribution health', minutes: 30, output: 'Two digital/physical entry points checked; no empty promises left live.' },
        { block: 'Log and learn', minutes: 15, output: 'Next steps, objections, evidence, and one rule to repeat/iterate/kill.' },
      ],
      weekly: [
        { day: 'Monday', command: 'Choose the bottleneck', output: 'One buyer segment, one question family, one score target.' },
        { day: 'Tuesday', command: 'Create conversations', output: 'Founder calls plus operator-prepared outreach and follow-ups.' },
        { day: 'Wednesday', command: 'Route the field', output: 'Contributors confirmed and funded missions moving.' },
        { day: 'Thursday', command: 'Close evidence', output: 'Proof reviewed, payouts reconciled, receipt limitations checked.' },
        { day: 'Friday', command: 'Deliver and ask', output: 'Receipt sent; buyer chooses repeat, adjust, ask, or stop.' },
        { day: 'Weekend', command: 'Strengthen density', output: 'Field Stations, map inventory, and contributor availability checked.' },
      ],
    },
  };
}
