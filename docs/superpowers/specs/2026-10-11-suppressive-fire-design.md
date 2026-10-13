# Suppressive Fire house rule design spec

- Date: 2026-10-11
- Status: draft; decisions open. Section 4 is the decision table to work through first.
- Module: `cpr-autofire-homebrew` (this repo)

Facts about Pneuma's Combat Tools were read from its `main` branch (0.9.16) on 2026-10-11. Facts about Cyberpunk RED Core come from this repo's Full Blast spec (verified at v0.92.4 on 2026-10-05) or are marked **verify**.

## 1. Rule

Summarized in this project's words from the "Suppressive Fire Rule Change" house rule in _Heavy Armor Lizard's Autofire Compendium_ (go-public spec G2: copy no source or RTG text).

1. Suppressive Fire costs an Action and 10 rounds. With fewer than 10 loaded, it cannot be used.
2. It affects everyone **on foot**, **in front of** the shooter, within 25 m/yd, out of cover, and in the shooter's line of sight.
3. Each rolls WILL + Concentration + 1d10 against the shooter's REF + Autofire + 1d10.
4. A target who fails must use their next Move Action **before** their Action, moving **away from** the shooter toward cover. If one Move cannot reach cover, they must also Run to reach it, or get as close as they can.
5. Once in cover, they may not move out or lean out until their next turn.

The source states its purpose: stop a suppressed target from moving toward the shooter, attacking before taking cover, or popping out of cover to attack. Which other clauses differ from rules as written is to be confirmed against the core rulebook.

## 2. Scope

Requested by Lukasz (2026-10-11): adopt the house rule and make it compatible with Pneuma's Combat Tools.

Pneuma already automates most of Suppressive Fire. This module adds only what Pneuma leaves to the table, and does not build a second suppression workflow.

## 3. Environment

- Foundry VTT v12 (12.343), Cyberpunk RED Core v0.92.4, libWrapper.
- Pneuma's Combat Tools `main` 0.9.16, module id `pneuma-combattools`, flags under `flags.pneuma-combattools`.

## 4. Decision table: each house rule change and who handles it today

"Sheet" means CPR's character sheet with this module and without Pneuma. Pneuma line references are to `src/scripts/` in 0.9.16. The Decision column is for Lukasz.

| #   | House rule change                                           | Sheet today                                                                                                     | Pneuma 0.9.16 today                                                                                                                                                                                | Gap                                                        | Proposed handling                                                                                                                                                              | Decision |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| S1  | Costs an Action and 10 rounds; impossible below 10 loaded   | Spends 10 (`bulletConsumption`). Never blocks: CPR only warns and clamps the magazine at 0.                      | Blocks. The area flow refuses below 10 (`aoe/workflow.ts:367-368`), and the HUD disables the entry (`weapon-ammo.ts`, `ammoBlocks`).                                                               | Sheet path only                                            | Wrap `createRoll("suppressive")` and decorate `handleRollDialog` to return `false` with a notification when loaded rounds are below `bulletConsumption`. Same pattern as Full Blast. |          |
| S2  | Only targets **on foot**                                    | No target automation.                                                                                           | Recipients are tokens inside the template other than the shooter (`aoe/workflow.ts:85-88`). No mounted or vehicle filter (**verify**). The GM can Exclude a target on the card.                     | Yes                                                        | GM uses Exclude target. Optionally ask Pneuma upstream for an eligibility hook. Writing into Pneuma's card flags from this module is rejected.                                     |          |
| S3  | Only targets **in front of** the shooter                    | No target automation.                                                                                           | Configurable shape: ray (default), cone (default angle 45), square, or RAW radius; range default 25 (`aoe/settings.ts:8-11`).                                                                      | None if the GM picks cone. The source gives no angle.      | README recommends Pneuma's cone at 25 m/yd. Decide the angle to recommend.                                                                                                     |          |
| S4  | Within 25 m/yd, out of cover, in line of sight              | No target automation.                                                                                           | Range from settings. Aiming requires line of sight to the aim point (`aoe/workflow.ts:357`). Per-target cover and line-of-sight filtering not confirmed (**verify**).                               | Likely per-target cover and LoS                            | GM excludes targets in cover. No cover automation in this module.                                                                                                              |          |
| S5  | WILL + Concentration + 1d10 vs REF + Autofire + 1d10         | No save flow.                                                                                                   | A Concentration roll per target row against the attack total. Ties go to the defender: `winsAreaDefense(..., true)` is `defense >= attack` (`aoe/workflow.ts:301`, `aoe/geometry.ts:10`).          | None. The source is silent on ties.                        | Keep Pneuma's roll. Decide whether ties should go to the defender (Pneuma) or the shooter.                                                                                     |          |
| S6  | A failed target uses its next Move **before** its Action     | Nothing.                                                                                                        | A failure (`row.state === "hit"`) applies Pneuma's "Suppressed" effect (`aoe/workflow.ts:317-322`), and the card says "Suppressed: Move to cover; Run if needed" (`:126`). Action order is not enforced; Pneuma's flow map says general action enforcement remains manual. | Order not enforced                                         | Advisory: warn when a suppressed actor attacks before spending any movement this turn. Uses Pneuma's per-turn movement record (`movement.ts`, `currentMovement`; needs movement tracking on, **verify**). |          |
| S7  | The Move must go **away from** the shooter                  | Nothing.                                                                                                        | Nothing.                                                                                                                                                                                           | Yes                                                        | On `preUpdateToken` for a suppressed token, warn when the move ends closer to the shooter than it started. A setting chooses warn (default) or block.                         |          |
| S8  | If one Move cannot reach cover, also Run                    | Nothing.                                                                                                        | Card text says "Run if needed". No cover detection.                                                                                                                                                | Cover detection                                            | Reminder text only. No cover automation.                                                                                                                                       |          |
| S9  | In cover: no moving or leaning out until their next turn    | Nothing.                                                                                                        | The Suppressed effect lasts through the target's next turn and expires when that turn ends. When suppression lands during the target's own turn, the current turn does not count (`suppression.ts:6-11`, `effect-lifetime.ts:55-60`). | Staying in cover is not enforced                           | Depends on decision D3. Under interpretation A, Pneuma's duration already fits; add a reminder and a warning on movement after the forced Move.                                |          |
| S10 | Without Pneuma at all                                       | CPR has no target selection or save flow for Suppressive Fire (**verify**).                                     | n/a                                                                                                                                                                                                | Whole workflow                                             | Ship only S1 on the sheet path. The rest of the house rule requires Pneuma. Rebuilding Pneuma's area workflow is rejected.                                                     |          |

## 5. Other decisions

| #   | Decision                         | Proposed                                                                                                                                                                                                                                                                            | Status |
| --- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| D1  | Settings                         | One world setting "Suppressive Fire house rule", default off. Sub-options: S7 warn or block; reminders on or off.                                                                                                                                                                  | Open   |
| D2  | How reminders reach players      | Pneuma's HUD API v2, `game.modules.get("pneuma-combattools").api.hud.send({ source, id, text, recipients, mode })`, sent by the GM client to the token's owners (`docs/hud-api.md`). Mode "queued" at the start of the suppressed token's turn.                                     | Open   |
| D3  | Reading "until their next turn"   | **A** (proposed): on the target's next turn they Move to cover first, then stay in cover for the rest of that turn. This matches Pneuma's expiry exactly. **B**: they stay in cover until the turn after that, which needs a second, module-owned effect. The source does not say which. | Open   |
| D4  | Reading "immediately"            | The forced Move happens on the target's next turn, as its first movement. Not an out-of-turn reaction.                                                                                                                                                                             | Open   |
| D5  | Finding the shooter               | The Suppressed effect's `flags.pneuma-combattools.suppressionSource` is `"<messageId>:<tokenUuid>"` (`aoe/workflow.ts:319`). The message's `flags.pneuma-combattools.aoe.exchange.attacker` is the shooter's token UUID (`aoe/workflow.ts:401`). Parse defensively: these are Pneuma internals, not an API. | Open   |
| D6  | Pneuma version drift             | Reuse the existing "verified with" warning in `scripts/pneuma.js`. If the flag shapes in D5 are missing, disable S6-S9 advisories quietly and log once.                                                                                                                          | Open   |
| D7  | Upstream requests to Pneuma      | Ask for (a) a documented hook when a suppression row resolves, and (b) an eligibility hook for S2. Both would replace reliance on internal flags.                                                                                                                                  | Open   |

## 6. Requirements

- **R1.** House rule off: behavior identical to today, with or without Pneuma.
- **R2.** House rule on, sheet path: Suppressive Fire with fewer rounds loaded than its cost is refused before CPR's dialog, with a localized notification, and spends nothing.
- **R3.** House rule on, Pneuma active: when a target becomes Suppressed, its owners get a reminder at the start of that target's next turn stating the obligations in S6-S9.
- **R4.** House rule on, Pneuma active: moving a Suppressed token so it ends closer to the shooter shows a warning, or is blocked when the block option is set.
- **R5.** House rule on, Pneuma active: a Suppressed actor attacking before spending movement this turn shows a warning (subject to S6's verify item).
- **R6.** No change to Pneuma's card, rolls, or effects. This module only reads Pneuma's flags.
- **R7.** All strings from `lang/en.json`.

## 7. Architecture

| File                           | Responsibility                                                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/suppressive.js`       | Settings, the `createRoll("suppressive")` ammo guard (S1), and registration of the Pneuma advisories when Pneuma is active.            |
| `scripts/suppression-rules.js` | Pure: `movedTowardShooter(start, end, shooter)`, `parseSuppressionSource(value)`, and reminder selection. Unit-tested.                 |
| `scripts/pneuma.js`            | Gains the Suppressed-effect reader (D5) next to the existing exchange reader.                                                          |

The S1 guard shares `createRoll` with Full Blast. Add the `suppressive` branch inside the existing `wrapCreateRoll` rather than registering a second wrapper on the same method.

## 8. Outstanding questions

1. Every Decision cell in section 4.
2. D3 and D4: the rules reading. Worth asking the source's author.
3. S3: which cone angle to recommend?
4. S5: ties to the defender or to the shooter?
5. S7: warn or block by default?
6. Are Heavy Armor Lizard's other notes on Suppressive Fire (for example, whether Full Blast can apply to it) wanted? The source is silent; the Full Blast spec puts Full Blast for Suppressive Fire out of scope.

## 9. Testing and acceptance

Unit tests: `movedTowardShooter` (closer, farther, equal, diagonal); `parseSuppressionSource` (valid, missing colon, empty).

Manual (Pneuma on unless stated):

| #  | Steps                                                                 | Expected                            | Req |
| -- | --------------------------------------------------------------------- | ----------------------------------- | --- |
| M1 | Rule off; suppress with Pneuma                                        | Unchanged Pneuma behavior           | R1  |
| M2 | Rule on, Pneuma off; sheet Suppressive Fire with 9 loaded              | Refused, nothing spent              | R2  |
| M3 | Rule on; a target fails Concentration; advance to its turn             | Owner gets the HUD reminder         | R3  |
| M4 | Move the suppressed token toward the shooter                           | Warning (or blocked)                | R4  |
| M5 | Move it away; then attack                                             | No warning                          | R4, R5 |
| M6 | Attack with the suppressed actor before moving                         | Warning                             | R5  |
| M7 | Advance past the target's turn                                        | Effect gone; no further warnings    | S9  |

## 10. Out of scope

- Cover detection.
- Enforcing action economy beyond the advisories above.
- Full Blast for Suppressive Fire.
- A suppression workflow without Pneuma (S10).
