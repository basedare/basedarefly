export type SprintLaunchPacketId =
  | 'creator-starter-pack'
  | 'sprint-operator-checklist'
  | 'venue-field-station-packet'
  | 'receipt-close';

export type SprintLaunchPacket = {
  id: SprintLaunchPacketId;
  eyebrow: string;
  title: string;
  plainEnglish: string;
  owner: string;
  outcome: string;
  nextActionHref: string;
  nextActionLabel: string;
  checklist: string[];
  scripts: Array<{
    label: string;
    copy: string;
  }>;
};

export const BASEDARE_CORE_POSITIONING = {
  oldLine: 'Give us one local question. We send verified people into the field and return proof.',
  recommendedLine: 'Turn real-world curiosity into playable proof.',
  supportingLine:
    'BaseDare turns the question into playable missions, routes contributors, verifies what happened, and attaches the receipt to the place.',
  core:
    'BaseDare is a playable social map for travellers, a performance-verified dare marketplace for creators, and a place-memory receipt engine for venues and brands.',
  shortLoop: 'fund question → player action → verified proof → place memory → receipt → repeat',
} as const;

export const SPRINT_LAUNCH_PACKETS: SprintLaunchPacket[] = [
  {
    id: 'creator-starter-pack',
    eyebrow: 'Packet 1',
    title: 'Creator Starter Pack',
    plainEnglish: 'Give each creator one clear thing to film, one link to share, and one proof angle.',
    owner: 'Creator lead',
    outcome: 'A creator can publish without explaining crypto, wallets, or internal BaseDare mechanics.',
    nextActionHref: '/admin/creator-drops',
    nextActionLabel: 'Create creator drop',
    checklist: [
      'Pick one creator and one concrete local hook.',
      'Choose the exact map action their viewers should open.',
      'Create a tracked creator link in Creator Drops.',
      'Give the creator one short caption, one short script, and one proof prompt.',
      'Tell them views are useful, but verified actions are what BaseDare measures.',
    ],
    scripts: [
      {
        label: 'Creator DM',
        copy:
          'I want you to narrate one real Siargao action, not run an ad. You post the story, viewers open your BaseDare link, and we measure who actually starts or completes the action.',
      },
      {
        label: 'Creator caption shape',
        copy:
          '“I found a live island mission. If you are nearby, open this and see if it is worth doing today.”',
      },
    ],
  },
  {
    id: 'sprint-operator-checklist',
    eyebrow: 'Packet 2',
    title: 'Sprint Operator Checklist',
    plainEnglish: 'Turn one buyer question into four independent checks and one conservative receipt.',
    owner: 'Sprint operator',
    outcome: 'A buyer receives a YES / NO / PARTIAL / INCONCLUSIVE answer with evidence, not vague exposure.',
    nextActionHref: '/admin/mission-control',
    nextActionLabel: 'Open mission control',
    checklist: [
      'Name one design partner and the exact question they care about.',
      'Choose the place or small area being tested.',
      'Choose two permissioned Field Station hosts only if they improve acquisition.',
      'Fund the creator pool before routing contributors.',
      'Route four independent contributors; never let one person answer the whole sprint.',
      'Review proof, record limitations, pay accepted contributors, and close with a receipt.',
    ],
    scripts: [
      {
        label: 'Buyer one-liner',
        copy:
          'Give us one local question. BaseDare turns it into four verified checks and returns a receipt you can actually make a decision from.',
      },
      {
        label: 'Question examples',
        copy:
          '“Is this venue visibly active between 7–9pm on Tuesday?” / “Which two cafés are actually laptop-friendly today?” / “Is this event still happening this week?”',
      },
    ],
  },
  {
    id: 'venue-field-station-packet',
    eyebrow: 'Packet 3',
    title: 'Venue / Field Station Packet',
    plainEnglish: 'Give a venue or station host one clear reason to place a QR and one truthful result afterwards.',
    owner: 'Venue lead',
    outcome: 'A host understands what the QR does, what it does not prove, and what result they will receive.',
    nextActionHref: '/admin/venue-scout-command',
    nextActionLabel: 'Open venue scout command',
    checklist: [
      'Get permission before placing any QR or table card.',
      'Use one promise only: tonight, mystery, social, reward, or free roam.',
      'Check local inventory before activating the QR; never route a “Tonight” scan to an empty map.',
      'Keep poster QR acquisition separate from secure venue QR/check-in proof.',
      'Report station-host interest separately from destination-venue verified outcomes.',
    ],
    scripts: [
      {
        label: 'Host pitch',
        copy:
          'This QR helps guests answer “what should I do next?” We will show you scans and useful actions. We will not call scans foot traffic.',
      },
      {
        label: 'Physical card',
        copy:
          'New here? PeeBear can fix your next two hours. Scan for the live island map. No download needed.',
      },
    ],
  },
  {
    id: 'receipt-close',
    eyebrow: 'Packet 4',
    title: 'Receipt Close',
    plainEnglish: 'End every experiment with what happened, what did not happen, and the next repeat ask.',
    owner: 'Founder / closer',
    outcome: 'A venue, buyer, or creator sees the value clearly enough to repeat or decline cleanly.',
    nextActionHref: '/admin/production-safety',
    nextActionLabel: 'Check launch readiness',
    checklist: [
      'Separate verified arrivals, accepted proof, paid contributors, and station scans.',
      'Include negative and inconclusive answers instead of hiding them.',
      'Show rights and limitations clearly; do not imply purchase or guaranteed traffic without evidence.',
      'Ask one repeat question, not a broad “do you want more?”',
      'Record the result in place memory when it is approved and useful.',
    ],
    scripts: [
      {
        label: 'Receipt close',
        copy:
          'Here is what BaseDare verified, what we could not verify, what it cost to learn it, and the cleanest next question to fund.',
      },
      {
        label: 'Repeat ask',
        copy:
          'Want us to run the same proof window again next week, or test a different question while the signal is fresh?',
      },
    ],
  },
];

export function getSprintLaunchPacket(id: SprintLaunchPacketId) {
  return SPRINT_LAUNCH_PACKETS.find((packet) => packet.id === id) ?? null;
}
