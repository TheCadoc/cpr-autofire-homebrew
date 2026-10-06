# CPR Autofire Homebrew

Homebrew Autofire rules for Cyberpunk RED in Foundry VTT v12.

## Full Blast

When you attack with Autofire, a prompt asks whether to Full Blast.

- **Standard Autofire** (default): the rules as written, 10 rounds.
- **Full Blast**: spends twice the Autofire cost (20 rounds), hit or miss. It is unavailable when fewer rounds are loaded.

Full Blast damage adds 1 to each of the 2d6 before the Autofire multiplier, so the total is (d1 + d2 + 2) x multiplier + other modifiers. The damage card shows a line such as "Full Blast! +1 per die (6 + 5)" above the Autofire multiplier, and lists the bonus as a "Full Blast (+1 per die)" modifier in the breakdown. Die images keep the natural rolls. Critical injuries still need two natural 6s, and the +5 critical bonus is unchanged.

The damage dialog has a "Full Blast?" checkbox for Autofire damage. It is pre-checked when you roll from a Full Blast attack card.

## Pneuma's Combat Tools

Verified with Pneuma's Combat Tools 0.9.10. It is optional; nothing changes when it is not active.

- Autofire attacks from Pneuma's token HUD, and sheet attacks Pneuma routes through its exchange, show the Full Blast prompt and spend the Full Blast cost.
- Pneuma's damage button on a Full Blast attack rolls Full Blast damage, including Shift-click. The damage dialog shows "Full Blast?" checked.
- Pneuma's attack cards show "(Full Blast)".
- Pneuma's HUD still disables Autofire below 10 rounds. The prompt disables Full Blast below 20.
- With another Pneuma version, the GM sees one warning. If its damage button stops rolling Full Blast damage, tick "Full Blast?" in the damage dialog.

## Requirements

- Foundry VTT v12 (verified 12.343)
- Cyberpunk RED Core (verified 0.92.4)
- libWrapper

## Install

No public release yet. For development, clone this repo into the `foundry-cpr` workspace at `modules/cpr-autofire-homebrew`, run `npm run link` there, and enable the module in your world.

## Development

- `npm test`: unit tests for the rule math and the Pneuma matching rules (Node 22).
- Design: `docs/superpowers/specs/2026-10-05-full-blast-design.md`.
- Damage card line: `docs/superpowers/specs/2026-10-06-full-blast-damage-line-design.md`.
- Pneuma integration: `docs/superpowers/specs/2026-10-06-pneuma-compat-design.md`.
