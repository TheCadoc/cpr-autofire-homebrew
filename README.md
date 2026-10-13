# CPR Autofire Homebrew

Homebrew Autofire rules for Cyberpunk RED in Foundry VTT v12.

## Full Blast

When you attack with Autofire, a prompt asks whether to Full Blast.

- **Standard Autofire** (default): the rules as written, 10 rounds.
- **Full Blast**: spends twice the Autofire cost (20 rounds), hit or miss. It is unavailable when fewer rounds are loaded.

Full Blast damage adds 1 to each of the 2d6 before the Autofire multiplier. A die cannot be raised above 6, so a natural 6 stays 6: the total is (d1 + d2 + 2) x multiplier + other modifiers, less 1 x multiplier for each natural 6. The damage card shows a line such as "Full Blast! +1 per die (6 + 5)" above the Autofire multiplier, and lists the bonus as a "Full Blast (+1 per die)" modifier in the breakdown. Die images keep the natural rolls. Critical injuries need two natural 6s, and the +5 critical bonus is unchanged.

The damage dialog has a "Full Blast?" checkbox for Autofire damage. It is pre-checked when you roll from a Full Blast attack card.

### Optional rules

Two world settings, both off by default and independent:

- **Allow dice results to be modified above 6**: a natural 6 becomes 7, so the total is always (d1 + d2 + 2) x multiplier + other modifiers.
- **Count modified dice towards criticals**: a die Full Blast raises to 6 or more counts toward the critical, as a natural 6 does. A natural 5 then counts, and so does a natural 6 raised to 7. Natural 6s always count.

With Pneuma's Combat Tools, the second setting changes CPR's damage card (the +5 and "Critical Damage") but not Pneuma's critical injury button, which counts natural 6s only.

## Pneuma's Combat Tools

Verified with Pneuma's Combat Tools 0.9.16. It is optional; nothing changes when it is not active.

- Autofire attacks from Pneuma's token HUD, and sheet attacks Pneuma routes through its exchange, show the Full Blast prompt and spend the Full Blast cost.
- Pneuma's damage button on a Full Blast attack rolls Full Blast damage. A click rolls at once; Shift-click opens CPR's damage dialog, which shows "Full Blast?" checked. (Before Pneuma 0.9.15 the two were the other way round.)
- Pneuma's attack cards show "(Full Blast)".
- Pneuma's HUD still disables Autofire below 10 rounds. The prompt disables Full Blast below 20.
- With another Pneuma version, the GM sees one warning. If its damage button stops rolling Full Blast damage, open CPR's damage dialog from it and tick "Full Blast?".

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
