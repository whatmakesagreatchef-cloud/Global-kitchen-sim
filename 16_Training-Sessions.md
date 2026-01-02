# Training Sessions (Reusable + Format-Specific)

Training is data-driven via `/data/training/sessions.json`.

## Session effects
Each session defines:
- hours_cost (reduces available_hours)
- fatigue (adds fatigue)
- skill_gains (adds to skills)
- relationship_effect (cohesion adjustments)
- optional requires_format (only appears if player is on that circuit/format)

## Role-aware training (future)
You can extend sessions with:
- role_target (candidate/commis/captain/pastry_lead)
- pair_bonus (if specific pair trains together)
- conflict_risk (if rival pair trains together)

## Suggested training menus by competition type
### Solo
- Knife reps, plating runs, mock service
- Mystery box sprints (random constraints)

### Team
- Mock service, relay handoffs, role clarity drills
- Communication debriefs (cohesion recovery)

### Bocuse
- Platter theatre rehearsals
- Candidate/commis communication scripts
- Precision timing checkpoints

### Olympics / World Cup
- Large-team workflow rehearsals
- Handoffs, plating consistency, hygiene audits
