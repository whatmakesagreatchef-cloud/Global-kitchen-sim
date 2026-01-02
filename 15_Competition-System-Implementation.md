# Competition System Implementation (No API)

## Required loaders
- Load `/data/competitions/formats.json`
- Load `/data/competitions/profiles.json`
- Load `/data/competitions/catalog.json`
- Load `/data/circuits/circuits.json`
- Load season (either 12-week slice or `2026_multi_comp.json`)

## Runtime scoring pipeline
Inputs:
- base rubric (e.g., `rubric_standard`)
- route rubric_bias multipliers (country route)
- profile multipliers (rubric_profile_id)
- format multipliers (format_id)
- state signals (fatigue, morale, cohesion, flags)
- penalties (triggered by flags/events)

Steps:
1) Compute criteria score per key (0..10)
   - derive from readiness + relevant skills + small RNG
2) Multiply criterion weight by:
   - route bias
   - profile multipliers
   - format multipliers
3) Sum to 100-scale score
4) Apply penalties; if DQ penalty present → result DQ

## Team-size impact
For team formats:
- Apply cohesion_importance as a modifier to workflow/timing consistency
- Low cohesion adds variance (more mistakes and bigger penalty chance)

## Circuit progression
When a competition is resolved:
- set flags on win/loss
- unlock next stage competition(s)
- optionally branch: redemption missions on loss
