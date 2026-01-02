# Systems Spec (No API)

## Game state (single JSON object)
State is stored in memory and persisted to localStorage.

### Core state fields
- career_id (string)
- seed (int) for deterministic RNG
- route_id (e.g., AU, JP)
- week (int)
- chapter (string)
- flags (string[])
- team: budget, morale, fatigue, reputation, cohesion, risk, available_hours
- members: array of member objects (skills, traits, availability)
- relationships: pairwise scores and tags
- log: append-only list of decisions/outcomes

## Stats (0–100 unless noted)
- budget (currency int)
- morale (0–100)
- fatigue (0–100)
- reputation (0–100)
- cohesion (0–100)
- risk (0–100)

## Member skills (0–100)
knife, sauce, workflow, hygiene, timing, plating, butchery, pastry, seasoning

## Relationships
Each member pair has:
- score (-100..+100)
- tags: rival, mentor, clash:ego, clash:hierarchy, clash:communication, friends

## Mission resolution
A mission:
- displays intro text
- offers choices
- each choice has checks
- checks pass/fail → apply outcomes.effects and set_flags

### Check formula (suggested)
roll = stat_value + sum(mods) + rng(-15..+15)
success if roll >= difficulty

## Effects engine
Effects are atomic operations:
- inc path value
- set path value
- addMember id
- incSkill memberId skill value
- incRelationship a b value
- set_flag / clear_flag
- unlock_mission id

## Weekly tick
- recover fatigue: -10 baseline (modified by cohesion + route)
- apply fatigue gains from sessions chosen
- recompute readiness
- trigger events

## Readiness (0–100)
A simple formula:
readiness = avg(core skills) 
          + (morale * 0.15)
          + (cohesion * 0.15)
          + (reputation * 0.10)
          - (fatigue * 0.25)
          - (risk * 0.10)
Clamp 0..100

## Conflict system
Event chances are modified by:
- low cohesion
- high fatigue
- relationship scores below thresholds
- route conflict profile weights

## Competition scoring
Use base rubric and apply route rubric_bias multipliers to weighted sum.
Penalties can reduce score or cause DQ.

## Deterministic RNG
Use seed-based RNG so the same seed reproduces runs (good for testing).


## Roles
Each member can have a primary role (and optional secondary roles) used by competition formats.
Role assignment influences conflict probability and scoring contributions.

### New effect ops
- assign_role (member_id, role_id, slot)
- clear_role (member_id, slot)
- set_station_map (station->member_id)
