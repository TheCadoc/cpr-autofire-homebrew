# Pneuma's Combat Tools compatibility design spec

- Date: 2026-10-06
- Status: design approved; implementation waits for the Full Blast damage line PR to merge (the prompt restyle, PR #3, is merged)
- Module: `cpr-autofire-homebrew` (this repo)
- Approved by: Lukasz Dobbek (decision 1 and the design, 2026-10-06)

This document is the handoff for the session that writes the plan and the code. Every Pneuma, CPR, and Foundry behavior it relies on is cited to source in section 4.

## 1. Goal

Full Blast (spec `2026-10-05-full-blast-design.md`) must work when attacks and damage run through Pneuma's Combat Tools (GMPneuma, `github.com/GMPneuma/PneumaCombatTools`), installed version 0.9.10. Pneuma is third-party: this module adapts to it, and never edits Pneuma or depends on an upstream change.

## 2. Decisions

| #   | Decision                       | Choice                                                                                                                                                         |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Integration approach           | Module-only. No Pneuma change and no upstream request now.                                                                                                     |
| 2   | Carrying Full Blast to damage  | A click on Pneuma's damage button of a Full Blast exchange leaves a pending note; the next damage `createRoll` consumes it and flags the roll when it matches. |
| 3   | "(Full Blast)" on Pneuma cards | Added at render time. Nothing is written into Pneuma's flags or content.                                                                                       |
| 4   | Unverified Pneuma version      | Integration still runs and fails closed. A GM sees one warning per new Pneuma version.                                                                         |
| 5   | HUD ammo gating                | Unchanged. Pneuma gates Autofire at 10 rounds; the Full Blast prompt gates Full Blast at 20.                                                                   |
| 6   | Critical injuries              | Unchanged. Pneuma and CPR both count natural 6s, matching Full Blast decision 1.                                                                               |
| 7   | Shift-click on Pneuma's HUD    | The Full Blast prompt still shows, as with Ctrl-click on the sheet (Full Blast decision 2). Only CPR's dialog is skipped.                                      |

Rejected alternatives:

- **Read Pneuma's "damage rolling" state at `createRoll` time.** Stateless, but on player clients it relies on the GM's message update arriving and being applied before Pneuma's socket reply. Foundry applies broadcast updates through an async handler (`client-esm/data/client-backend.mjs:254`), so the ordering is not guaranteed.
- **Have Pneuma pass `damageType: "fullblast"`.** Needs a Pneuma change, and Pneuma's `configureDamage` only sets the margin multiplier when `attackMode === "autofire"` (`damage-flow.js:31`).
- **Persist "(Full Blast)" into Pneuma's exchange title.** Writes into another module's flag schema.
- **Manual checkbox only.** Works with no code, but Shift-click damage can never be Full Blast and every roll needs a manual tick.

## 3. Environment

- Foundry VTT 12.343, Cyberpunk RED Core 0.92.4 (`cyberpunk-red-core`), libWrapper 1.13.5.1.
- Pneuma's Combat Tools 0.9.10, compiled JS, read-only: `%LOCALAPPDATA%\FoundryVTT\Data\modules\pneuma-combattools\`. Paths in section 4 are relative to its `scripts/` unless noted. Never edit it.
- Merged on `main`: Full Blast v0.1.0 (PR #2) and the prompt restyle (PR #3, a DialogV2 with class `cpr-autofire-homebrew-prompt`, so Pneuma's `renderCPRRollDialog` hooks never reach it).
- Pending: the damage line (`feat/full-blast-damage-card-line`). Full Blast damage rolls render `templates/full-blast-damage-card.hbs`, which wraps CPR's damage card in `<div class="cpr-autofire-homebrew-full-blast">` and inserts a `cpr-autofire-homebrew-full-blast-line` row first in `.d6-data-div`. It keeps `faces`, `_roll`, totals, and the `applyDamage` anchor native. Its spec covers Pneuma's reparsing.

## 4. Facts the design depends on

All read from the installed 0.9.10 source on 2026-10-06.

1. **Attack exchange**, `combat-resolution.js:395` (`startCombatExchange`), used by the HUD (`attack-menu.js:78`) and by routed sheet attacks:
   1. `item.createRoll(mode, actor)` (:417), then `item.hasAmmo(roll)` with the unflagged roll (:418).
   2. `attackDialog` (:428) reaches `roll.handleRollDialog` through `smokeAttackDialog` (`native-combat.js:159-172`). Events are synthetic: `{ type: "pneuma-attack", ctrlKey: false, shiftKey }` for a GM, `{ type: "pneuma-fast", ctrlKey: true }` on Shift-click. Our per-roll `handleRollDialog` runs first, then resolves the prototype method, so Pneuma's own `handleRollDialog` wrappers (`injury-mechanics.js:92`, `injury-notices.js:162`) still run.
   3. `item.hasAmmo(roll)` again after the dialog (:433), now with the flagged roll, so our doubled `bulletConsumption` applies. Then `item.confirmRoll(roll)` (:439), which discharges through CPR.
   4. `roll.rollTitle = attackTitle(...)` (:445-446) overwrites "(Full Blast)" after the roll.
   5. The exchange flag (:447-450) stores `weaponId`, `attackMode: "autofire"`, `attacker` (token UUID), `title`, and `html: await nativeCard(roll)`. `nativeCard` renders `roll.rollCard` with the roll as context (`native-combat.js:113-116`), so a Full Blast attack stores our wrapper template and its `cpr-autofire-homebrew-full-blast` class in `flags.pneuma-combattools.exchange.html`. That class is the only Full Blast state on the exchange.
   6. `ChatMessage.create` with `flags["pneuma-combattools"].exchange` (:456-459).
2. **Exchange card**, `exchangeContent` (`combat-resolution.js:106-156`):
   1. Pending state: heading `attackHeading(data.title, "div")`, a `.pneuma-attack-name` element (:109, `attack-title.js`).
   2. Resolved state: reparses `data.html`, adds `.pneuma-attack-name` to `.rollcard-top .text-normal` (:113), removes every `[data-action="rollDamage"]` (:115-119), and adds `<button class="pneuma-result-damage" data-action="pneumaRollDamage">` (:146-148). The v1 `retargetDamageButton` hook therefore finds nothing on Pneuma cards.
   3. Styling uses descendant selectors only (`styles/pneuma-combattools.css:176-185`), so our wrapper div is inert. `markRollResult` tags the wrapper instead of `.rollcard` (`native-combat.js:105-112`); its only reader is a regex over content (`chat-result-delay.js`).
3. **Damage step**, `rollDamage` (`damage-flow.js:247-287`):
   1. `await send("damageClaim")` (:256). For a player this is a socket round trip to the GM with a 15000 ms timeout (`combat-resolution.js:328`).
   2. `item.createRoll("damage", actor, { damageType: data.attackMode })` (:263), where `actor` is the attacker token's actor (`damageActor`, :13-18) and `item = actor.items.get(data.weaponId)`.
   3. `configureDamage` (:25-39) sets `roll.autofireMultiplier` from the attack margin, clamped to 1 and the weapon maximum.
   4. `roll.handleRollDialog({ type: "pneuma-damage", ctrlKey: shiftClick })` (:265): CPR's dialog shows unless Shift-click.
   5. `confirmRoll`, `rollHidden` (`roll()`), then `roll.rollTitle = data.title` (:271), then `nativeCard(roll)` (:274). `damageValues` reads the first `[data-action="applyDamage"]` (:40-54); `damageSixes` counts natural 6s (:275).
   6. The damage button is bound with jQuery on `[data-action="pneumaRollDamage"]` (:433-444) and set `disabled` when damage is not allowed.
4. **CPR damage roll**: `createRoll("damage", { damageType: "autofire" })` calls `setAutofire()` at creation (`cpr-attackable.js:311-313`), so `isAutofire` is true and the v1 "Full Blast?" checkbox appears in Pneuma's damage dialog.
5. **Critical injuries**: `damageSixes` counts natural 6s in `roll._roll.dice`, `hasCriticalInjury` needs 2 or more and the `criticalAutofire` setting (`critical-injury.js:6-20`). CPR's `criticalCard` and +5 come from natural `faces`.
6. **HUD ammo gating**: `ammoBlocks` hard-codes 10 rounds for Autofire and Suppressive Fire (`weapon-ammo.js:9-12`), titled "Requires 10 rounds" (:55), and `attackFromHUD` checks it (`attack-menu.js:46-47`).
7. **Sheet routing**: world setting `routeSheetAttacks` (default off, `sheet-attacks.js:62`). A MIXED wrapper on CPR's `_onRoll` sends attacks to `attackFromHUD` when there is one unambiguous token and at most one target (:28-43); otherwise CPR's native flow runs and v1 behavior applies.
8. **Other Pneuma wrappers on our targets**: `createRoll` (`injury-mechanics.js:84`, `emp-state.js:154`) and `loadMixins` (`ammo-chat.js:65`) are chained under one MIXED registration (`native-wrappers.js`). libWrapper runs our WRAPPERs outside them; none touches roll flags, `bulletConsumption`, or `_computeBase`.
9. **DOM**: a capture-phase listener on an ancestor runs before listeners on the target element, so a listener on the message root sees the click before Pneuma's jQuery handler. A `disabled` button dispatches no click.

## 5. Requirements

- **P1.** With Pneuma active, HUD Autofire attacks and routed sheet attacks behave as Full Blast R1 to R7: the prompt shows, Full Blast spends twice the native cost, and Full Blast is unavailable below that cost. Shift-click still shows the prompt (decision 7). No new code; verified live.
- **P2.** Clicking Pneuma's damage button on an exchange from a Full Blast attack rolls Full Blast damage. The roll is flagged before CPR's dialog, so the dialog shows "Full Blast?" pre-checked with Pneuma's margin multiplier, and Shift-click applies the bonus with no dialog. Pneuma's damage section shows the damage line, and its totals include the bonus.
- **P3.** A roll is flagged this way only when all hold:
  1. The click was on `[data-action="pneumaRollDamage"]` of that message, the button was not disabled, and the roll is created within 15 seconds of the click.
  2. The message's `flags.pneuma-combattools.exchange.html` contains the class token `cpr-autofire-homebrew-full-blast` (exact token; `...-full-blast-line` does not count, and the stored damage HTML is never read).
  3. `exchange.weaponId` equals the item's id, and the actor of the token at `exchange.attacker` has the same UUID as the actor passed to `createRoll`.
  4. `damageType` is `"autofire"`.
- **P4.** Every damage `createRoll` clears the pending note, whether or not it matches. A note never carries over to a later roll.
- **P5.** Damage from a standard Autofire exchange, from other Pneuma cards, and from CPR's native cards and sheet is not flagged by this feature (v1 R8 and R11 still apply).
- **P6.** On exchanges whose stored attack HTML has the marker, every `.pneuma-attack-name` (the pending heading and the resolved attack title) reads "{name} (Full Blast)", including its `title` attribute, and the damage button's `title` reads "Roll Full Blast damage (Shift-click to roll immediately)". Render time only, idempotent per element. When Pneuma disables the button it overwrites the title with its reason after an await, and its reason wins.
- **P7.** Critical injuries and HUD ammo gating are unchanged (decisions 5 and 6). Verified live.
- **P8.** When Pneuma is active and its version is not 0.9.10, a GM sees one permanent warning per new version at `ready`. The integration keeps running.
- **P9.** With Pneuma inactive, no Pneuma hook, listener, or setting is registered, and v1 behavior is unchanged.
- **P10.** New strings live in `lang/en.json`.

## 6. Architecture

| File                        | Change | Responsibility                                                                                                              |
| --------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| `scripts/constants.js`      | new    | `MODULE_ID`, `MARKER_CLASS`, and `t()`, shared by `full-blast.js` and `pneuma.js` so neither imports the other's internals. |
| `scripts/pneuma-match.js`   | new    | Pure functions, no Foundry globals, unit-tested: `hasClassToken`, `isPneumaFullBlast`, `shouldWarnPneuma`.                  |
| `scripts/pneuma.js`         | new    | Foundry glue: `registerPneuma()`, the render hook, the click capture, the version warning, `takePneumaFullBlast()`.         |
| `scripts/full-blast.js`     | edit   | Import the shared constants; the damage branch of the `createRoll` wrapper calls `takePneumaFullBlast`.                     |
| `scripts/main.js`           | edit   | At `init`: `register()`, then `registerPneuma()` only when `game.modules.get("pneuma-combattools")?.active`.                |
| `lang/en.json`              | edit   | Two strings (6.4).                                                                                                          |
| `test/pneuma-match.test.js` | new    | `node:test` cases (section 9).                                                                                              |
| `README.md`                 | edit   | A "Pneuma's Combat Tools" section: what works, the 0.9.10 verification, and the manual checkbox fallback.                   |
| `module.json`               | edit   | Next minor `version`. No Pneuma entry under `relationships`: the integration is optional.                                   |

### 6.1 pneuma-match.js

```js
/** Whether an HTML string has an element whose class list contains `token` exactly. */
export function hasClassToken(html, token) {} // scans class="..." and class='...' values, splits on whitespace

/**
 * Whether a pending Pneuma damage click flags this damage roll (P3).
 * @param {object} args
 * @param {{messageId: string, expiresAt: number}|null} args.pending
 * @param {number} args.now
 * @param {object|undefined} args.exchange - the stored Pneuma exchange of pending.messageId
 * @param {string} args.itemId
 * @param {string|undefined} args.actorUuid - the actor passed to createRoll
 * @param {string|undefined} args.attackerActorUuid - the actor of the token at exchange.attacker
 * @param {string} args.markerClass
 * @returns {boolean}
 */
export function isPneumaFullBlast(args) {}
// true only when: pending; now <= pending.expiresAt; typeof exchange?.html === "string";
// hasClassToken(exchange.html, markerClass); exchange.weaponId === itemId;
// actorUuid is a non-empty string; attackerActorUuid === actorUuid

/** Whether to warn the GM about an unverified Pneuma version (P8). */
export function shouldWarnPneuma(version, verified, lastWarned) {} // version !== verified && version !== lastWarned
```

### 6.2 pneuma.js

Constants: `PNEUMA_ID = "pneuma-combattools"`, `PNEUMA_VERIFIED = "0.9.10"`, `PENDING_MS = 15000` (Pneuma's GM reply timeout, fact 4.3.1), `NOTICE_SETTING = "pneumaWarnedVersion"`. Module state: `let pending = null`.

1. **`registerPneuma()`**, called from `init`: registers the world setting `NOTICE_SETTING` (`scope: "world"`, `config: false`, `type: String`, `default: ""`), the `renderChatMessage` hook (unit 2), and a `ready` hook (unit 4).
2. **Render hook** `(message, html)`:
   1. `exchange = foundry.utils.getProperty(message, "flags.pneuma-combattools.exchange")`. Use `getProperty`, not `getFlag`, so a missing scope never throws. Return unless `hasClassToken(exchange?.html ?? "", MARKER_CLASS)` and `html[0]` exists.
   2. For each `.pneuma-attack-name` without `data-cpr-autofire-homebrew-titled`: `name = el.textContent.trim()`; set `textContent` and `title` to `t("FullBlast.Title", { name })`; set the data attribute.
   3. The `[data-action="pneumaRollDamage"]` button, if present: `title = t("FullBlast.PneumaDamageTooltip")`.
   4. `html[0].addEventListener("click", listener, { capture: true })`. The listener sets `pending = { messageId: message.id, expiresAt: Date.now() + PENDING_MS }` when `event.target.closest('[data-action="pneumaRollDamage"]')` exists and is not `disabled`. It never stops or alters the event.
3. **`takePneumaFullBlast(item, actor)`**, exported:
   1. `current = pending; pending = null` (P4). Return `false` when `current` is null.
   2. `exchange` from `game.messages.get(current.messageId)` as in 2.1.
   3. `attackerActorUuid`: `fromUuidSync(exchange.attacker)?.actor?.uuid`, inside `try`/`catch` that yields `undefined`.
   4. Return `isPneumaFullBlast({ pending: current, now: Date.now(), exchange, itemId: item.id, actorUuid: actor?.uuid, attackerActorUuid, markerClass: MARKER_CLASS })`.
4. **Version warning**, at `ready`, GM only: `version = game.modules.get(PNEUMA_ID)?.version`. If `shouldWarnPneuma(version, PNEUMA_VERIFIED, game.settings.get(MODULE_ID, NOTICE_SETTING))`: `ui.notifications.warn(t("Errors.PneumaUnverified", { version, verified: PNEUMA_VERIFIED }), { permanent: true })`, then `game.settings.set(MODULE_ID, NOTICE_SETTING, version)`.

### 6.3 full-blast.js change

In the `createRoll` wrapper, before computing `fullBlast`:

```js
// Every damage roll consumes a pending Pneuma click, so a stale one never carries over.
const pneuma = type === "damage" && takePneumaFullBlast(this, actor);
const fullBlast =
  type === "damage" &&
  (extraData?.damageType === DAMAGE_TYPE ||
    (pneuma && extraData?.damageType === "autofire"));
```

The rest of the damage path is unchanged: the roll keeps `damageType: "autofire"`, `decorateDamage(roll, fullBlast)` flags it, and the v1 checkbox and the damage line PR's card follow from `isFullBlast`. If the damage line PR reshapes this function, apply the same two rules to the merged version: always call `takePneumaFullBlast` for damage, and flag only `"autofire"` rolls.

### 6.4 Strings (`CPR_AUTOFIRE_HOMEBREW` namespace)

| Key                             | English                                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FullBlast.PneumaDamageTooltip` | `Roll Full Blast damage (Shift-click to roll immediately)`                                                                                                                                              |
| `Errors.PneumaUnverified`       | `CPR Autofire Homebrew was verified with Pneuma's Combat Tools {verified}; {version} is installed. If Pneuma's damage button stops rolling Full Blast damage, tick "Full Blast?" in the damage dialog.` |

## 7. Data flow

Full Blast attack from Pneuma's HUD or a routed sheet attack (no new code):

1. `startCombatExchange` calls `createRoll("autofire")`; the v1 wrapper decorates `handleRollDialog`.
2. `hasAmmo` with the native cost, then the Full Blast prompt, then CPR's dialog (Pneuma adds its rows).
3. `hasAmmo` with the doubled cost, `confirmRoll` spends 20, `roll()`.
4. Pneuma overwrites the title and stores `nativeCard(roll)`, which is our wrapper with the marker.
5. The render hook shows "(Full Blast)" and the Full Blast damage tooltip.

Damage from that exchange:

1. The click capture records `pending`; Pneuma's handler runs `rollDamage`.
2. `damageClaim` completes (a GM round trip for players).
3. `createRoll("damage", { damageType: "autofire" })`: the wrapper takes the note, it matches, and the roll is flagged.
4. `configureDamage` sets the margin multiplier; CPR's dialog shows "Full Blast?" checked (or Shift-click skips it).
5. `roll()`: `_computeBase` adds the bonus modifier and switches to the damage line card. Pneuma stores the card; totals include the bonus.

## 8. Failure modes if Pneuma changes

The integration fails closed: when detection breaks, damage is standard Autofire and the "Full Blast?" box in CPR's damage dialog still works by hand. It cannot add the bonus to an attack that was not Full Blast, because that needs the marker in that exchange's stored attack HTML.

| Pneuma change                                                                    | Effect                                                                           | Caught by           |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------- |
| Exchange flag moved or renamed, or attack HTML no longer stored                  | No "(Full Blast)" on cards; damage not auto-flagged; manual checkbox still works | Live test           |
| Damage button `data-action` renamed                                              | Damage not auto-flagged; titles still shown                                      | Live test           |
| `weaponId` or `attacker` semantics change                                        | Damage not auto-flagged                                                          | Live test           |
| Damage roll created more than 15 s after the click, or another damage roll first | That roll not auto-flagged                                                       | Unit tests (P3, P4) |
| Attack no longer calls `roll.handleRollDialog`                                   | No prompt on Pneuma attacks; only standard Autofire possible there               | Live test           |
| Attack no longer discharges through `confirmRoll` and `bulletConsumption`        | Full Blast could spend the native cost. The one unsafe case                      | Live test           |
| Pneuma renders a template other than `roll.rollCard`                             | No marker stored; same as the first row                                          | Live test           |

The version warning (P8) tells the GM when any of this needs a re-check. Updating `PNEUMA_VERIFIED` is part of re-verifying a new Pneuma release.

## 9. Testing and acceptance

Unit tests (`npm test`, Node 22 `node:test`), `test/pneuma-match.test.js`:

| Case                                                                          | Expected     |
| ----------------------------------------------------------------------------- | ------------ |
| `hasClassToken('<div class="a cpr-autofire-homebrew-full-blast b">', token)`  | true         |
| Only `cpr-autofire-homebrew-full-blast-line` present                          | false        |
| Token only in another attribute (`data-x="cpr-autofire-homebrew-full-blast"`) | false        |
| Single-quoted class attribute containing the token                            | true         |
| Empty string or `undefined` html                                              | false        |
| `isPneumaFullBlast` with every condition met                                  | true         |
| `pending` null                                                                | false        |
| `now === expiresAt` / `now === expiresAt + 1`                                 | true / false |
| `exchange` undefined, or `exchange.html` not a string                         | false        |
| Marker only in `exchange.damage.result.html`                                  | false        |
| `weaponId` differs                                                            | false        |
| `attackerActorUuid` differs, or `actorUuid` undefined                         | false        |
| `shouldWarnPneuma("0.9.10", "0.9.10", "")`                                    | false        |
| `shouldWarnPneuma("0.9.11", "0.9.10", "")` / `(..., "0.9.11")`                | true / false |

Lint and format from `foundry-cpr`: `npm run lint` and `npm run format:check`.

Live checklist (Foundry 12.343, CPR 0.92.4, libWrapper, this module, Pneuma 0.9.10 enabled). Setup: a scene with an attacker token (temp character with an assault rifle and an SMG, full magazines) and a defender token, the GM controlling the attacker and targeting the defender. Force dice with `CONFIG.Dice.randomUniform` where a case needs exact faces, and restore it after.

| #   | Steps                                                                                  | Expected                                                                                                                              | Req    |
| --- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| L1  | HUD Autofire, choose Full Blast, decline evasion                                       | Prompt, then CPR dialog; 20 rounds spent; pending and resolved titles read "(Full Blast)"; damage tooltip changed                     | P1, P6 |
| L2  | HUD Autofire, choose Standard                                                          | 10 rounds; no suffix; native damage tooltip                                                                                           | P1, P5 |
| L3  | HUD Autofire with Shift-click                                                          | Prompt shows; CPR dialog skipped                                                                                                      | P1     |
| L4  | Magazine 19, HUD Autofire; then magazine 9                                             | 19: Full Blast disabled, Standard works. 9: Pneuma's Autofire button disabled, "Requires 10 rounds"                                   | P1, P7 |
| L5  | L1's exchange, click damage                                                            | Dialog shows "Full Blast?" checked and the margin multiplier; total = (d1 + d2 + 2) x m + mods; damage line shown in Pneuma's section | P2     |
| L6  | New Full Blast exchange, Shift-click damage                                            | No dialog; bonus and damage line present                                                                                              | P2     |
| L7  | L2's exchange, click damage                                                            | "Full Blast?" unchecked; no bonus                                                                                                     | P5     |
| L8  | `routeSheetAttacks` on, sheet Autofire attack with one target, Full Blast, then damage | Same as L1 and L5                                                                                                                     | P1, P2 |
| L9  | `routeSheetAttacks` off, sheet Autofire attack                                         | v1 native card and v1 damage behavior                                                                                                 | P5     |
| L10 | Full Blast damage with forced 6 + 6, then 5 + 5                                        | 6 + 6: Pneuma's critical injury control and +5; 5 + 5: neither                                                                        | P7     |
| L11 | Reload with Pneuma 0.9.10                                                              | No version warning                                                                                                                    | P8     |
| L12 | Disable Pneuma, reload, run Full Blast M1, M3, M6 from the v1 spec                     | v1 behavior; no Pneuma listeners                                                                                                      | P9     |

Afterwards restore the world: Pneuma disabled (unless Lukasz says otherwise), `routeSheetAttacks` back to its prior value, temp actors, tokens, scene, combat, and chat messages deleted, `CONFIG.Dice.randomUniform` restored, then `game.shutDown()`.

## 10. Delivery

- Spec PR: branch `docs/pneuma-compat-spec` into `main`.
- Implementation: after the damage line PR merges (the `foundry full-blast-damage` session released the live clone on 2026-10-06). Write the plan with `superpowers:writing-plans` from this spec against the merged `main`, implement test-first in a worktree on `feat/pneuma-compat`, live-test from the live clone (`git checkout --detach feat/pneuma-compat`, then `git switch main`), and open a PR into `main`. Lukasz merges.

## 11. Out of scope

- Any change to Pneuma, including an upstream hook request (decision 1).
- Full Blast for Suppressive Fire and area attacks (Pneuma's AoE workflow never runs Autofire).
- Showing the Full Blast cost on Pneuma's HUD.
- Foundry v13.
