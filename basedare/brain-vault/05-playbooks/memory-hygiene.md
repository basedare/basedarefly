---
type: playbook
status: ACTIVE
created_at: 2026-05-13
updated_at: 2026-05-13
---

# Memory Hygiene

The Brain gets worse when memory is duplicated, vague, or stale.

## Before Adding A Lead

Check:

- same venue or creator name
- same handle or website
- same location
- same source slug
- same contact path

## When Updating A Lead

Always update:

- `status`
- `next_action`
- `last_touched_at`
- `updated_at`

Update when available:

- `confidence_score`
- `priority_score`
- `handle_or_website`
- evidence
- objection summary
- latest interaction

## When To Archive Or Downgrade

Mark `LOST` or lower priority when:

- contact path is invalid
- venue does not fit BaseDare use cases
- lead explicitly declines
- repeated follow-ups fail
- the original hypothesis no longer makes sense

