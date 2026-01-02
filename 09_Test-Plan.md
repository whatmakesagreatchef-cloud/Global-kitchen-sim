# Test Plan

## Content validation
- Every mission must have:
  - id unique
  - at least 2 choices
  - outcomes for success/fail
  - effects ops valid

## Engine tests (seeded)
- Same seed + same choices => same outcomes
- Effects application is deterministic and idempotent per action

## Balance tests
- Simulate 100 seasons per route (bot picks random choices)
- Ensure >30% completion rate and no route is unwinnable

## UX tests
- Player always sees:
  - next objective
  - current pressures (time/budget)
  - current people risk (cohesion)
