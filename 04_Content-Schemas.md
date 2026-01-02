# Content Schemas (JSON)

All content lives under `/data`. The engine loads JSON and validates required fields.

## 1) Country Route (`/data/countries/<ID>.json`)
Required:
- id, name
- learning_outcomes (string[])
- starting_resources: budget, reputation, weekly_hours_per_member
- system_modifiers: skill_gain map, fatigue_gain, sponsor_difficulty, conflict_chance
- conflict_profile: weights for hierarchy/ego/communication/standards_vs_speed/creativity_vs_tradition
- rubric_bias: multipliers for taste/technique/workflow/hygiene/presentation/timing
- content: missions[], events[]

## 2) Mission (`/data/missions/<route>/<mission>.json`)
Required:
- id, title, chapter, week, type
- intro (string[])
- requirements (flags_all, flags_none, min_reputation)
- choices[] where each choice has:
  - id, label
  - checks[] (stat, difficulty, success_mods[], fail_mods[])
  - outcomes.success and outcomes.fail:
    - text
    - effects[]
    - set_flags[] (optional)
- rewards.unlock_missions[] (optional)

## 3) Event (`/data/events/...`)
Required:
- id, title
- trigger: weekly_roll or conditional
- text
- choices[] each with label and effects[]

Trigger shapes:
- weekly_roll: base_chance, modifiers[]
- conditional: all[] conditions

Condition examples:
- { "path": "team.fatigue", "gte": 70 }
- { "path": "team.cohesion", "lte": 40 }
- { "relationship": { "min_score": -25 } }
- { "flag": "FLAG_ROLES_DEFINED" }

## 4) Rubric (`/data/rubrics/<rubric>.json`)
Required:
- id, scale
- criteria[]: key, weight, critical(optional)
- penalties[]: key with points or result:"DQ"

## 5) Archetypes (`/data/characters/archetypes.json`)
List of member templates:
- id, name, traits[], base_skills{}, volatility, conflict_tags[]

## 6) Season (`/data/seasons/2026.json`)
Defines weeks, chapter schedule, and competition weeks.


## 7) Competitions (`/data/competitions/*.json`)
Required files:
- formats.json (format templates)
- profiles.json (rubric overlays)
- catalog.json (competition instances)

## 8) Circuits (`/data/circuits/circuits.json`)
Defines pathways (Solo/Bocuse/Team/World Cup/Pastry) and stage progression.

## 9) Training Sessions (`/data/training/sessions.json`)
Reusable and format-specific training blocks with fatigue, hours cost, and skill gains.


## 10) Roles (`/data/roles/roles.json`)
Defines role templates, responsibilities, and skill_focus multipliers used by formats.
