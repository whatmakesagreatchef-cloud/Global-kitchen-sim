# Competition Pathways (Circuits)

Instead of one linear season, the player selects a **circuit goal** (or plays a mixed calendar).
A circuit is a set of competitions with gates, qualifiers, and required team structure.

## Example circuits (supported)
- **Solo Circuit**: Local → National → International Solo Final
- **Bocuse Track**: Trials → National Selection → Continental → Final
- **Team Track (World Cup/Olympics)**: Camp → Selection → Qualifier → Global Event
- **Mixed Track**: player chooses opportunities each season (risk/reward)

## Why circuits matter
They change:
- funding needs (travel, equipment, commis support)
- training cadence (discipline blocks vs creativity blocks)
- team composition (solo: depth; team: breadth + cohesion)
- conflict risks (bigger teams = more relationships)

## Data model
- `/data/circuits/circuits.json` defines the circuit map
- `/data/competitions/catalog.json` lists competitions
- `season` references either a circuit or a mixed calendar

## Recommended MVP for "all types"
Ship 3 circuits:
1) Solo (fast entry, great tutorial)
2) Bocuse-style (signature high pressure)
3) Team World Cup/Olympics (large team management + conflict)
