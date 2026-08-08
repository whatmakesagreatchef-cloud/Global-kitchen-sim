# Culinary Competition Team Manager Simulator (Career Story Mode)

A browser-based, story-driven simulator where the player chooses a country route and manages a culinary competition team through training, funding, conflict, and competitions.

## Key Constraints
- No API / no backend
- Designed for GitHub Pages hosting
- Save/Load via localStorage (key `gk_active_save_v1`)
- Content-first: story missions and events are flat JSON files at the repo root

## Run locally
Any static server works:
- Python: `python -m http.server 8000`
- Node: `npx serve`

Open: `http://localhost:8000`

## Engine
`main.js` is the whole game engine (vanilla ES module, no build step): loads content, resolves
missions/choices/checks, applies effects, ticks weeks, rolls events, and scores competition day.
`index.html` + `style.css` render it.

## Content layout
Everything lives as flat JSON next to `index.html`:
- `AU.json`, `FR.json`, `JP.json`, `US.json` — route configs
- `<ROUTE>_m0##...json` — story missions (falls back to another route's file, or the id-less
  `m001_tryouts.json`, if a route-specific mission file is missing — keeps every route playable)
- `gev_*.json` — global random/triggered events
- `catalog.json`, `formats.json`, `profiles.json` — competition instances, formats, rubric overlays
- `circuits.json` — career pathway stages + unlock flags
- `roles.json`, `sessions.json` — role templates and training sessions (reference data, shown via "Loaded Data")
- `2026*.json` — season calendar variants (shown via "Show Season Offers")

Character archetypes and the base scoring rubric aren't shipped as JSON in this pack, so they're
defined directly in `main.js` (`ARCHETYPES`, `RUBRIC_STANDARD`) per the shapes in
`04_Content-Schemas.md`.

See the numbered docs (`00_...` – `18_...`) at the repo root for full specs.

## Other apps in this repo
- [`menu-planner/`](menu-planner/) — a standalone weekly menu planning app (recipes, weekly plan
  grid, auto-generated shopping list). Unrelated to the game above; see its own README.
