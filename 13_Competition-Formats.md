# Competition Formats (All Types)

This simulator supports multiple competition styles via a **format template** system.
Each competition instance references a `format_id` and a `rubric_profile_id`.

## Supported format families
### Solo (1 competitor)
- **solo_live_cooking**: one competitor, fixed brief, timed cook, plates only.
- **solo_mystery_box**: brief revealed on the day; higher RNG; adaptability emphasis.
- **bocuse_style**: candidate + commis (2-person), platter + plates, strict timing, presentation theatre.

### Team (2–6+)
- **team_hot_kitchen**: multiple competitors in one kitchen; station roles; combined output.
- **team_relay**: timed handoffs; workflow/cohesion emphasized.
- **team_cold_display**: static displays; perfection/finish; fewer timing penalties.

### Multi-discipline (Team split)
- **worldcup_team**: hot kitchen + pastry (optional) + cold work; aggregated score.
- **olympics_hot_kitchen**: IKA-style hot kitchen; high technical bar; penalties meaningful.

## How formats affect gameplay
Formats define:
- team size + required roles
- deliverables (plates, platters, displays)
- time limit and penalty model
- which skills dominate (format multipliers)
- relationship importance (cohesion modifier)

## Implementation note
Keep ONE base rubric schema. Apply:
1) route rubric_bias multipliers
2) format criteria multipliers (profile)
3) penalties from format (late, hygiene critical, missing elements)

See `/data/competitions/formats.json` and `/data/competitions/profiles.json`.
