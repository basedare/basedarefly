# BaseDare Brain Memory Schema

## Purpose

This document defines the structured memory layer for BaseDare Brain.

The goal is to make the brain cumulative instead of forgetful.
It should remember:
- who matters
- what happened
- what worked
- what failed
- what should happen next

This is a first-pass schema design, not a final database contract.

## Design Principles

1. Memory should help create better next actions.
2. Memory should prefer structured fields over long raw notes.
3. Memory should store evidence, not just opinions.
4. Memory should make repeated mistakes less likely.
5. Memory should support both human review and agent loops.

## Core Entities

### 1. Lead

Represents a venue, creator, sponsor, partner, or campaign opportunity.

Suggested fields:
- `id`
- `type`
  - `VENUE`
  - `CREATOR`
  - `SPONSOR`
  - `PARTNER`
- `displayName`
- `handleOrWebsite`
- `city`
- `country`
- `category`
- `status`
  - `NEW`
  - `RESEARCHED`
  - `QUALIFIED`
  - `CONTACTED`
  - `RESPONDED`
  - `CALL_BOOKED`
  - `PILOT_ACTIVE`
  - `WON`
  - `LOST`
- `priorityScore`
- `confidenceScore`
- `owner`
- `source`
- `whyItMatters`
- `nextAction`
- `nextActionDueAt`
- `lastTouchedAt`
- `createdAt`
- `updatedAt`

### 2. Contact

Represents a person or contact path attached to a lead.

Suggested fields:
- `id`
- `leadId`
- `name`
- `role`
- `channel`
  - `EMAIL`
  - `X`
  - `INSTAGRAM`
  - `TELEGRAM`
  - `WEBSITE_FORM`
  - `IN_PERSON`
- `identifier`
- `primary`
- `notes`
- `createdAt`
- `updatedAt`

### 3. Outreach Attempt

Represents one outbound contact attempt or follow-up.

Suggested fields:
- `id`
- `leadId`
- `contactId`
- `channel`
- `messageType`
  - `INTRO`
  - `FOLLOW_UP`
  - `PILOT_PROPOSAL`
  - `CREATOR_INVITE`
  - `VENUE_INVITE`
- `copyVariant`
- `personalizationHook`
- `sentBy`
  - `HUMAN`
  - `AGENT_PREPARED`
  - `AGENT_SENT`
- `status`
  - `DRAFT`
  - `PENDING_REVIEW`
  - `SENT`
  - `DELIVERED`
  - `REPLIED`
  - `IGNORED`
  - `BOUNCED`
- `outcomeSummary`
- `sentAt`
- `replyAt`
- `createdAt`
- `updatedAt`

### 4. Interaction

Represents an inbound or outbound meaningful event.

Suggested fields:
- `id`
- `leadId`
- `contactId`
- `type`
  - `MESSAGE_SENT`
  - `MESSAGE_RECEIVED`
  - `CALL`
  - `MEETING`
  - `NOTE`
  - `INTRODUCTION`
  - `EVENT_SIGNAL`
- `summary`
- `sentiment`
  - `POSITIVE`
  - `NEUTRAL`
  - `NEGATIVE`
  - `UNKNOWN`
- `rawSourceLink`
- `createdBy`
- `createdAt`

### 5. Insight

Represents a reusable learning that should affect future behavior.

Suggested fields:
- `id`
- `scope`
  - `GLOBAL`
  - `CITY`
  - `VENUE_CATEGORY`
  - `CREATOR_CATEGORY`
  - `CHANNEL`
  - `COPY`
- `title`
- `statement`
- `evidence`
- `confidence`
  - `LOW`
  - `MEDIUM`
  - `HIGH`
- `status`
  - `CANDIDATE`
  - `VALIDATED`
  - `STALE`
  - `REJECTED`
- `appliesTo`
- `createdAt`
- `updatedAt`

### 6. Experiment

Represents a growth or messaging experiment.

Suggested fields:
- `id`
- `name`
- `objective`
- `hypothesis`
- `segment`
- `variantA`
- `variantB`
- `metric`
- `status`
  - `PROPOSED`
  - `ACTIVE`
  - `COMPLETED`
  - `ABANDONED`
- `resultSummary`
- `winner`
- `createdAt`
- `updatedAt`

### 7. Scorecard Snapshot

Represents a periodic roll-up of key operating metrics.

Suggested fields:
- `id`
- `periodType`
  - `DAY`
  - `WEEK`
  - `MONTH`
- `periodStart`
- `periodEnd`
- `newVenueLeads`
- `qualifiedVenueLeads`
- `warmVenueReplies`
- `venueCallsBooked`
- `venuePilotsClosed`
- `newCreatorLeads`
- `qualifiedCreatorLeads`
- `creatorReplies`
- `creatorsOnboarded`
- `approvedPostsPublished`
- `inboundOpportunities`
- `followUpsOverdue`
- `experimentsStarted`
- `insightsValidated`
- `createdAt`

### 8. Task

Represents an operational next step owned by a human or the brain.

Suggested fields:
- `id`
- `leadId`
- `title`
- `description`
- `owner`
  - `BRAIN`
  - `HUMAN`
- `status`
  - `OPEN`
  - `IN_PROGRESS`
  - `WAITING_REVIEW`
  - `DONE`
  - `CANCELLED`
- `riskLevel`
  - `LOW`
  - `MEDIUM`
  - `HIGH`
- `dueAt`
- `completedAt`
- `createdAt`
- `updatedAt`

## Derived Views

The raw entities above should power a few highly useful views.

### 1. Lead Queue

Sorted by:
- priority score
- freshness
- reply likelihood
- city importance
- current stage

### 2. Follow-Up Queue

Contains:
- contacted leads with no reply
- due follow-ups
- stale conversations

### 3. Warm Opportunities View

Contains:
- responded leads
- open pilot discussions
- strong inbound interest
- high-confidence creator fits

### 4. Messaging Learnings View

Contains:
- highest reply-rate variants
- lowest reply-rate variants
- objections by segment
- best hooks by city or category

## Minimal Relationships

Suggested first-pass relationships:

- one `Lead` can have many `Contact`
- one `Lead` can have many `OutreachAttempt`
- one `Lead` can have many `Interaction`
- one `Lead` can have many `Task`
- many `Insight` can refer to many lead categories or channels
- many `OutreachAttempt` can refer to one experiment variant

## What The Brain Should Read Before Acting

Before generating outreach or recommending next steps, the brain should read:
- the lead record
- recent interactions
- recent outreach attempts
- any validated insights that apply to the segment
- overdue tasks

## What The Brain Should Write After Acting

After each cycle, the brain should write:
- new or updated leads
- new drafts or outreach attempts
- new tasks
- notable interactions
- validated or candidate insights

## MVP Recommendation

Do not build the full schema at once.

For Brain v1, the minimum useful memory layer is:
- `Lead`
- `OutreachAttempt`
- `Interaction`
- `Insight`
- `Task`
- `ScorecardSnapshot`

That is enough to support:
- scouting
- follow-up discipline
- messaging learning
- weekly reporting

The rest can be added once the operating loop is real.
