# Menu Planner

A standalone, browser-only weekly menu planning app. Unrelated to the Global Kitchen Sim
game in the rest of this repo — it lives in its own folder so the two don't interfere.

## Features
- **Recipes** — create/edit/delete recipes with category, base servings, tags, ingredients, and notes.
- **Plan** — a Mon–Sun grid (Breakfast/Lunch/Dinner/Snack) to assign recipes per week, with a servings
  multiplier per meal. Navigate between weeks with Prev/Next/This week.
- **Shopping List** — auto-aggregates ingredients from the current week's plan (scaled by servings),
  merges matching items, lets you check items off, add manual extra items, and print the list.
- **Export/Import** — download all data as JSON, or load a previously exported file.

## Data
Everything is stored client-side in `localStorage` under the key `menuPlannerData_v1`. No backend,
no build step, no external dependencies.

## Run locally
Any static server works:
- Python: `python -m http.server 8000`
- Node: `npx serve`

Then open `http://localhost:8000/menu-planner/`.
