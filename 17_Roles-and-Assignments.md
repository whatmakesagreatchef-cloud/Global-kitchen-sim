# Roles & Assignments System

Roles are a first-class system that impacts:
- training efficiency
- conflict probability
- competition performance (format-specific bonuses)

Data source: `/data/roles/roles.json`

## Member model additions
Each member should have:
- `roles.primary` (string | null)
- `roles.secondary` (string[])
- `role_fit` (optional derived score per role)

## Effects ops (add to engine)
Add these effects to your effects engine:
- `assign_role`: { op, member_id, role_id, slot:"primary|secondary" }
- `clear_role`:  { op, member_id, slot }
- `swap_roles`:  { op, member_a, member_b }
- `set_station_map`: { op, value: { stationName: member_id, ... } }

## How roles affect scoring
During scoring:
- apply role skill_focus multipliers to the member’s contribution
- apply cohesion_importance from format
- apply conflict risk rules (if rivals share a station / handoffs)

## Story consequences
Poor assignments create:
- more conflict events
- more variance on comp day
- higher penalty chance

Great assignments create:
- consistency under pressure
- clutch bonuses in finals
