# BaseDare Brain Tools, Permissions, and Scorecards

## Purpose

This document defines the operating boundaries for a growth-focused BaseDare Brain:
- what tools it should have
- what it may do automatically
- what must be reviewed
- how success should be measured

The main goal is to create leverage without creating avoidable brand, legal, or operational risk.

## Tooling Layers

### 1. Research Tools

Purpose:
- discover creators
- discover venues
- monitor scenes, cities, and events
- gather context before outreach

Recommended tools:
- web search
- social profile lookup
- venue website and directory scraping
- event-listing monitoring
- competitor and category monitoring

Allowed to auto-use:
- yes

### 2. Memory and CRM Tools

Purpose:
- store leads
- store contact states
- store notes and objections
- record outcomes
- prevent repeat work

Recommended tools:
- lead database or CRM
- structured memory store
- spreadsheet sync
- note store for learnings

Allowed to auto-use:
- yes, for append, update, and dedupe

### 3. Content and Drafting Tools

Purpose:
- produce outreach drafts
- produce post drafts
- produce call notes and follow-ups
- summarize learnings

Recommended tools:
- text generation
- templates
- brand voice references
- experiment log

Allowed to auto-use:
- yes, for drafts only

### 4. Outreach Tools

Purpose:
- send DMs
- send emails
- send follow-ups
- schedule contact attempts

Recommended tools:
- email platform
- X DM workflow
- creator CRM sequences
- task queue

Allowed to auto-use:
- no for external send
- yes for preparing drafts and queues

### 5. Brand Monitoring Tools

Purpose:
- track mentions
- watch content performance
- detect narrative shifts
- flag opportunities

Recommended tools:
- social listening
- post analytics
- watchlists
- mention alerts

Allowed to auto-use:
- yes

### 6. Product and Analytics Tools

Purpose:
- connect GTM learnings to product signals
- identify friction and drop-offs
- inform experiments
- connect creator footprint to campaign and venue routing
- quantify what creators are doing to the grid

Recommended tools:
- product analytics
- dashboard snapshots
- database summaries
- campaign performance logs
- creator footprint summaries
- venue-memory contribution summaries

Allowed to auto-use:
- yes, read-only by default

## Creator Grid Intelligence Contracts

When Brain reasons about creators, it should prefer place-native signals over generic influencer abstractions.

Each creator routing surface should be able to answer:
- where this creator has already left verified memory
- which venue they have the strongest history with
- whether they have won a first mark before
- why a current opportunity matches this creator spatially
- which creator lens layers should be enabled by default when the user lands on the map

Preferred creator contribution fields:
- `totalMarks`
- `firstMarks`
- `uniqueVenues`
- `topVenue`
- `lastMarkedAt`
- `venueAffinityReasons`
- `totalMarksHere`
- `totalWinsHere`
- `firstMarksHere`
- `pulseContribution`
- `shareOfVenuePulse`
- `isTopLocalSignal`

## Permission Model

BaseDare Brain should operate with three action tiers.

### Auto

These actions are safe to do automatically:
- build and dedupe lead lists
- enrich leads with public context
- rank and tag leads
- summarize calls, notes, or replies
- prepare outreach drafts
- prepare X post drafts
- monitor mentions and events
- update structured memory
- create weekly reports

### Human Review Required

These actions should be prepared by the agent but require approval before execution:
- sending emails or DMs
- publishing public posts
- offering venue perks
- proposing sponsorship packages
- sharing performance claims externally
- committing to pilot timelines
- sending follow-up sequences

### Human Only

These actions must never be executed by the agent without explicit human action:
- signing or sending contracts
- approving payments
- treasury actions
- changes to live production systems
- deleting important records
- making legal or compliance commitments
- granting admin credentials

## Suggested First Tool Set

The v1 stack should be boring and reliable.

Recommended minimum set:
- search and web browsing
- a structured lead sheet or CRM
- a memory store
- a doc store with BaseDare positioning and case studies
- analytics read access
- draft templates for outreach and posting

Optional later tools:
- automated email send
- calendar scheduling
- richer social monitoring
- venue intelligence enrichment

## Tool Contracts

Each tool should produce structured output where possible.

### Lead output contract

Each venue or creator lead should include:
- name
- handle or website
- city
- category
- why it matters
- confidence level
- next action
- source link

### Outreach draft contract

Each outreach draft should include:
- objective
- audience type
- message draft
- personalization hook
- reason this message should work
- approval status

### Weekly report contract

Each weekly report should include:
- wins
- losses
- bottlenecks
- best new leads
- top messaging learnings
- proposed experiments

## Scorecards

The agent should be judged on outcomes, not just output volume.

### 1. Venue Growth Scorecard

Track:
- new venue leads added
- qualified venue leads
- warm venue replies
- calls or meetings booked
- pilot venue conversations active
- venue pilots closed

### 2. Creator Growth Scorecard

Track:
- new creator leads added
- qualified creator leads
- creator replies
- creators onboarded
- creators who complete first meaningful action

### 3. Brand Reach Scorecard

Track:
- post drafts shipped
- approved public posts published
- impressions or reach on key channels
- mentions from creators or venues
- inbound interest generated

### 4. Pipeline Health Scorecard

Track:
- overdue follow-ups
- reply rate by message type
- positive response rate
- conversion from outreach to call
- conversion from call to pilot or onboarding

### 5. Learning Scorecard

Track:
- new validated insights added to memory
- experiments proposed
- experiments run
- experiments that changed behavior
- repeated mistakes prevented by memory

## Leading vs Lagging Metrics

Use both.

### Leading indicators
- new qualified leads
- follow-ups completed
- reply rate
- meeting rate
- content output rate
- experiment throughput

### Lagging indicators
- venue pilots closed
- creators onboarded
- campaigns launched
- repeat venue interest
- brand awareness lift

## Review Cadence

### Daily

Review:
- top opportunities
- follow-up backlog
- approval queue
- new signals worth acting on

### Weekly

Review:
- scorecard movement
- top learnings
- weakest part of the funnel
- messaging changes needed
- city and category priority changes

### Monthly

Review:
- whether the current target market is correct
- which channel is actually producing momentum
- whether the agent deserves more autonomy or less

## Guardrails

BaseDare Brain should be considered healthy only if:
- it reduces manual research time
- it improves follow-up consistency
- it helps create real conversations
- it keeps memory cleaner than the human team would alone

It should be constrained or redesigned if:
- it creates noise without movement
- it generates too many drafts to review
- it repeats failed messaging
- it weakens brand trust
- it starts optimizing for vanity metrics

## Brain v1 Recommendation

For the first operating version:

Give the agent:
- research access
- memory access
- CRM write access
- analytics read access
- draft generation ability

Do not yet give it:
- autonomous send authority
- payment authority
- admin production authority
- contract authority

That version is strong enough to create leverage while keeping brand and business risk contained.
