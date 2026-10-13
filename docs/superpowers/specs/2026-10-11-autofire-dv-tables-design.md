# Interface 5 Autofire DV tables design spec

- Date: 2026-10-11
- Status: draft; decisions open (section 2). Blocked on verification items in section 4 and the licensing decision.
- Module: `cpr-autofire-homebrew` (this repo)

Facts about Pneuma's Combat Tools were read from its source on 2026-10-11. Facts about Cyberpunk RED Core are marked **verify**. The contents of Interface RED Volume 5 were not available when this was drafted.

## 1. Rule

Requested by Lukasz (2026-10-11): adopt the Autofire DV tables from Interface RED Volume 5 in place of the core Autofire DV tables, and make them work with Pneuma's Combat Tools.

This is unrelated to Full Blast and has no source in the Autofire Compendium.

## 2. Decisions

| #   | Decision                   | Proposed                                                                                                                                                                                                                                                               | Status |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Mechanism                  | Override by **RollTable name**, not by wrapping code. Both CPR and Pneuma resolve DVs from RollTables named after the weapon's `system.dvTable` (fact 1). No libWrapper wrapper on DV lookup.                                                                         | Open   |
| 2   | Where the override lives   | **Option W**: world RollTables with the exact native names, which Pneuma checks first (fact 2). Only the changed tables are needed. **Option C**: a full RollTable compendium selected in CPR's `dvRollTableCompendium` setting; it must hold every DV table (fact 3). Proposed: W, if CPR also checks world tables first. | Open   |
| 3   | Licensing                  | Ship no Interface RED numbers. A GM action builds the world tables from values the GM enters or pastes. See section 5.                                                                                                                                                | Open   |
| 4   | Switching                  | A world setting "DV tables: Core / Interface 5". Switching to Core deletes only tables this module created (marked by flag). Switching to Interface 5 rebuilds them from the stored values.                                                                         | Open   |
| 5   | Storage of entered values  | A hidden world setting holding the table rows as JSON, so a rebuild needs no re-entry.                                                                                                                                                                               | Open   |
| 6   | New weapon categories      | If Interface 5 adds Autofire tables for weapon types that have none in core (fact 4), each must be named `<that weapon's dvTable> (Autofire)` or Pneuma will throw (fact 5).                                                                                       | Open   |
| 7   | Conflict with a GM's own world tables | Never overwrite a world table this module did not create. Warn and stop instead.                                                                                                                                                               | Open   |

## 3. Environment

- Foundry VTT v12 (12.343), Cyberpunk RED Core v0.92.4.
- Pneuma's Combat Tools `main` at 0.9.16, cloned 2026-10-11.

## 4. Facts the design depends on

Verified in Pneuma 0.9.16:

1. **Table name convention.** For a ranged attack, Pneuma builds the table name as `system.dvTable` plus `" (Autofire)"` in Autofire mode (`combat-resolution.ts:396`). Its DV display builds the same names (`dv-data.ts:10-15`).
2. **Lookup order.** `getTable(name)` (`dv-hover.ts:33-55`) returns a world RollTable with that name first. Otherwise it uses the compendium in CPR's `dvRollTableCompendium` setting, falling back to `cyberpunk-red-core.internal_dv-tables` only when that setting names no valid RollTable pack.
3. **No per-table fallback.** When `dvRollTableCompendium` names a valid pack that lacks a table, `getTable` returns nothing; it does not fall back to the native pack (fact 2's code).
4. **Native Autofire tables.** Only two exist in CPR's internal pack: "DV SMG (Autofire)" and "DV Assault Rifle (Autofire)" (`native-lookup.ts:34-48`). Heavy SMGs presumably use `dvTable` "DV SMG" (**verify**).
5. **Missing table is an error.** Pneuma throws "No ranged DV is available for this weapon and distance." when the lookup fails (`combat-resolution.ts:398`).
6. **Native ids.** For CPR's internal pack, Pneuma looks tables up by known ids before names (`dv-hover.ts:45`). World tables and other packs match by exact name.

To verify in CPR v0.92.4:

7. Where CPR itself resolves DV tables (its DV ruler, DV display on tokens, roll dialogs), and whether it checks world RollTables before the configured compendium. If CPR ignores world tables, option W only affects Pneuma and option C becomes necessary.
8. The `dvRollTableCompendium` setting's key, scope, and whether CPR re-reads it without a reload.
9. Whether Heavy SMGs and other Autofire-capable weapons share the two native Autofire tables.

To confirm from Interface RED Volume 5:

10. Which weapon categories its Autofire tables cover, and their range bands. Whether they match the native range bands, since RollTable ranges are distance intervals.

## 5. Licensing

The go-public spec (fact 3.4) records that R. Talsorian Games' Homebrew Content Policy forbids reproducing rules text from official products, and requirement G2 commits this repo to copying none. Interface RED is an official RTG product, even though it is free. A table of DV numbers taken from it is arguably that rules content.

Options:

- **L1. Ship nothing from Interface RED** (proposed). The module ships the mechanism and an entry form or a paste box. The GM types or pastes the values from their own copy.
- **L2. Ask RTG** whether shipping the table values is acceptable, and ship them only with written permission.
- **L3. Ship the values.** Not recommended without L2.

Copying CPR's own native tables into a compendium we ship (option C in decision 2) has the same problem. If option C is needed, build the pack at runtime from the installed system's pack instead of shipping copies.

## 6. Requirements

- **R1.** With the Interface 5 setting on and values entered, Autofire DVs in Pneuma's exchange use the Interface 5 values for every covered weapon category.
- **R2.** The same holds for CPR's native DV display, subject to fact 7.
- **R3.** Single-shot DVs are unchanged.
- **R4.** Switching back to Core restores native DVs with no leftover module tables.
- **R5.** No Interface RED values are committed to the repo unless decision 3 changes.
- **R6.** The module never deletes or overwrites a table it did not create.

## 7. Architecture (option W)

| Unit                         | Responsibility                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/dv-tables.js`       | Settings menu, entry form, build and remove actions. GM only.                                                                        |
| `scripts/dv-rows.js` (pure)  | Validate entered rows: contiguous, non-overlapping distance ranges, integer DVs. Convert to RollTable result data. Unit-tested.      |
| World RollTables             | One per covered category, exact native name, flag `flags.cpr-autofire-homebrew.dvTable = true`.                                     |
| Hidden world setting         | The entered rows as JSON (decision 5).                                                                                                |

Build flow: GM opens the menu, enters or pastes rows per category, saves, and turns the setting on. The module creates or replaces its own world tables (decision 7). Pneuma picks them up on its next lookup. Its table cache is keyed by pack, so world tables are not cached (fact 2's code).

## 8. Outstanding questions

1. Decision 2: does CPR read world RollTables first (fact 7)? This decides W or C.
2. Decision 3: L1, L2, or L3?
3. Fact 10: which categories and range bands does Interface 5 cover?
4. Should the entry form accept a paste of a simple text format (one `min-max: DV` per line), to make entry from the PDF quick?
5. Is a per-weapon override useful (one weapon on core tables, another on Interface 5), or is world-wide enough?

## 9. Testing and acceptance

- Unit tests for `dv-rows.js`: gaps, overlaps, unsorted input, non-integer DVs, an open-ended last band.
- Manual: with Pneuma, attack in Autofire at distances on each band edge; the exchange DV matches the entered table. Switch to Core; the native DV returns. Single shot unchanged. A pre-existing GM world table with a native name blocks the build with a warning.

## 10. Out of scope

- Non-Autofire DV tables.
- Shipping Interface RED values (unless decision 3 changes).
- Foundry v13.
