# Interface 5 Autofire DV tables design spec

- Date: 2026-10-11
- Status: draft; reviewed 2026-10-13. Mechanism revised (decision 2); blocked on the book's contents (fact 10) and the licensing decision.
- Module: `cpr-autofire-homebrew` (this repo)
- Reviewed: 2026-10-13 against CPR v0.92.4 (`foundry-cpr/reference/fvtt-cyberpunk-red-core`, tag v0.92.4), Pneuma's Combat Tools 0.9.16 (`ca73a50`) and the installed 0.9.10, and RTG's release post for Interface RED Volume 5.

Facts about Pneuma's Combat Tools were read from its source on 2026-10-11 and rechecked on 2026-10-13; Pneuma paths are relative to `src/scripts/`. Facts about Cyberpunk RED Core were verified on 2026-10-13; CPR paths are relative to `src/` in the reference clone. The contents of Interface RED Volume 5 are still not available.

## 1. Rule

Requested by Lukasz (2026-10-11): adopt the Autofire DV tables from Interface RED Volume 5 in place of the core Autofire DV tables, and make them work with Pneuma's Combat Tools.

This is unrelated to Full Blast and has no source in the Autofire Compendium.

Review (2026-10-13): Interface RED Volume 5 is _Solo of Fortune 2045_ (fact 13). RTG describes its tables as new optional range tables, so they may cover more than Autofire (section 8, question 4).

## 2. Decisions

| #   | Decision                        | Proposed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Status |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Mechanism                       | Override by **RollTable name**, not by wrapping code. Both CPR and Pneuma resolve DVs from RollTables named after the weapon's `system.dvTable`, with " (Autofire)" appended in Autofire mode (facts 1 and 7). No libWrapper wrapper on DV lookup. Review: holds. Both read tables by name from the pack CPR's setting selects.                                                                                                                                                                                                                                                                                                                                                                                                           | Open   |
| 2   | Where the override lives        | **Option C2** (proposed in review): the module builds a world RollTable compendium at runtime, copies in every table of the currently selected DV pack, replaces the covered Autofire tables with the entered values, adds any new tables, and points CPR's `dvRollTableCompendium` setting at it (section 7). Rejected: **Option W**, world RollTables with the native names. CPR never reads world tables (fact 7), so Pneuma would show the new DVs while CPR's ruler shows core DVs, which fails R2, and CPR's item sheet could not select a new world table. Also rejected: **Option C**, a compendium shipped in the module. CPR's menu cannot select a module pack (fact 8), and it would ship copies of CPR's tables (section 5). | Open   |
| 3   | Licensing                       | Ship no Interface RED numbers. A GM action builds the tables from values the GM enters or pastes. See section 5.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Open   |
| 4   | Switching                       | A world setting "DV tables: Core / Interface 5". Review: under C2, switching to Interface 5 stores the current value of `dvRollTableCompendium` and sets it to the module's pack; switching to Core restores the stored value. Nothing is deleted on a switch. After either switch, each token's DV snapshot is stale (fact 7), so the module clears `flags["cyberpunk-red-core"].cprDvTable` on the viewed scene's tokens, or players click each DV glyph again.                                                                                                                                                                                                                                                                         | Open   |
| 5   | Storage of entered values       | A hidden world setting holding the table rows as JSON, so a rebuild needs no re-entry. Review: still needed under C2; the module's pack is rebuilt from it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Open   |
| 6   | New weapon categories           | If Interface 5 adds Autofire tables for weapon types that have none in core (fact 4), each must be named `<that weapon's dvTable> (Autofire)` or Pneuma will throw (fact 5). Review: under C2 the module adds such tables to its pack, plus any new base table, for example for machine guns (fact 13). A pistol with Autofire (compendium items spec, H1 and I6) looks up "DV Pistol (Autofire)", which neither CPR nor Pneuma has, so CPR shows no DV and Pneuma throws. The source's Pistol Autosear grants Autofire on a "Machine Pistol" basis, which suggests an official Machine Pistol table exists; which product holds it is unknown.                                                                                           | Open   |
| 7   | Conflict with a GM's own tables | Never overwrite a table this module did not create. Review: under C2 the module never edits CPR's pack, a GM's own pack, or world tables. It writes only to the world pack it created, identified by its stored id. If the GM already selected a custom DV pack, that pack is the copy source and stays untouched.                                                                                                                                                                                                                                                                                                                                                                                                                        | Open   |

## 3. Environment

- Foundry VTT v12 (12.343), Cyberpunk RED Core v0.92.4 (reference clone at tag v0.92.4, commit `75b8c9d`).
- Pneuma's Combat Tools `main` at 0.9.16 (`ca73a50`, the same commit as tag `v0.9.16`). The workspace's install moved from 0.9.10 to 0.9.16 on 2026-10-13. Release 0.9.10's DV lookup (facts 2 and 3) is the same (`dv-hover.js:19-41` in the compiled release).

## 4. Facts the design depends on

Verified in Pneuma 0.9.16 (rechecked 2026-10-13):

1. **Table name convention.** For a ranged attack, Pneuma builds the table name as `system.dvTable` plus `" (Autofire)"` in Autofire mode (`combat-resolution.ts:396`; 0.9.10: `combat-resolution.js:423`). Its DV display builds the same names (`dv-data.ts:10-15`). The DV hover shows an Autofire row only when Pneuma's `hoverAutofire` setting is on (default off) and the weapon has Suppressive Fire or is an SMG, Heavy SMG, or assault rifle (`dv-hover.ts:122`).
2. **Lookup order.** `getTable(name)` (`dv-hover.ts:33-53`) returns a world RollTable with that name first. Otherwise it uses the pack named by CPR's `dvRollTableCompendium` setting. It falls back to `cyberpunk-red-core.internal_dv-tables` only when the setting names no existing pack; a setting that names a pack of the wrong type returns nothing. The cache key is the pack plus the setting value plus the name (`:40`), and world tables return before the cache is read. The cache also stores misses. It is cleared on RollTable or TableResult changes, on `updateCompendium`, and when the setting changes (`:149-153`).
3. **No per-table fallback.** When `dvRollTableCompendium` names a valid pack that lacks a table, `getTable` returns nothing; it does not fall back to the native pack (`dv-hover.ts:46-47`).
4. **Native Autofire tables.** Only two exist in CPR's internal pack: "DV SMG (Autofire)" and "DV Assault Rifle (Autofire)" (`native-lookup.ts:35, 44`). This matches CPR's own pack (fact 9).
5. **Missing table is an error.** Pneuma throws "No ranged DV is available for this weapon and distance." when the lookup fails (`combat-resolution.ts:398`; 0.9.10: `:426`).
6. **Native ids.** For CPR's internal pack, Pneuma looks tables up by known ids before names (`dv-hover.ts:45`). World tables and other packs match by exact name.

Verified in CPR v0.92.4 (2026-10-13):

7. **CPR never reads world RollTables.** Every DV lookup goes through `GetDvTables()`, which reads only the pack in `dvRollTableCompendium` (`modules/utils/cpr-systemUtils.js:224-230`, through `GetCompendiumDocs` at `:44-46`). `GetRollTables` (`:265-272`), which would read world tables, is never called. The consumers:
   - The sheet's DV glyph matches a table by exact name and stores a snapshot of it on the token (`modules/item/mixins/cpr-loadable.js:39-48`; `SetDvTable` at `cpr-systemUtils.js:232-255`). In Autofire mode it appends " (Autofire)" to the weapon's dvTable (`cpr-loadable.js:44`).
   - The token HUD lists the pack's tables, except "DV Generic", and stores the chosen one the same way (`modules/hud/interface.js:18-49`).
   - The ruler label reads only that per-token snapshot, `flags["cyberpunk-red-core"].cprDvTable`, and never re-reads the pack (`modules/system/overrides.js:1-47`).
   - The item sheet's dvTable dropdown lists the pack's table names (`modules/item/sheet/cpr-item-sheet.js:122-133`).
   - Roll dialogs and chat cards use no DV.
8. **The setting.** The key is `dvRollTableCompendium`: scope world, `config: false`, type String, default `cyberpunk-red-core.internal_dv-tables` (`modules/system/settings.js:330-340`; the default is in `modules/system/config.js:407`). Its `onChange` only logs. The GM edits it in CPR's compendium settings menu, which offers only the default and world RollTable packs (`modules/apps/cpr-compendia-settings.js:60-68`; `cpr-systemUtils.js:11-18`). A module pack can be set only with `game.settings.set`, since the setting declares no choices. CPR re-reads it on every `GetDvTables()` call, but ruler labels keep the token snapshot until the DV glyph is clicked again.
9. **Weapons and their tables.** CPR's internal pack (`packs/internal/dv-tables/`) has 13 tables, and its only Autofire tables are "DV SMG (Autofire)" and "DV Assault Rifle (Autofire)". No core item uses `weaponType: heavySmg`: the Heavy SMG is `smg` with `DV SMG` and autoFire 3 (`packs/core/weapons/weapon.heavy.smg.yaml`). SMGs use `DV SMG` and assault rifles use `DV Assault Rifle`. No core pistol has Autofire.

To confirm from Interface RED Volume 5:

10. Which tables it contains (Autofire only, or single shot too), which weapon categories they cover, and their range bands. Whether the bands match the native ones (fact 12). RollTable ranges are integer distance intervals, so non-integer or open-ended bands need a convention.

Added in review (2026-10-13):

11. **Items whose dvTable is already an Autofire table.** The Tsunami Arms Helix uses `DV Assault Rifle (Autofire)`, and the Pepper Shaker and Big Dreem use `DV SMG (Autofire)`. In Autofire mode CPR builds "... (Autofire) (Autofire)", finds nothing, and shows no DV (`cpr-loadable.js:44`). Pneuma appends the same suffix (fact 1) and throws in Autofire mode (fact 5). This is an existing bug, not one this module causes; the compendium items spec's H2 touches the Helix.
12. **Table structure.** Each result is a text result with an integer `range` [lo, hi] in scene distance units; its text is the DV or "N/A". The native bands are 0-6, 7-12, 13-25, 26-50, 51-100, 101-200, 201-400, and 401-800. The ruler compares each segment's distance, truncated with `parseInt`, not the whole path (`modules/system/overrides.js:7, 26-36`). Past 800, or on "N/A", no DV label shows; there is no error and no clamp.
13. **Interface RED Volume 5** is _Solo of Fortune 2045_, released 2026-01-24 and sold only on DriveThruRPG ([RTG's release post](https://rtalsoriangames.com/2026/01/24/cyberpunk-red-alert-interface-red-volume-5-solo-of-fortune-2045-released/)). It is likely a paid product. The post says it adds new optional range tables, machine guns, power armor, and many new weapons.

## 5. Licensing

The go-public spec (fact 3.4) records that R. Talsorian Games' Homebrew Content Policy forbids reproducing rules text from official products, and requirement G2 commits this repo to copying none. Interface RED Volume 5 is an official RTG product, and likely a paid one sold only on DriveThruRPG (fact 13). A table of DV numbers taken from it is arguably that rules content.

Options:

- **L1. Ship nothing from Interface RED** (proposed). The module ships the mechanism and an entry form or a paste box. The GM types or pastes the values from their own copy. Review: a paid product strengthens L1.
- **L2. Ask RTG** whether shipping the table values is acceptable, and ship them only with written permission. Review: unlikely to be granted for a paid product.
- **L3. Ship the values.** Not recommended without L2.

Copying CPR's own native tables into a compendium we ship has the same problem. Option C2 avoids it: it copies the tables at runtime from the installed system's pack, or from the GM's selected pack, so the repo ships none.

## 6. Requirements

- **R1.** With the Interface 5 setting on and values entered, Autofire DVs in Pneuma's exchange use the Interface 5 values for every covered weapon category.
- **R2.** The same holds for CPR's native DV display (the DV glyph, the token HUD, and the ruler label) once each token's DV snapshot is refreshed (decision 4). Review: achievable under C2; not achievable under W (fact 7).
- **R3.** Single-shot DVs are unchanged (subject to section 8, question 4).
- **R4.** Switching back to Core restores the previously selected DV pack and its DVs. The module's pack stays in the world, unselected, until the GM removes it.
- **R5.** No Interface RED values are committed to the repo unless decision 3 changes.
- **R6.** The module never deletes or overwrites a table or pack it did not create.
- **R7.** If the GM already uses a custom DV pack, the module copies from it and leaves it untouched.

## 7. Architecture (option C2)

| Unit                        | Responsibility                                                                                                                                                                                                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/dv-tables.js`      | Settings menu, entry form, and the build, switch, and remove actions. GM only.                                                                                                                                                                                                                             |
| `scripts/dv-rows.js` (pure) | Validate entered rows: contiguous, non-overlapping distance ranges, integer DVs. Convert to RollTable result data. Unit-tested.                                                                                                                                                                            |
| World RollTable compendium  | Created by the module with `CompendiumCollection.createCompendium({ type: "RollTable", label, name })`, which needs a GM. Holds a copy of every table in the source pack, with the covered Autofire tables replaced and new tables added. Each table carries `flags.cpr-autofire-homebrew.dvTable = true`. |
| Hidden world settings       | The entered rows as JSON (decision 5), the module pack's id, and the `dvRollTableCompendium` value to restore on switch-off.                                                                                                                                                                               |

Build flow:

1. The GM opens the menu, enters or pastes rows per category, and saves.
2. **Build.** The source pack is the current `dvRollTableCompendium` value, or the stored previous value when the setting already points at the module's pack. The module creates its world pack if it is missing, replaces that pack's tables with copies of the source pack's tables, and then writes the entered tables over the covered names, adding any new ones.
3. **Switch on.** Store the current setting value, call `game.settings.set("cyberpunk-red-core", "dvRollTableCompendium", <module pack id>)`, and clear `flags["cyberpunk-red-core"].cprDvTable` on the viewed scene's tokens, or tell players to click the DV glyph again.
4. **Switch off.** Restore the stored value and clear the snapshots again.
5. Pneuma picks up either change on its next lookup, because a change to the setting clears its cache (fact 2).
6. **Remove.** Switch off first, then delete the module's pack.

## 8. Outstanding questions

1. Decision 2: answered in review. CPR reads no world tables (fact 7), so option W cannot meet R2. Confirm option C2.
2. Decision 3: L1, L2, or L3?
3. Fact 10: which categories and range bands does _Solo of Fortune 2045_ cover?
4. Should the book's non-Autofire tables be in scope? RTG calls them optional range tables (fact 13), so they may replace single-shot tables too. Machine guns would need both a base table and an Autofire table, which C2 can add.
5. Does Lukasz own _Solo of Fortune 2045_? The design cannot be finished without its table list.
6. Should the entry form accept a paste of a simple text format (one `min-max: DV` per line), to make entry from the PDF quick?
7. Is a per-weapon override useful (one weapon on core tables, another on Interface 5), or is world-wide enough?

## 9. Testing and acceptance

- Unit tests for `dv-rows.js`: gaps, overlaps, unsorted input, non-integer DVs, an open-ended last band.
- Manual:
  - With Pneuma, attack in Autofire at distances on each band edge; the exchange DV matches the entered table.
  - Without Pneuma, select Autofire on the sheet, click the DV glyph, and measure to each band edge; the ruler label matches the entered table. CPR's fire-mode toggle writes an unscoped `flags.cprDvTable` that the ruler never reads (`modules/actor/sheet/cpr-actor-sheet.js:1094-1112`), so after selecting Autofire the ruler likely keeps the single-shot table until the glyph is clicked again.
  - Switch on and off; the module clears the token snapshots (or the glyph is clicked again), and the expected DVs show in both Pneuma and the ruler.
  - Single shot unchanged.
  - With a GM's own DV pack selected before the build: the module's pack is copied from it, the GM's pack is unchanged afterwards, and switching off selects it again.
  - The weapon item sheet's dvTable dropdown lists any new table the module added.

## 10. Out of scope

- Non-Autofire DV tables (pending section 8, question 4).
- Shipping Interface RED values (unless decision 3 changes).
- Fixing CPR's double-suffix bug for items whose dvTable is already an Autofire table (fact 11).
- Foundry v13.
