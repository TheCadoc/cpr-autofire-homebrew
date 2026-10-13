# Adjustable Gas Piston gating design spec

- Date: 2026-10-11
- Status: draft; decisions open (section 2). Not approved.
- Module: `cpr-autofire-homebrew` (this repo)
- Tracks: issue #10, "Gate Full Blast per weapon (Adjustable Gas Piston as a tech upgrade)"
- Follow-up: `2026-10-11-autofire-compendium-items-design.md` (the source's other items)

This spec was drafted away from the workstation. Facts about this repo and Pneuma's Combat Tools were read from source on 2026-10-11 (section 4). Facts about Cyberpunk RED Core were not re-read; they are marked **verify** and must be checked against the v0.92.4 reference source before the plan is written.

## 1. Rule

Summarized in this project's words (go-public spec G2: copy no source or RTG text).

In _Heavy Armor Lizard's Autofire Compendium_, the Adjustable Gas Piston is an invented tech upgrade for a weapon capable of Autofire. Inventing it is an Upgrade DV24 check, and its second cost is 1,000eb. Only a weapon carrying it may Full Blast: spend double ammunition on an Autofire attack to add 1 to each damage die (max 6) before the multiplier. The source's alternate rule rolls 3d6 and drops the lowest instead.

Today the module offers Full Blast on every Autofire weapon (README, "Differences from the source"). This work makes the upgrade requirement available as an option.

Requested by Lukasz (2026-10-11): the requirement is **off by default** and enabled in settings. The Gas Piston item ships in a compendium.

## 2. Decisions

| #   | Decision                                   | Proposed                                                                                                                                                                                                                         | Status  |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Default                                    | Gating off. Every Autofire weapon keeps Full Blast until the GM turns gating on.                                                                                                                                                 | Decided |
| 2   | Setting scope                              | `world`, `config: true`, Boolean. A table rule the GM sets, like the two Optional Rules settings. The request said "user settings"; confirm that means module settings, not per-player `client` scope.                           | Open    |
| 3   | How a weapon "has" the piston              | A native CPR `itemUpgrade` item installed in the weapon, marked with a module flag. Replaces issue #10's per-weapon checkbox: it uses CPR's own upgrade slots and the item can carry the cost.                                    | Open    |
| 4   | Detection                                  | Match the module flag `flags.cpr-autofire-homebrew.gasPiston === true` on any installed upgrade. Not by name, so a renamed or translated copy still counts. Alternative: also accept `_stats.compendiumSource` pointing at our item. | Open    |
| 5   | Prompt for a gated weapon without a piston | No prompt. Standard Autofire runs natively, as if this module were off for that attack.                                                                                                                                          | Open    |
| 6   | Damage dialog "Full Blast?" checkbox       | Not shown for a weapon without the piston while gating is on (issue #10, open question 2). Shown as today otherwise.                                                                                                             | Open    |
| 7   | Old Full Blast cards after gating turns on | They still roll Full Blast damage. The attack was legal when made.                                                                                                                                                               | Open    |
| 8   | Upgrade slots                              | The item takes 0 slots, because the source makes it an invention, not an attachment. Needs CPR's `itemUpgrade` slot field confirmed (**verify**).                                                                                | Open    |
| 9   | Restrict installation to Autofire weapons  | Not enforced by code. CPR's upgrade type can target weapons but not "weapons with Autofire" (**verify**). The item description states the restriction; a piston on a non-Autofire weapon does nothing.                           | Open    |
| 10  | Item data                                  | Name, a description in our words, the 1,000eb second cost as price, and the DV24 invention check stated in the description. CPR has no field for an invention DV (**verify**).                                                   | Open    |
| 11  | Compendium build                           | JSON sources in `packs/_source/`, compiled to LevelDB with `@foundryvtt/foundryvtt-cli` by an `npm run packs` script and by the release workflow. Breaks the repo's "no build step" convention for packs only (section 6.3).       | Open    |
| 12  | Alternate rule (3d6, drop lowest)          | Out of scope. A possible later world setting.                                                                                                                                                                                    | Open    |

Rejected so far:

- **A checkbox on the weapon sheet** (issue #10's proposal). It needs a sheet render hook on CPR's item sheet, carries no cost, and would duplicate what CPR's upgrade slots already model.
- **Matching by item name.** Breaks on renames and translations.

## 3. Environment

- Foundry VTT v12 (verified 12.343). Cyberpunk RED Core v0.92.4. libWrapper required.
- This repo at `main` d751974 (v0.3.0 with Optional Rules), public since 2026-10-11.
- Pneuma's Combat Tools: `main` at version 0.9.16, cloned 2026-10-11. The README states 0.9.10 as verified.
- CPR reference source: `foundry-cpr/reference/fvtt-cyberpunk-red-core/` at tag v0.92.4 (not available when this spec was drafted).

## 4. Facts the design depends on

Verified by reading source on 2026-10-11:

1. **The single prompt entry point.** `wrapCreateRoll` (`scripts/full-blast.js:71`) decorates the attack with the Full Blast prompt only when `type === "autofire" && this.system.isRanged && typeof this.bulletConsumption === "function"` (`:79-85`). Adding the gating condition there removes the prompt everywhere.
2. **Pneuma goes through the same entry point.** Pneuma's single-target exchange calls `item.createRoll(mode, actor)` (`combat-resolution.ts`, about line 390, Pneuma 0.9.16). So decision 5 applies to Pneuma's HUD and its sheet routing with no Pneuma-specific code.
3. **Ammo cost follows the roll flag.** The `loadMixins` wrapper doubles `bulletConsumption` only when `roll.isFullBlast` is set (`full-blast.js:148-160`). A gated weapon never sets the flag, so it always pays the native cost.
4. **Pneuma's Full Blast damage path needs a marked exchange.** `takePneumaFullBlast` (`scripts/pneuma.js`) only returns true for an exchange whose stored HTML carries `MARKER_CLASS`, which exists only after the prompt chose Full Blast. Gating needs no change there.
5. **The damage checkbox.** `addDamageCheckbox` (`full-blast.js:227`) adds "Full Blast?" to any decorated Autofire damage roll. It has the roll but not yet a gating check.
6. **Settings pattern.** `register()` registers world Boolean settings with names under `CPR_AUTOFIRE_HOMEBREW.Settings.<Label>` (`full-blast.js:41-52`).
7. **Installed items.** Pneuma's types declare a CPR item method `getInstalledItems(type)` (`weapon-ammo.ts`, `Loadable` interface), and a weapon's installed item ids live in `system.installedItems.list` (`aoe/workflow.ts:363` builds a synthetic weapon with that shape).

To verify in CPR v0.92.4:

8. `getInstalledItems("itemUpgrade")` returns the upgrades installed in a weapon, on owned and unowned items.
9. The `itemUpgrade` data model: upgrade target type, slot size field, price field, and whether its `modifiers` can be empty.
10. Whether an installed upgrade's flags survive install and uninstall unchanged.

## 5. Requirements

- **R1.** A world setting "Require the Adjustable Gas Piston for Full Blast", default off.
- **R2.** Gating off: behavior is identical to v0.3.0.
- **R3.** Gating on, weapon with a piston installed: behavior is identical to v0.3.0.
- **R4.** Gating on, weapon without a piston: no Full Blast prompt, native Autofire, native ammo cost. This holds from the character sheet, Pneuma's HUD, and Pneuma's sheet routing.
- **R5.** Gating on, weapon without a piston: the damage dialog shows no "Full Blast?" checkbox (decision 6).
- **R6.** The compendium "Autofire Homebrew Items" contains the Adjustable Gas Piston, marked with the module flag, described in our words, and crediting its author.
- **R7.** All new strings come from `lang/en.json`.
- **R8.** The release `module.zip` contains the compiled pack, and the go-public spec's G9 file list is updated to match.

## 6. Architecture

### 6.1 Code

| File                      | Change                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/gating.js` (new) | Pure: `requiresPiston(gatingOn, hasPiston)` and `hasPistonFlag(upgrades, flagPath)`, which takes plain objects. No Foundry globals, so it is unit-tested.                |
| `scripts/full-blast.js`   | Register the setting. Add `fullBlastAllowed(item)` and use it in the `wrapCreateRoll` eligibility check (fact 1) and in `addDamageCheckbox` (fact 5).                    |
| `scripts/constants.js`    | `GAS_PISTON_FLAG = "gasPiston"` and the setting key.                                                                                                                      |
| `lang/en.json`            | Setting name and hint, compendium label.                                                                                                                                 |
| `test/gating.test.js`     | Unit tests (section 8).                                                                                                                                                  |

`addDamageCheckbox` needs the weapon. The damage roll's item must be recorded when `wrapCreateRoll` decorates it, for example in a `WeakMap` from roll to item, because `app.rollData` holds only the roll.

### 6.2 Compendium

- `module.json` gets `packs: [{ name: "autofire-homebrew-items", label: "Autofire Homebrew Items", path: "packs/autofire-homebrew-items", type: "Item", system: "cyberpunk-red-core" }]`.
- The item source is JSON in `packs/_source/autofire-homebrew-items/`. The follow-up items spec adds to the same pack.

### 6.3 Build

- `npm run packs` compiles the JSON source to LevelDB with `@foundryvtt/foundryvtt-cli`.
- The release workflow runs it before zipping and adds `packs/` to the zip. `packs/_source/` stays out of the zip.
- Open: commit the compiled LevelDB or ignore it. Ignoring it keeps diffs clean but means a fresh clone must run `npm run packs` before Foundry sees the pack, which CONTRIBUTING then states.

## 7. Outstanding questions

1. Decision 2: is "user settings" world scope (GM) or per-player?
2. Decision 3: is a native upgrade item the right model, or is issue #10's checkbox preferred for simplicity?
3. Decision 7: should old Full Blast cards be blocked once gating is on?
4. Decision 11: is a pack build step acceptable, and should compiled packs be committed?
5. Does Pneuma's HUD need to show anything different for a gated weapon? Today it disables Autofire below 10 rounds and knows nothing about Full Blast, which stays true.
6. Permission and credit: the go-public spec plans to tell u/Infernox-Ratchet the rule is credited. Shipping the item itself in a compendium may merit asking first.

## 8. Testing and acceptance

Unit tests (`npm test`):

| Case                                                 | Expected |
| ---------------------------------------------------- | -------- |
| `requiresPiston(false, false)`, `(false, true)`      | allowed  |
| `requiresPiston(true, true)`                         | allowed  |
| `requiresPiston(true, false)`                        | blocked  |
| `hasPistonFlag([])`, upgrade without flag, with flag | false, false, true |

Manual checklist (Foundry v12, CPR 0.92.4, libWrapper; Pneuma on for M5-M6):

| #  | Steps                                                         | Expected                              | Req    |
| -- | ------------------------------------------------------------- | ------------------------------------- | ------ |
| M1 | Gating off, Autofire from the sheet with no piston             | Full Blast prompt as in v0.3.0        | R2     |
| M2 | Gating on, no piston, Autofire from the sheet                  | No prompt, 10 rounds, native card     | R4     |
| M3 | Gating on, piston installed                                    | Prompt; Full Blast works as in v0.3.0 | R3     |
| M4 | Gating on, no piston, sheet damage button                      | No "Full Blast?" checkbox             | R5     |
| M5 | Gating on, no piston, Pneuma HUD Autofire                      | No prompt, 10 rounds                  | R4     |
| M6 | Gating on, piston installed, Pneuma HUD Full Blast and damage  | As in v0.3.0                          | R3     |
| M7 | Uninstall the piston, attack again                             | No prompt                             | R4     |
| M8 | Open the compendium; drag the piston onto an actor and install | Flag present after install            | R6     |
| M9 | Install from the release zip on a clean world                  | Pack present and readable             | R8     |

## 9. Out of scope

- The source's other items (follow-up spec).
- The alternate 3d6-drop-lowest rule.
- Enforcing the DV24 invention check or the 1,000eb cost.
- Foundry v13.
