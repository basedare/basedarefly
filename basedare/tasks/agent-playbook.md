# BaseDare Agent Playbook

This is the lean operating guide for non-trivial work in BaseDare.

## Use These Rules

### 1. Plan when risk is non-obvious
- Write a short plan before multi-step or high-risk work.
- Always plan for auth, payouts, contracts, schema changes, deploys, and external integrations.
- If the situation changes materially, stop and re-plan.

### 2. Verify before calling work done
- Do not mark a task complete without proof.
- Use the best available proof:
  - build
  - lint
  - tests
  - logs
  - API checks
  - UI smoke checks
- If something cannot be verified directly, state the gap clearly.

### 3. Fix root causes
- Prefer the smallest clean fix at the true failure point.
- Avoid temporary patches unless they are clearly labeled as temporary mitigation.
- Ask once: "Is there a simpler, more elegant fix?" Then move.

### 4. Capture durable lessons
- Update [lessons.md](/Users/mrrobot13/Desktop/basedarestar/basedare/tasks/lessons.md) when a mistake reveals a reusable rule.
- Keep lessons high-signal.
- Do not log every preference tweak or one-off detail.

### 5. Delegate intentionally
- Use parallel analysis or subagents for bounded, independent tasks.
- Do not delegate the immediate critical-path task by reflex.
- Prefer one clear responsibility per delegated task.

### 6. Keep a live task record
- Use [todo.md](/Users/mrrobot13/Desktop/basedarestar/basedare/tasks/todo.md) for complex or ongoing work.
- Track:
  - plan
  - progress
  - verification
  - outcome

## When To Use A Full Task Record
- Multi-file implementation
- Production incidents
- Security-sensitive changes
- Real-money flows
- Deploy or migration work
- Anything likely to take more than one focused session

## Default Standard
- Simplicity first
- Minimal code impact
- Clear verification
- Senior-engineer quality bar
