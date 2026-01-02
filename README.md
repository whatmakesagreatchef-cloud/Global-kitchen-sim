# Culinary Competition Team Manager Simulator (Career Story Mode)

A browser-based, story-driven simulator where the player chooses a country route and manages a culinary competition team through training, funding, conflict, and competitions.

## Key Constraints
- No API / no backend
- Designed for GitHub Pages hosting
- Save/Load via localStorage + optional export/import JSON
- Content-first: story missions and events are JSON files in `/data`

## Run locally
Any static server works:
- Python: `python -m http.server 8000`
- Node: `npx serve`

Open: `http://localhost:8000`

## Content editing
Most gameplay comes from JSON:
- `/data/countries/*.json` route configs
- `/data/missions/<country>/` story missions
- `/data/events/global/` random and triggered events
- `/data/rubrics/` scoring rubrics
- `/data/characters/archetypes.json` team member templates

## MVP build order
1) Load country routes and start a new career
2) Render mission screen with choices and outcomes
3) Apply effects to game state + append to log
4) Weekly tick (fatigue/morale + random event)
5) Competition scoring (rubric + readiness)
6) Reports screen + Save/Load

See `/docs` for full specs.

### New in v4
- `/data/competitions/` formats + profiles + catalog
- `/data/circuits/` career pathways
- `/data/roles/` role templates + assignment rules
- `/data/training/` session library
