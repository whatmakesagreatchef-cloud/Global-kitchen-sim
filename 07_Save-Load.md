# Save / Load (No API)

## Storage
- Auto-save to localStorage after each mission/event/competition.

Keys:
- `gk_active_save_v1`
- `gk_saves_index_v1` (optional multiple slots)

## Export / Import
Export:
- download a JSON file containing state object and version

Import:
- validate version + required fields
- replace current save and re-render

## Versioning
Include:
- state.version = "v1"
- content.version = "v1"
