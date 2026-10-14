# Adjustable Gas Piston gating design spec

- Date: 2026-10-11
- Status: approved 2026-10-13. Lukasz accepted the review's recommendations for decisions 2 to 12; question 6 (asking the author before shipping the item) is open until the PR merges.
- Plan: docs/superpowers/plans/2026-10-13-gas-piston-gating.md
- Reviewed: 2026-10-13 against CPR v0.92.4 (`foundry-cpr/reference/fvtt-cyberpunk-red-core`, tag v0.92.4), Pneuma's Combat Tools 0.9.16 (`ca73a50`) and the installed 0.9.10, and the source Google Doc.
- Module: `cpr-autofire-homebrew` (this repo)
- Tracks: issue #10, "Gate Full Blast per weapon (Adjustable Gas Piston as a tech upgrade)"
- Follow-up: `2026-10-11-autofire-compendium-items-design.md` (the source's other items)

The Cyberpunk RED Core verify items were checked against the v0.92.4 source on 2026-10-13 and are now in section 4 with citations.

## 1. Rule

Summarized in this project's words (go-public spec G2: copy no source or RTG text).

In _Heavy Armor Lizard's Autofire Compendium_, the Adjustable Gas Piston is an invented tech upgrade for a weapon capable of Autofire. Inventing it is an Upgrade DV24 check. Its first cost is the cost of the item being upgraded, and its second cost is 1,000eb. Only a weapon carrying it may Full Blast: spend double ammunition on an Autofire attack to add 1 to each damage die (max 6) before the multiplier. The source's alternate rule rolls 3d6 and drops the lowest instead.

This summary was checked against the source on 2026-10-13.

Today the module offers Full Blast on every Autofire weapon (README, "Differences from the source"). This work makes the upgrade requirement available as an option.

Requested by Lukasz (2026-10-11): the requirement is **off by default** and enabled in settings. The Gas Piston item ships in a compendium.

## 2. Decisions

| #   | Decision                                   | Proposed                                                                                                                                                                                                                                                                                                                                                                                                                   | Status  |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Default                                    | Gating off. Every Autofire weapon keeps Full Blast until the GM turns gating on.                                                                                                                                                                                                                                                                                                                                           | Decided |
| 2   | Setting scope                              | `world`, `config: true`, Boolean. A table rule the GM sets, like the two Optional Rules settings. The request said "user settings"; confirm that means module settings, not per-player `client` scope. Review: world scope recommended. Client scope would let each player decide whether their own weapon needs a piston.                                                                                                 | Decided |
| 3   | How a weapon "has" the piston              | A native CPR `itemUpgrade` item installed in the weapon, marked with a module flag. Replaces issue #10's per-weapon checkbox: it uses CPR's own upgrade slots and the item can carry the cost. Review: the CPR data model supports this at no extra cost (facts 8 to 10).                                                                                                                                                  | Decided |
| 4   | Detection                                  | Match the module flag `flags.cpr-autofire-homebrew.gasPiston === true` on any installed upgrade. Not by name, so a renamed or translated copy still counts. Review: the flag survives install, uninstall, and copies (fact 10), so no `_stats.compendiumSource` fallback is needed.                                                                                                                                        | Decided |
| 5   | Prompt for a gated weapon without a piston | No prompt. Standard Autofire runs natively, as if this module were off for that attack.                                                                                                                                                                                                                                                                                                                                    | Decided |
| 6   | Damage dialog "Full Blast?" checkbox       | Under gating, the checkbox shows only for a roll that started as Full Blast or a weapon with the piston. It is decided once, when the damage roll is created, so ticking or unticking it never makes it disappear. Review: hiding it unconditionally collides with decision 7. An old Full Blast card from a weapon without a piston rolls with `isFullBlast` already true, so the toggle would stay active but invisible. | Decided |
| 7   | Old Full Blast cards after gating turns on | They still roll Full Blast damage. The attack was legal when made.                                                                                                                                                                                                                                                                                                                                                         | Decided |
| 8   | Upgrade slots                              | The item takes 0 slots, because the source makes it an invention, not an attachment. Review: supported. `system.size` allows 0, and CPR's capacity check passes it (fact 9).                                                                                                                                                                                                                                               | Decided |
| 9   | Restrict installation to Autofire weapons  | Not enforced by code. The item description states the restriction; a piston on a non-Autofire weapon does nothing. Review: CPR restricts upgrades by item type only, and only in its UI selection paths (`cpr-installable.js:33-36`, `cpr-container.js:112-118`). `installItems` itself does not check the type, and there is no fire-mode filter (fact 9).                                                                | Decided |
| 10  | Item data                                  | Name, a description in our words, the 1,000eb second cost as price, and the DV24 invention check and the first cost stated in the description. Review: supported. The price field is `system.price.market`, modifiers may all be null, and CPR has no item field for an invention DV (fact 9).                                                                                                                             | Decided |
| 11  | Compendium build                           | JSON sources in `packs/_source/`, compiled to LevelDB with `@foundryvtt/foundryvtt-cli` by an `npm run packs` script and by the release workflow. Breaks the repo's "no build step" convention for packs only (section 6.3). Review: gitignore the compiled LevelDB, build it in the release workflow, and run `npm run packs` for development (section 6.3).                                                              | Decided |
| 12  | Alternate rule (3d6, drop lowest)          | Out of scope. A possible later world setting.                                                                                                                                                                                                                                                                                                                                                                              | Decided |

Rejected so far:

- **A checkbox on the weapon sheet** (issue #10's proposal). It needs a sheet render hook on CPR's item sheet, carries no cost, and would duplicate what CPR's upgrade slots already model.
- **Matching by item name.** Breaks on renames and translations.
- **Also accepting `_stats.compendiumSource`** (decision 4's former alternative). The flag already survives every install path.

## 3. Environment

- Foundry VTT v12 (verified 12.343). Cyberpunk RED Core v0.92.4. libWrapper required.
- This repo at `main` 368119e (v0.3.0, with PRs #11, #12, and #13 merged). The repo is public.
- The README section "Differences from the source" that section 1 cites came with PR #11.
- Pneuma's Combat Tools: facts were read at `main` 0.9.16 (`ca73a50`, tag `v0.9.16`). The workspace's Foundry install moved from 0.9.10 to 0.9.16 on 2026-10-13, and Full Blast was re-verified live against it; the module's verified Pneuma version moved to 0.9.16 in PR #13.
- CPR reference source: `foundry-cpr/reference/fvtt-cyberpunk-red-core/` at tag v0.92.4. Available; CPR paths in section 4 are relative to its `src/`.

## 4. Facts the design depends on

Pneuma paths are relative to its `src/scripts/`. CPR paths are relative to `src/` in the reference clone.

Verified by reading this repo and Pneuma's source on 2026-10-11, and rechecked on 2026-10-13:

1. **The single prompt entry point.** `wrapCreateRoll` (`scripts/full-blast.js:71`) decorates the attack with the Full Blast prompt only when `type === "autofire" && this.system.isRanged && typeof this.bulletConsumption === "function"` (`:80-85`). Adding the gating condition there removes the prompt everywhere.
2. **Pneuma goes through the same entry point.** A HUD attack runs `attackFromHUD`, then `startCombatExchange`, then `item.createRoll(mode, actor)` (`combat-resolution.ts:390`, Pneuma 0.9.16). Pneuma's sheet routing calls `attackFromHUD` too. It is off by default (`routeSheetAttacks`); when off, the CPR sheet calls `createRoll` natively. So decision 5 applies to Pneuma's HUD, its sheet routing, and the plain sheet with no Pneuma-specific code.
3. **Ammo cost follows the roll flag.** The `loadMixins` wrapper doubles `bulletConsumption` only when `roll.isFullBlast` is set (`full-blast.js:148-160`). A gated weapon never sets the flag, so it always pays the native cost.
4. **Pneuma's Full Blast damage path needs a marked exchange.** `takePneumaFullBlast` (`scripts/pneuma.js`) only returns true for an exchange whose stored HTML carries `MARKER_CLASS`, which exists only after the prompt chose Full Blast. Gating needs no change there.
5. **The damage checkbox.** `addDamageCheckbox` (`full-blast.js:227`) adds "Full Blast?" to any decorated Autofire damage roll. It has no gating check yet.
6. **Settings pattern.** `register()` registers world Boolean settings with names under `CPR_AUTOFIRE_HOMEBREW.Settings.<Label>` (`full-blast.js:41-52`).

Verified in CPR v0.92.4 on 2026-10-13:

7. **Installed items.** CPR's `getInstalledItems(type)` (`modules/item/mixins/cpr-container.js:60-77`) returns the Item documents listed in the weapon's `system.installedItems.list`, filtered by type. The list is maintained only in `cpr-container.js`. Side note: Pneuma's `Loadable` interface declares the same method (`weapon-ammo.ts:18`).
8. **Owned and unowned items.** `getInstalledItems` resolves ids with `actor.getOwnedItem(id)` on an actor-owned weapon and with `game.items.get(id)` on a world item, so both work. A compendium item keeps its contents only as `flags.cprInstallTree`, so the method effectively returns `[]` there. Upgrade effects are inert on unowned items (`cpr-upgradable.js:28, 69`), which does not matter here: gating is checked at attack time, on an owned weapon.
9. **The `itemUpgrade` data model.**
   - Target type: `system.type`, a StringField with initial `"weapon"`, whose choices are the upgradable types armor, clothing, cyberdeck, cyberware, gear, vehicle, and weapon (`modules/datamodels/item/itemUpgrade-datamodel.js:84-87`). There is no subtype, weapon-type, or fire-mode filter.
   - Slot size: `system.size`, an integer with `min: 0` and initial 1 (`modules/datamodels/item/mixins/installable-schema.js:14-20`). The capacity check (`cpr-container.js:200-211`) and the actor-sheet check (`cpr-installable.js:31`) both pass a size of 0. Core vehicle upgrades already use 0.
   - Price: `system.price.market`, an integer with min 0 (`modules/datamodels/item/mixins/valuable-schema.js:9-17`).
   - Modifiers: every value may be null. Null and 0 are skipped (`modules/item/mixins/cpr-upgradable.js:37`). The core Bayonet ships with every value null.
   - No item has an invention DV field.
10. **Flags survive.** On an actor, install pushes the upgrade's id onto the list and uninstall splices it out; the upgrade stays the same embedded document (`cpr-container.js:248-276, 372-381, 427-440`). Copies between actors, from world to actor, and into compendium install trees are made with `toObject()`, which keeps flags but assigns new ids (`cpr-container.js:534-571`, `modules/item/cpr-item.js:231-288`).
11. **The damage dialog has the item.** `CPRRollDialog` stores the item next to the roll (`modules/dialog/cpr-roll-dialog.js:15-30`, `this.item = item`), so a `renderCPRRollDialog` hook can read `app.item`. For a `secondaryWeapon` upgrade, `app.item` is the itemUpgrade itself. The implementation does not use it: it decides the checkbox when the damage roll is created, where `this` is the weapon.

## 5. Requirements

- **R1.** A world setting "Require the Adjustable Gas Piston for Full Blast", default off.
- **R2.** Gating off: behavior is identical to v0.3.0.
- **R3.** Gating on, weapon with a piston installed: behavior is identical to v0.3.0.
- **R4.** Gating on, weapon without a piston: no Full Blast prompt, native Autofire, native ammo cost. This holds from the character sheet, Pneuma's HUD, and Pneuma's sheet routing.
- **R5.** Gating on, weapon without a piston: the damage dialog shows no "Full Blast?" checkbox unless the roll is already Full Blast (decision 6).
- **R6.** The compendium "Autofire Homebrew Items" contains the Adjustable Gas Piston, marked with the module flag, described in our words, and crediting its author.
- **R7.** All new strings come from `lang/en.json`.
- **R8.** The release `module.zip` contains the compiled pack, and the go-public spec's G9 file list is updated to match.

## 6. Architecture

### 6.1 Code

| File                      | Change                                                                                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/gating.js` (new) | Pure: `allowsFullBlast(gatingOn, hasPiston)` and `hasGasPiston(upgrades)`, which takes plain objects. No Foundry globals, so it is unit-tested.                                                                                                                                |
| `scripts/full-blast.js`   | Register the setting. Add `fullBlastAllowed(item)` and use it in the `wrapCreateRoll` eligibility check (fact 1) and, when a damage roll is created, to decide whether its dialog shows the "Full Blast?" checkbox (fact 5). A roll that started as Full Blast always gets it. |
| `scripts/constants.js`    | `GAS_PISTON_FLAG = "gasPiston"`. The setting key stays in `full-blast.js` with the other setting keys.                                                                                                                                                                         |
| `lang/en.json`            | Setting name and hint. The pack label stays literal in `module.json`; Foundry v12 does not localize it.                                                                                                                                                                        |
| `test/gating.test.js`     | Unit tests (section 8).                                                                                                                                                                                                                                                        |

`fullBlastAllowed(item)` reads `item.getInstalledItems("itemUpgrade")` (fact 7). In `wrapCreateRoll`, `this` is already the weapon. With gating off it skips the lookup.

### 6.2 Compendium

- `module.json` gets `packs: [{ name: "autofire-homebrew-items", label: "Autofire Homebrew Items", path: "packs/autofire-homebrew-items", type: "Item", system: "cyberpunk-red-core" }]`.
- The item source is JSON in `packs/_source/autofire-homebrew-items/`. The follow-up items spec adds to the same pack.

### 6.3 Build

- `npm run packs` compiles the JSON source to LevelDB with `@foundryvtt/foundryvtt-cli`.
- The release workflow runs it before zipping and adds `packs/` to the zip. `packs/_source/` stays out of the zip. The workflow exists in PR #11 (`chore/public-release-0.3.0`); its zip list (G9) must gain `packs/`.
- Proposed: gitignore the compiled LevelDB. A fresh clone runs `npm run packs` before Foundry sees the pack, and CONTRIBUTING says so. Reasons, likely rather than certain:
  - Foundry rewrites LevelDB pack files when it opens them, so committed packs would churn in every diff.
  - `compilePack` fails while Foundry holds the pack open. With `npm run link` the clone is the live install, so close the world before running `npm run packs`.

## 7. Outstanding questions

1. Decision 2: is "user settings" world scope (GM) or per-player? World is recommended. Decided 2026-10-13: world.
2. Decision 3: is a native upgrade item the right model, or is issue #10's checkbox preferred for simplicity? The data model supports the upgrade item (facts 8 to 10). Decided 2026-10-13: the upgrade item.
3. Decision 7: should old Full Blast cards be blocked once gating is on? Decided 2026-10-13: no; they still roll Full Blast damage (decision 7).
4. Decision 11: is a pack build step acceptable? Answered in part: the compiled pack should be ignored, not committed (section 6.3). Decided 2026-10-13: yes; the compiled pack is gitignored and built in CI and the release.
5. Does Pneuma's HUD need to show anything different for a gated weapon? Today it disables Autofire below 10 rounds and knows nothing about Full Blast, which stays true. Decided 2026-10-13: no change to Pneuma's HUD is needed.
6. Permission and credit: the go-public spec plans to tell u/Infernox-Ratchet the rule is credited. Shipping the item itself in a compendium may merit asking first.

## 8. Testing and acceptance

Unit tests (`npm test`):

| Case                                                | Expected           |
| --------------------------------------------------- | ------------------ |
| `allowsFullBlast(false, false)`, `(false, true)`    | allowed            |
| `allowsFullBlast(true, true)`                       | allowed            |
| `allowsFullBlast(true, false)`                      | blocked            |
| `hasGasPiston([])`, upgrade without flag, with flag | false, false, true |

Manual checklist (Foundry v12, CPR 0.92.4, libWrapper; Pneuma on for M5 and M6):

| #   | Steps                                                                       | Expected                                        | Req |
| --- | --------------------------------------------------------------------------- | ----------------------------------------------- | --- |
| M1  | Gating off, Autofire from the sheet with no piston                          | Full Blast prompt as in v0.3.0                  | R2  |
| M2  | Gating on, no piston, Autofire from the sheet                               | No prompt, 10 rounds, native card               | R4  |
| M3  | Gating on, piston installed                                                 | Prompt; Full Blast works as in v0.3.0           | R3  |
| M4  | Gating on, no piston, sheet damage button                                   | No "Full Blast?" checkbox                       | R5  |
| M5  | Gating on, no piston, Pneuma HUD Autofire                                   | No prompt, 10 rounds                            | R4  |
| M6  | Gating on, piston installed, Pneuma HUD Full Blast and damage               | As in v0.3.0                                    | R3  |
| M7  | Uninstall the piston, attack again                                          | No prompt                                       | R4  |
| M8  | Open the compendium; drag the piston onto an actor and install              | Flag present after install                      | R6  |
| M9  | Install from the release zip on a clean world                               | Pack present and readable                       | R8  |
| M10 | Full Blast card made before gating, weapon without a piston, then gating on | Damage rolls Full Blast; checkbox shown, ticked | R5  |

## 9. Out of scope

- The source's other items (follow-up spec).
- The alternate 3d6-drop-lowest rule.
- Enforcing the DV24 invention check, the first cost, or the 1,000eb second cost.
- Cyberware weapons and secondary-weapon upgrades with Autofire. The shipped piston installs only in weapons, so with gating on they cannot Full Blast. A copy of the piston with its upgrade type set to cyberware should count for a cyberware weapon, since detection matches the flag (untested); a secondary-weapon upgrade cannot carry one. No core CPR cyberware or upgrade has Autofire.
- Foundry v13.
