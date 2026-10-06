# CPR Autofire Homebrew

Homebrew Autofire rules for Cyberpunk RED in Foundry VTT v12.

## Full Blast

When you attack with Autofire, a prompt asks whether to Full Blast.

- **Standard Autofire** (default): the rules as written, 10 rounds.
- **Full Blast**: spends twice the Autofire cost (20 rounds), hit or miss. It is unavailable when fewer rounds are loaded.

Full Blast damage adds 1 to each of the 2d6 before the Autofire multiplier, so the total is (d1 + d2 + 2) x multiplier + other modifiers. The damage card shows the bonus as a "Full Blast (+1 per die)" modifier. Critical injuries still need two natural 6s, and the +5 critical bonus is unchanged.

The damage dialog has a "Full Blast?" checkbox for Autofire damage. It is pre-checked when you roll from a Full Blast attack card.

## Requirements

- Foundry VTT v12 (verified 12.343)
- Cyberpunk RED Core (verified 0.92.4)
- libWrapper

## Install

No public release yet. For development, clone this repo into the `foundry-cpr` workspace at `modules/cpr-autofire-homebrew`, run `npm run link` there, and enable the module in your world.

## Development

- `npm test`: unit tests for the rule math (Node 22).
- Design: `docs/superpowers/specs/2026-10-05-full-blast-design.md`.
