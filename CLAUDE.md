# CLAUDE.md — Global Kitchen Sim

## Project Overview

**Global Kitchen Sim** is a browser-based, story-driven culinary competition team manager simulator. Players choose a country route (AU, JP, FR, US) and guide a team through training, funding, conflict, and international competitions.

**Key constraints:**
- Zero dependencies — no npm, no build tools, no backend
- Runs directly in any browser; hosted on GitHub Pages
- All persistence via `localStorage` + optional JSON export/import
- Fully content-driven: gameplay is defined by JSON data files at the repo root

---

## Repository Layout

All files live **flat at the repo root** — there are no `src/`, `data/`, or `app/` subdirectories despite what the README says (the README describes an aspirational structure not yet implemented).

```
/                          ← everything is here
├── index.html             ← single-page app entry point
├── main.js                ← JS entry point (currently a stub)
├── style.css              ← complete UI stylesheet (dark theme)
│
├── README.md              ← quick-start guide
├── CLAUDE.md              ← this file
│
│── 00_Product-Brief.md    ← vision and scope
│── 01_Narrative-Bible.md  ← story framework, archetypes
│── 02_Gameplay-Loop.md    ← weekly cycle
│── 03_Systems-Spec.md     ← game state, effects engine, formulas  ← START HERE
│── 04_Content-Schemas.md  ← JSON schema reference
│── 05_Balance-Economy.md  ← budget, fatigue, sponsorship balance
│── 06_UI-Flow.md          ← screen layouts and user journey
│── 07_Save-Load.md        ← localStorage and import/export
│── 09_Test-Plan.md        ← validation and balance testing
│── 11_Country-Routes.md   ← AU/JP/FR/US route characteristics
│── 12_Conflict-Playbook.md← conflict types and resolution tools
│── 13_Competition-Formats.md
│── 14_Competition-Pathways.md
│── 15_Competition-System-Implementation.md
│── 16_Training-Sessions.md
│── 17_Roles-and-Assignments.md
│── 18_Story-Arcs-by-Circuit.md
│
│── AU.json / JP.json / FR.json / US.json   ← country route configs
│── {COUNTRY}_m{NNN}_{name}.json            ← story missions (~19 per country)
│── m001_tryouts.json                       ← generic (country-agnostic) mission
│── gev_*.json                              ← 6 global random events
│── catalog.json                            ← competition instance library
│── circuits.json                           ← career pathway definitions
│── formats.json                            ← competition format templates
│── profiles.json                           ← rubric overlay profiles
│── roles.json                              ← role templates + skill multipliers
│── sessions.json                           ← training session library
│── 2026.json / 2026_multi_comp.json / 2026_open_calendar.json  ← season data
```

**Important discrepancy:** `index.html` references `./app/style.css` and `./app/main.js`, but these files are actually `./style.css` and `./main.js` at the root. Any implementation work must resolve this path mismatch.

---

## Running Locally

No install step required:

```bash
# Python (built-in)
python -m http.server 8000

# Node.js
npx serve
```

Open `http://localhost:8000`. There is no build step, no compilation, no hot reload.

---

## Current Implementation State

`main.js` is a **stub** (2 lines: `// Starter pack: implement loader + UI here.`). The UI shell and stylesheet are complete; the JavaScript engine needs to be built.

### MVP build order (from README)

1. Load country routes from `{COUNTRY}.json` and start a new career
2. Render mission screen with choices and outcomes
3. Apply effects to game state + append to log
4. Weekly tick (fatigue/morale recovery + random event trigger)
5. Competition scoring (rubric × readiness)
6. Reports screen + Save/Load

---

## Game State Schema

Defined in `03_Systems-Spec.md`. Stored in memory, persisted to `localStorage`:

```js
{
  career_id: string,
  seed: int,          // deterministic RNG seed
  route_id: string,   // "AU" | "JP" | "FR" | "US"
  week: int,
  chapter: string,
  flags: string[],    // e.g. ["FLAG_TRIALS_HELD", "FLAG_ROLES_DEFINED"]
  team: {
    budget: int,      // currency (not 0-100)
    morale: 0-100,
    fatigue: 0-100,
    reputation: 0-100,
    cohesion: 0-100,
    risk: 0-100,
    available_hours: int
  },
  members: [...],     // array of member objects with skills and traits
  relationships: [...], // pairwise scores (-100..+100) with tags
  log: [...]          // append-only decision/outcome history
}
```

**Member skills** (each 0–100): `knife`, `sauce`, `workflow`, `hygiene`, `timing`, `plating`, `butchery`, `pastry`, `seasoning`

**Readiness formula:**
```
readiness = avg(core_skills)
          + (morale * 0.15)
          + (cohesion * 0.15)
          + (reputation * 0.10)
          - (fatigue * 0.25)
          - (risk * 0.10)
// clamp 0..100
```

---

## JSON Data Conventions

### Versioning and IDs

- Every JSON file has `"version": "v1"` at root
- IDs use **kebab-case** or **SCREAMING_SNAKE_CASE** for flags
- Country codes: `AU`, `JP`, `FR`, `US`
- Mission IDs: `{COUNTRY}_m{NNN}_{name}` (e.g., `US_m001_tryouts`)
- Event IDs: `GEV_{name}` (e.g., `GEV_station_war`)
- Flag IDs: `FLAG_{NAME}` (e.g., `FLAG_TRIALS_HELD`, `FLAG_POLITICS`)

### Mission Structure

```json
{
  "id": "US_m001_tryouts",
  "title": "...",
  "chapter": "CH1_TRYOUTS",
  "week": 1,
  "type": "story",
  "intro": ["Line 1", "Line 2"],
  "requirements": {
    "flags_all": [],
    "flags_none": [],
    "min_reputation": 0
  },
  "choices": [
    {
      "id": "c1_open_trials",
      "label": "...",
      "checks": [
        { "stat": "team.reputation", "difficulty": 10, "success_mods": [], "fail_mods": [] }
      ],
      "outcomes": {
        "success": { "text": "...", "effects": [...], "set_flags": [...] },
        "fail":    { "text": "...", "effects": [...] }
      }
    }
  ],
  "rewards": { "unlock_missions": [] }
}
```

### Effects Engine (atomic ops)

| op | description |
|----|-------------|
| `inc` | increment `path` by `value` |
| `set` | set `path` to `value` |
| `addMember` | add a team member |
| `incSkill` | increment a member's skill |
| `incRelationship` | change pairwise relationship score |
| `set_flag` / `clear_flag` | set or clear a flag string |
| `unlock_mission` | add a mission to the queue |
| `assign_role` | assign a role to a member slot |
| `clear_role` | clear a member's role slot |
| `set_station_map` | map station→member_id |

### Check Formula

```
roll = stat_value + sum(mods) + rng(-15..+15)
success if roll >= difficulty
```

Use seeded (deterministic) RNG — same seed + same choices must produce identical outcomes.

### Country Route Config

Each `{COUNTRY}.json` defines:
- `starting_resources` — initial budget, reputation, weekly_hours_per_member
- `system_modifiers` — multipliers for skill_gain, fatigue_gain, sponsor_difficulty, conflict_chance
- `conflict_profile` — weights for hierarchy, ego, communication, standards_vs_speed, creativity_vs_tradition
- `rubric_bias` — multipliers for taste, technique, workflow, hygiene, presentation, timing
- `content.missions` — ordered list of mission IDs
- `content.events` — list of global event IDs available on this route

---

## Competition System

Defined in `13–15_Competition-*.md`. Four-layer scoring pipeline:

1. **Base rubric** — weighted criteria scores (taste, technique, workflow, hygiene, presentation, timing)
2. **Route rubric_bias** — per-country multipliers from `{COUNTRY}.json`
3. **Format template** — from `formats.json` (solo_live_cooking, bocuse_style, team_hot_kitchen, etc.)
4. **Rubric profile** — from `profiles.json` (solo_standard, bocuse_showpiece, olympics_technical, etc.)

Competition instances are in `catalog.json`; career pathways (Solo, Bocuse, Team Global, Pastry, World Cup) are in `circuits.json`.

---

## Training Sessions

Defined in `sessions.json`. Each session specifies:
- `hours` cost
- `fatigue` gain
- per-skill gains
- cohesion effects

Role assignment (from `roles.json`) applies `skill_focus` multipliers to training gains.

---

## UI Conventions (style.css)

- **Dark theme** — `--bg: #0b1220`, `--card: #0f1a2f`
- **Accent** — cyan `--accent: #6ee7ff`
- **Good/bad states** — green `#7dff9f` / red `#ff6b6b`
- **Layout** — 2-column CSS grid, 1-column on mobile (`@media max-width: 900px`)
- **Fonts** — system fonts only (no web fonts loaded)
- CSS custom properties for all theming; use them, do not hardcode colors

HTML structure in `index.html`:
- `#routes` — country selection buttons
- `#stateKv` — key/value game state display
- `#flagsOut` — flags list in `<pre>`
- `#missionIntro`, `#missionChoices`, `#resultBox` — mission flow
- `#compSelect`, `#btnSimulate`, `#compOut`, `#compSummary` — competition day
- `#dataOut` — loaded data inspection panel

---

## Save / Load

Defined in `07_Save-Load.md`:
- Auto-save to `localStorage` key (keyed by `career_id`) after every action
- Export: serialize game state to downloadable JSON file
- Import: load a saved JSON file back into state
- Reset button (`#btnReset`) in the header clears state

---

## Testing

No automated test runner. Validation is manual per `09_Test-Plan.md`:

1. **Content validation** — mission IDs are unique, each mission has ≥2 choices, all effects ops are valid
2. **Engine determinism** — run same seed + same choices twice, assert identical outcomes
3. **Balance simulation** — simulate 100 seasons per route with random bot choices; expect >30% completion rate per route
4. **UX checks** — player always sees: next objective, current pressures (time/budget), cohesion risk

---

## Development Workflow

### Branches

- `main` — primary branch; deployed to GitHub Pages
- `claude/*` — AI-generated feature branches (merge to main via PR)

### Making Changes

1. Work on the designated feature branch
2. Commit with descriptive messages
3. Push with `git push -u origin <branch-name>`

### Adding Content (JSON)

- Follow existing file naming conventions exactly
- Add new missions to the appropriate `{COUNTRY}.json` `content.missions` array
- All effect `op` values must be from the supported ops list above
- Keep `"version": "v1"` on every new JSON file

### Modifying the Engine (main.js)

- Implement as vanilla ES6 modules — no framework imports
- Data loading: `fetch()` each JSON file by name (they are at the repo root)
- Fix the path mismatch: `index.html` references `./app/main.js` but the file is `./main.js`
- Use seeded RNG for all checks (not `Math.random()`)
- Apply effects atomically and append outcomes to `state.log`

---

## Key Documentation Files

| File | Read when... |
|------|-------------|
| `03_Systems-Spec.md` | Implementing game state, effects engine, checks, weekly tick |
| `04_Content-Schemas.md` | Creating or validating any JSON content file |
| `05_Balance-Economy.md` | Tuning difficulty, budget, fatigue, or sponsor values |
| `06_UI-Flow.md` | Building or modifying any screen/view |
| `12_Conflict-Playbook.md` | Implementing the conflict/event system |
| `15_Competition-System-Implementation.md` | Implementing competition scoring |
