# Full Blast design spec

- Date: 2026-10-05
- Status: design approved; ready for an implementation plan
- Module: `cpr-autofire-homebrew` (this repo). Full Blast is rule 1 of the Autofire Homebrew module.
- Approved by: Lukasz Dobbek (decisions 1 to 4 and the design, 2026-10-05)

This document is the handoff for the session that writes the code. It is self-contained: every CPR and Foundry behavior the design relies on is cited to source in section 4.

## 1. Rule (from the user, verbatim)

> When choosing to attack with Autofire, the user should be prompted whether they want to "Full Blast". If they pick no, Autofire proceeds as normal. If they pick yes, the attack consumes 2x normal ammunition (typically 20 instead of 10). If they do not have enough ammo, they cannot perform the attack.
>
> If a Full Blast attack is successful, the damage is modified. Rules as written, an Autofire attack rolls 2d6 (two six sided dice) for damage and this is then multiplied. For Full Blast, the value of each die should be increased by one (e.g. 5 becomes 6) and only then multiplied.

v1 entry point is the character sheet. Integration with Pneuma's Combat Tools is a later project (section 10).

## 2. Decisions

| #   | Decision                        | Choice                                                                                                                               |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Critical injury with +1 per die | Natural 6s only. A natural 5 does not count as a 6. The +5 crit bonus is unchanged and not multiplied.                               |
| 2   | How Full Blast is offered       | Separate prompt before CPR's attack dialog, shown even when the user Ctrl-clicks to skip CPR's dialog.                               |
| 3   | Repo layout                     | Dedicated repo cloned at `foundry-cpr/modules/cpr-autofire-homebrew`, ignored by the foundry-cpr repo.                               |
| 4   | Repo identity                   | `TheCadoc/cpr-autofire-homebrew`, private. Repo-local commit identity `Lukasz Dobbek <167940519+TheCadoc@users.noreply.github.com>`. |
| 5   | Insufficient ammo               | Full Blast button disabled with the reason. Standard Autofire stays available.                                                       |
| 6   | Default prompt button (Enter)   | Standard Autofire.                                                                                                                   |
| 7   | Missed Full Blast               | Spends the full Full Blast cost, as rules-as-written Autofire spends 10 on a miss.                                                   |
| 8   | Settings                        | None in v1.                                                                                                                          |
| 9   | Dependencies                    | libWrapper required. No imports from CPR internals (`/systems/cyberpunk-red-core/modules/...`).                                      |
| 10  | Damage implementation           | One roll modifier of `dice x multiplier`, mathematically identical to +1 per die before multiplying (section 6.2).                   |

## 3. Environment

- Foundry VTT v12, build 12.343. Cyberpunk RED Core v0.92.4 (`cyberpunk-red-core`). Sheets and dialogs are ApplicationV1, so render hooks pass jQuery `html`.
- CPR reference source, read-only: `foundry-cpr/reference/fvtt-cyberpunk-red-core/` at tag v0.92.4. CPR paths below are relative to its `src/`.
- Foundry client source: `C:\Program Files\Foundry Virtual Tabletop\resources\app\` (`public/scripts/foundry.js`, `client-esm/`).
- Pneuma's Combat Tools 0.9.2 source (unversioned download, not installed): `D:\Antigravity\fvtt-cyberpunk-red-core\modules\PneumaCombatTools-main\`.
- Foundry `Data/modules` held only `cpr-dev-smoke` on 2026-10-05. Install libWrapper before testing: Foundry Setup, Add-on Modules, Install Module, search "libWrapper".
- Node 22 for `node --test`.

## 4. CPR and Foundry facts the design depends on

All verified by reading the v0.92.4 and Foundry 12.343 source.

1. **Sheet attack flow**, `modules/actor/sheet/cpr-actor-sheet.js:508` (`_onRoll`):
   1. Fire mode comes from actor flag `flags.cyberpunk-red-core.firetype-<itemId>` via `_getFireCheckbox` (:677). It is `"autofire"` when the weapon's Autofire box is ticked.
   2. `item.createRoll(rollType, actor)` is synchronous and not awaited. Next, `await cprRoll.handleRollDialog(event, actor, item)`; a `false` return aborts cleanly.
   3. `await item.confirmRoll(cprRoll)` discharges ammo (`modules/item/cpr-item.js:372`), then `cprRoll.roll()`, then `CPRChat.RenderRollCard(cprRoll)` (:661).
   4. Because `createRoll` is synchronous, any prompt must run inside `handleRollDialog`.
2. **Ammo**:
   1. `bulletConsumption(cprRoll)` returns 10 for `CPRAutofireRoll` and `CPRSuppressiveFireRoll`, else 1 (`modules/item/mixins/cpr-loadable.js:212`). `hasAmmo(roll)` (:227) and `dischargeItem(roll)` (`cpr-attackable.js:49`) both call it.
   2. CPR never blocks on low ammo. `Rules.lawyer` only warns (`modules/utils/cpr-rules.js:4`, called at `cpr-attackable.js:269`), and `dischargeItem` clamps the magazine at 0.
   3. Mixin methods (`bulletConsumption`, `hasAmmo`, `dischargeItem`, `_createAttackRoll`, and the rest) are own properties assigned per instance by `loadMixins()` (`cpr-item.js:139`) on every `prepareDerivedData()` (:209). They cannot be wrapped on a prototype.
   4. `loadMixins` (:139), `confirmRoll` (:372), and `createRoll` (:412) are `CPRItem` prototype methods. No item type subclass in `modules/item/types/` overrides them.
3. **Item class access**: `CONFIG.Item.documentClass` is a Proxy over `CPRItem` (`modules/entity-factory.js:110`), assigned synchronously in CPR's `init` hook (`cpr.js:143`, no `await` before it). The Proxy forwards `prototype` to `CPRItem.prototype`, so the libWrapper target `CONFIG.Item.documentClass.prototype.<method>` reaches CPR methods without imports.
4. **Damage roll**, `modules/rolls/cpr-rolls.js:724` (`CPRDamageRoll`):
   1. `_computeBase()` (:771) first caps `autofireMultiplier` at `autofireMultiplierMax`, then returns `initialRoll * (isAutofire ? autofireMultiplier : 1) + totalMods()`. `roll()` calls it once through `_computeResult()`.
   2. `setAutofire()` (:818) forces formula `2d6`. After `roll()`, `faces` holds the natural die results.
   3. `wasCritSuccess()` (:798) is two or more natural 6s in `faces`. The crit bonus (`bonusDamage`, 5) travels separately on the card and is not multiplied.
   4. `configureAutofire(1, max, ammoOverride)` runs at creation, so the multiplier defaults to 1.
   5. `addMod([{ id, value, source }])` (:107) skips value 0 and duplicate ids. `removeMod(id)` (:132) has a bug: for an id that is not present, `findIndex` returns -1 and `splice(-1, 1)` removes the last mod. Never call `removeMod` with an id that may be absent.
5. **Attack card**, `templates/chat/cpr-autofire-rollcard.hbs`: the damage button is `<a class="clickable" data-action="rollDamage" ... data-attack-type="autofire" ...>` (:12-18). `RenderRollCard` renders `renderTemplate(cprRoll.rollCard, cprRoll)` (`modules/chat/cpr-chat.js:59`), so `rollCard` picks the template and the roll is the context.
6. **Damage click handler**, `modules/chat/cpr-chat.js:261`: reads `data-attack-type` from the clicked element at click time (`SystemUtils.GetEventDatum`, `modules/utils/cpr-systemUtils.js:703`), then calls `item.createRoll("damage", actor, { damageType: attackType })` synchronously, then `handleRollDialog`, `confirmRoll`, `roll()`, and `RenderRollCard`. The attack card and the damage roll share no other state; the user types the multiplier in the damage dialog.
7. **Sheet damage button**: `_onRoll` case DAMAGE passes `damageType` from the same fire-mode flag (`cpr-actor-sheet.js:541`).
8. **Damage card**, `templates/chat/cpr-damage-rollcard.hbs`: shows die images `d6_{face}.svg` from `faces` (faces must stay 1 to 6), lists mods through `cpr-rollcard-modifiers.hbs`, and writes `resultTotal` and `bonusDamage` onto the apply-damage buttons.
9. **Roll dialog**, `modules/dialog/cpr-roll-dialog.js` (`CPRRollDialog extends CPRDialog extends FormApplication`):
   1. The dialog's `object` is the roll itself (`CPRDialog.showDialog(this, actor, item)` in `modules/dialog/cpr-dialog-application.js`). `submitOnChange` is true, and `_updateObject` merges form data into the roll with `foundry.utils.mergeObject`, then re-renders. Confirm does not submit; only change events save values.
   2. Foundry binds the change listener delegated on the form (`foundry.js:6611`), so an injected input with a `name` is saved onto the roll.
   3. The damage prompt `templates/dialog/rolls/cpr-verify-roll-damage-prompt.hbs` shows an `isAutofire` checkbox and, when checked, an `autofireMultiplier` number input.
   4. The render hook is `renderCPRRollDialog` (it also fires for the `CPRRoleRollDialog` subclass). `app.rollData` is the roll.
   5. Ctrl-click, or the inverted CPR setting, skips the dialog (`cpr-rolls.js:261`).
10. **Templates as partials**: Foundry's `getTemplate(path)` compiles a template and registers it as a Handlebars partial under its path (`foundry.js:7836`). CPR does not preload `cpr-autofire-rollcard.hbs`, so call `getTemplate` on it before rendering a template that includes it.
11. **DialogV2**, `client-esm/applications/api/dialog.mjs`: `DialogV2.wait({ window, content, buttons, rejectClose, render })`. Buttons render as `<button data-action="<action>">`, and the `default` button is `type="submit"` with `autofocus`. There is no `disabled` button option, so disable through the `render(event, element)` callback. With `rejectClose: false`, closing resolves `null`.

## 5. Behavior requirements

- **R1.** When an Autofire attack roll is created (`createRoll("autofire", ...)`) on a ranged item that has `bulletConsumption`, show the Full Blast prompt before CPR's attack dialog. The prompt shows even when CPR's dialog is skipped with Ctrl-click. This applies to any caller of `createRoll`; v1 tests only the character sheet.
- **R2.** The prompt shows the weapon name, rounds loaded, and two buttons with their costs: "Full Blast (20 rounds)" and "Standard Autofire (10 rounds)". Costs come from the item's `bulletConsumption`, not constants.
- **R3.** Standard Autofire is the default (Enter). Choosing it continues CPR's native flow with no change to ammo cost, dialog, chat card, or damage.
- **R4.** Closing the prompt (X or Escape) aborts the attack: no CPR dialog, no ammo spent, no chat card.
- **R5.** If rounds loaded are below the Full Blast cost, the Full Blast button is disabled and the prompt says "Full Blast needs N rounds." A Full Blast attack cannot happen.
- **R6.** Choosing Full Blast flags the roll, appends "(Full Blast)" to the roll title (shown in CPR's attack dialog title and on the attack card), and continues to CPR's native dialog.
- **R7.** A Full Blast attack spends twice the native Autofire cost (20 today) through CPR's own discharge, hit or miss.
- **R8.** The damage button on a Full Blast attack card rolls Full Blast damage. With this module disabled, the same card rolls standard Autofire damage.
- **R9.** Full Blast damage is (sum of natural dice + number of dice) x effective multiplier + other modifiers. The effective multiplier is CPR's capped value. It is applied as one modifier, value `dice x multiplier`, labeled "Full Blast (+1 per die)", visible in the damage card breakdown and included in the apply-damage totals. The damage card title gets "(Full Blast)".
- **R10.** Critical injury detection uses natural dice only. Die images show the natural faces. The +5 crit bonus is unchanged.
- **R11.** CPR's damage dialog shows a "Full Blast?" checkbox on Autofire damage rolls, directly after the multiplier row. It is pre-checked for damage rolled from a Full Blast attack card and unchecked otherwise, including the sheet damage button. The checkbox, together with CPR's own "Autofire?" box, decides whether R9 applies.
- **R12.** Single shots, aimed shots, Suppressive Fire, melee, and non-weapon rolls are unaffected.
- **R13.** All user-facing strings come from `lang/en.json`.

## 6. Architecture

Plain ES modules with JSDoc and no build step (workspace convention). The repo root is the module root; `npm run link` in foundry-cpr junctions it into Foundry.

| File                                   | Responsibility                                                                                  | Depends on                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------- |
| `module.json`                          | Manifest (6.1).                                                                                 | none                              |
| `scripts/main.js`                      | `init` hook: check libWrapper and CPR, then call `register()` from `full-blast.js`.             | `full-blast.js`                   |
| `scripts/rules.js`                     | Pure rule math with no Foundry globals. Unit-tested.                                            | none                              |
| `scripts/full-blast.js`                | Foundry and CPR glue: wrappers, prompt, damage decoration, dialog checkbox, chat card handling. | `rules.js`, Foundry, libWrapper   |
| `templates/full-blast-attack-card.hbs` | Marker wrapper around CPR's native attack card (6.4).                                           | CPR template, loaded as a partial |
| `lang/en.json`                         | Strings (6.5).                                                                                  | none                              |
| `test/rules.test.js`                   | `node:test` unit tests for `rules.js`.                                                          | `rules.js`                        |
| `package.json`                         | `{ "private": true, "type": "module", "scripts": { "test": "node --test" } }`. No dependencies. | none                              |
| `README.md`                            | The rule, requirements, install.                                                                | none                              |

### 6.1 module.json

```json
{
  "id": "cpr-autofire-homebrew",
  "title": "CPR Autofire Homebrew",
  "description": "Homebrew Autofire rules for Cyberpunk RED. Full Blast: spend double ammunition to add 1 to each damage die before the Autofire multiplier.",
  "version": "0.1.0",
  "compatibility": { "minimum": "12", "verified": "12.343", "maximum": "12" },
  "authors": [{ "name": "Lukasz Dobbek" }],
  "esmodules": ["scripts/main.js"],
  "languages": [{ "lang": "en", "name": "English", "path": "lang/en.json" }],
  "relationships": {
    "systems": [
      {
        "id": "cyberpunk-red-core",
        "type": "system",
        "compatibility": { "verified": "0.92.4" }
      }
    ],
    "requires": [{ "id": "lib-wrapper", "type": "module" }]
  },
  "url": "https://github.com/TheCadoc/cpr-autofire-homebrew"
}
```

No `manifest` or `download` in v1: the repo is private and has no releases.

### 6.2 rules.js interface

```js
/** Rounds a Full Blast costs, given the native Autofire cost. */
export function fullBlastRounds(standardRounds) {} // standardRounds * 2

/** Whether the loaded magazine covers a Full Blast. */
export function canFullBlast(loadedRounds, standardRounds) {} // loadedRounds >= fullBlastRounds(standardRounds)

/** Damage Full Blast adds: +1 per die, multiplied. */
export function fullBlastBonus(diceCount, multiplier) {} // diceCount * multiplier
```

Why one modifier is correct: for natural dice d1, d2 and multiplier m, `(d1 + 1 + d2 + 1) * m === (d1 + d2) * m + fullBlastBonus(2, m)`. CPR adds other modifiers after multiplying, so they are unaffected.

### 6.3 full-blast.js units

Constants: `MODULE_ID = "cpr-autofire-homebrew"`, `MOD_ID = "cpr-autofire-homebrew-full-blast"`, `CARD_TEMPLATE = "modules/cpr-autofire-homebrew/templates/full-blast-attack-card.hbs"`, `MARKER_CLASS = "cpr-autofire-homebrew-full-blast"`, `DAMAGE_TYPE = "fullblast"`.

Roll state lives on the roll object as `roll.isFullBlast` (boolean), matching CPR's own `isAutofire` and `isAimed`. A later Pneuma integration reads the same field.

1. **`register()`**, called from `init`:
   1. Registers two libWrapper `WRAPPER`s on `CONFIG.Item.documentClass.prototype`: `createRoll` (unit 2) and `loadMixins` (unit 7). Registers two hooks: `renderCPRRollDialog` (unit 6) and `renderChatMessage` (unit 8).
   2. If `globalThis.libWrapper` or `CONFIG.Item.documentClass?.prototype?.createRoll` is missing, register nothing, log an error, and show one localized `ui.notifications.error` at `ready`.
   3. Registration must happen in `init`. `loadMixins` runs during world data preparation, after `init`. CPR's `init` listener runs before this module's (system scripts load before module scripts, and CPR assigns `CONFIG.Item.documentClass` synchronously), so the prototype is CPR's by then.
2. **`createRoll` wrapper** `(wrapped, type, actor, ...rest)`:
   1. `type === "autofire"`: `roll = wrapped(type, actor, ...rest)`. If the item is eligible (`this.system.isRanged` and `typeof this.bulletConsumption === "function"`), decorate the roll's `handleRollDialog` (unit 3). Return `roll`.
   2. `type === "damage"`: if `rest[0]?.damageType === DAMAGE_TYPE`, replace `rest[0]` with `{ ...rest[0], damageType: "autofire" }` and note `fullBlast = true`. Then `roll = wrapped(type, actor, ...rest)`, decorate damage (unit 5), set `roll.isFullBlast = fullBlast`, and add the roll to a module-level `WeakSet` of decorated damage rolls (used by unit 6). Return `roll`.
   3. Any other type passes through untouched.
3. **Attack decoration**, instance method `roll.handleRollDialog = async function (event, actor, item)`. Use the item captured as `this` in the `createRoll` wrapper, not the `item` argument, so a caller that passes a different item cannot change the cost.
   1. `standard = item.bulletConsumption(this)` (the roll is not flagged yet, so this is the native cost). `required = fullBlastRounds(standard)`. `loaded = Number(item.system.magazine?.value) || 0`.
   2. `choice = await promptFullBlast({ weapon: item.name, loaded, standard, required, allowed: canFullBlast(loaded, standard) })`.
   3. `null` returns `false` (R4). `"standard"` continues unchanged (R3).
   4. `"fullBlast"`: set `this.isFullBlast = true`, set `this.fullBlastBaseCard = this.rollCard`, `await getTemplate(this.fullBlastBaseCard)`, set `this.rollCard = CARD_TEMPLATE`, and set `this.rollTitle` to the localized "{name} (Full Blast)" (R6).
   5. Finally return `Object.getPrototypeOf(this).handleRollDialog.call(this, event, actor, item)`. Resolving the prototype method at call time keeps other modules' prototype wrappers working (Pneuma wraps this method).
4. **`promptFullBlast(...)`**: `foundry.applications.api.DialogV2.wait` with `rejectClose: false`, buttons `fullBlast` and `standard` (`default: true`), and a `render` callback that disables `[data-action="fullBlast"]` when not allowed. Returns `"fullBlast"`, `"standard"`, or `null`.
5. **Damage decoration**: on decoration store `roll.fullBlastBaseTitle = roll.rollTitle`, then override the instance method `roll._computeBase = function ()`:
   1. Remove an existing `MOD_ID` entry from `this.mods` by index, only if present (fact 4.4.5).
   2. `base = Object.getPrototypeOf(this)._computeBase.call(this)`. This also caps `autofireMultiplier`.
   3. If `this.isAutofire && this.isFullBlast`: `bonus = fullBlastBonus(this.faces.length, this.autofireMultiplier)`. When `bonus !== 0`, push `{ id: MOD_ID, value: bonus, source: <localized "Full Blast (+1 per die)"> }` onto `this.mods`. Set `this.rollTitle` to the localized "{name} (Full Blast)" using `fullBlastBaseTitle`. Return `base + bonus`.
   4. Otherwise set `this.rollTitle = this.fullBlastBaseTitle` and return `base`.
6. **`renderCPRRollDialog` hook** `(app, html)`: when `app.rollData` is in the decorated-damage `WeakSet` and `app.rollData.isAutofire` is true, insert this row after the `li.dialog-item` that contains `input[name="autofireMultiplier"]`, checked from `app.rollData.isFullBlast`. Skip if the anchor is missing. CPR's `submitOnChange` saves the value onto the roll (fact 4.9).

   ```html
   <li class="dialog-item flexrow cpr-autofire-homebrew-row">
     <div class="dialog-item-name text-nowrap">Full Blast?</div>
     <div class="dialog-item-input text-nowrap">
       <input type="checkbox" name="isFullBlast" data-dtype="Boolean" />
     </div>
   </li>
   ```

7. **`loadMixins` wrapper** `(wrapped, ...args)`: call `wrapped(...args)`. Then, if `this.bulletConsumption` is a function, replace it with one that returns `fullBlastRounds(native)` when `roll?.isFullBlast` and `native` otherwise. Mark the replacement so it is never wrapped twice. This one change covers `hasAmmo`, `dischargeItem`, and Pneuma's `hasAmmo` re-check.
8. **`renderChatMessage` hook** `(message, html)`: inside `.${MARKER_CLASS}`, set `data-attack-type="fullblast"` on `[data-action="rollDamage"][data-attack-type="autofire"]` and set its tooltip to the localized "Roll Full Blast damage". This is render-time only. The stored message content keeps `autofire`, which gives the R8 fallback.

### 6.4 Attack card template

```hbs
<div class="cpr-autofire-homebrew-full-blast">
  {{> (lookup this "fullBlastBaseCard")}}
</div>
```

The partial receives the roll as context, so CPR's markup renders unchanged inside the marker.

### 6.5 Strings (`lang/en.json`, namespace `CPR_AUTOFIRE_HOMEBREW`)

| Key                         | English                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| `FullBlast.PromptTitle`     | `Autofire: {weapon}`                                                          |
| `FullBlast.PromptLoaded`    | `Rounds loaded: {loaded}`                                                     |
| `FullBlast.PromptShort`     | `Full Blast needs {required} rounds.`                                         |
| `FullBlast.ButtonFullBlast` | `Full Blast ({rounds} rounds)`                                                |
| `FullBlast.ButtonStandard`  | `Standard Autofire ({rounds} rounds)`                                         |
| `FullBlast.Title`           | `{name} (Full Blast)`                                                         |
| `FullBlast.DamageCheckbox`  | `Full Blast?`                                                                 |
| `FullBlast.ModSource`       | `Full Blast (+1 per die)`                                                     |
| `FullBlast.DamageTooltip`   | `Roll Full Blast damage`                                                      |
| `Errors.Unavailable`        | `CPR Autofire Homebrew could not hook into Cyberpunk RED. Full Blast is off.` |

## 7. Data flow

Attack from the sheet:

1. `_onRoll` calls `createRoll("autofire")`; the wrapper decorates `handleRollDialog`.
2. `handleRollDialog` shows the prompt. Full Blast sets the flag, title, and card template.
3. CPR's attack dialog, then `confirmRoll`, then `dischargeItem`, which calls `bulletConsumption` (doubled for Full Blast).
4. `roll()`, then `RenderRollCard` renders the wrapper template, then the chat message renders and the hook retargets the damage button.

Damage from a Full Blast card:

1. Click calls `createRoll("damage", { damageType: "fullblast" })`; the wrapper translates it to autofire and flags the roll.
2. CPR's damage dialog shows the checkbox pre-checked.
3. `confirmRoll` (`setAutofire`), then `roll()`, where `_computeBase` adds the bonus modifier.
4. The damage card shows the Full Blast line, title, and totals.

Damage from the sheet damage button:

1. `_onRoll` case DAMAGE calls `createRoll("damage", { damageType: "autofire" })`; the roll is decorated but not flagged.
2. The damage dialog shows the checkbox unchecked; the user may tick it. The rest is as above.

## 8. Edge cases

- Ctrl-click attack: the prompt still shows (R1); CPR's dialog is skipped.
- Ctrl-click damage from a Full Blast card: no dialog and no checkbox, but the roll is already flagged from `damageType`, so R9 applies with CPR's default multiplier of 1. This matches CPR's native Ctrl-click multiplier behavior.
- Weapon autofire maximum of 0: CPR caps the multiplier to 0, the bonus is 0, and no modifier is added.
- Ammo changing between prompt and discharge: not re-checked on the sheet path (CPR does not re-check either). Pneuma re-checks through `hasAmmo`.
- Module disabled after Full Blast cards exist: their buttons stay `autofire` (R8).
- Several clients: all state lives on the roll object and in the stored card markup, nothing per client.

## 9. Testing and acceptance

Unit tests (`npm test` in this repo, Node 22 `node:test`):

| Case                                          | Expected                                                         |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `fullBlastRounds(10)`                         | 20                                                               |
| `canFullBlast(19, 10)`, `(20, 10)`, `(0, 10)` | false, true, false                                               |
| `fullBlastBonus(2, m)` for m = 1 to 4         | 2, 4, 6, 8                                                       |
| `fullBlastBonus(0, 3)`                        | 0                                                                |
| All d1, d2 in 1 to 6 and m in 1 to 4          | `(d1 + 1 + d2 + 1) * m === (d1 + d2) * m + fullBlastBonus(2, m)` |

Lint and format from `foundry-cpr`: `npm run lint` and `npm run format:check`. The workspace config covers `modules/**/*.js`. It needs the foundry-cpr branch `chore/nested-module-repos` merged first (it adds `libWrapper` and `getTemplate` to the ESLint globals and keeps Prettier checking nested repos).

Manual checklist in Foundry (v12, CPR 0.92.4, libWrapper and this module enabled). Use an SMG (max x3) or assault rifle (max x4) with a full magazine and the Autofire box ticked on the character sheet:

| #   | Steps                                                     | Expected                                                                                                    | Req     |
| --- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------- |
| M1  | Click the attack                                          | Prompt shows weapon, rounds loaded, and both buttons; Enter selects Standard                                | R1-R3   |
| M2  | Choose Standard                                           | Native flow; 10 rounds spent; card and damage identical to the module disabled                              | R3, R12 |
| M3  | Choose Full Blast                                         | Dialog and card titles show "(Full Blast)"; 20 rounds spent                                                 | R6, R7  |
| M4  | Close the prompt                                          | No dialog, no card, ammo unchanged                                                                          | R4      |
| M5  | Set magazine to 19, attack                                | Full Blast disabled with "needs 20 rounds"; Standard works                                                  | R5      |
| M6  | Full Blast card, click damage, multiplier 3               | Checkbox pre-checked; total = (d1 + d2 + 2) x 3 + other mods; breakdown shows Full Blast +6; title shows it | R9, R11 |
| M7  | Repeat until a natural 6 + 6 and a natural 5 + 5          | 6 + 6 is a crit; 5 + 5 is not                                                                               | R10     |
| M8  | Sheet damage button, tick the checkbox, then untick it    | Bonus applies when ticked, not when unticked                                                                | R11     |
| M9  | Ctrl-click the attack                                     | Prompt still shows                                                                                          | R1      |
| M10 | Disable the module, click an old Full Blast card's damage | Standard Autofire damage                                                                                    | R8      |
| M11 | Single shot, aimed shot, Suppressive Fire, melee          | No prompt, native behavior                                                                                  | R12     |

Live testing runs from the junctioned folder `foundry-cpr/modules/cpr-autofire-homebrew`. Check out the working branch there, because a worktree elsewhere is not linked into Foundry. JS changes need a browser reload (F5); `module.json` changes need a return to Setup and a world relaunch.

## 10. Pneuma's Combat Tools (later project, not v1)

Read from 0.9.2 source; not installed or live-tested. Paths are relative to Pneuma's `src/scripts/`.

- Expected to work without Pneuma changes: the attack exchange (`combat-resolution.ts:348-367`) calls `createRoll`, `hasAmmo`, `handleRollDialog`, `hasAmmo` again, then `confirmRoll`. The prompt, the doubled cost, and blocking (through Pneuma's own `hasAmmo` re-check) should apply to HUD attacks and to Pneuma's optional sheet routing (`routeSheetAttacks`, default off, `sheet-attacks.ts`).
- Does not carry over: Pneuma stores `attackMode: "autofire"` in its exchange flag and rolls damage with `createRoll("damage", { damageType: data.attackMode })` (`damage-flow.ts:235`), skipping the dialog by default. Full Blast damage needs either a Pneuma change (store `roll.isFullBlast` in the exchange and pass `damageType: "fullblast"`) or this module tagging Pneuma's exchange message.
- Pneuma counts critical injuries from natural 6s in the raw Foundry dice (`critical-injury.ts:16`), consistent with decision 1.
- Pneuma's HUD disables Autofire below 10 rounds (`weapon-ammo.ts:12`). It does not know the Full Blast cost, which is fine because the prompt handles it.
- How Pneuma's attack card styling treats the wrapper template is unverified.

## 11. Out of scope for v1

- Pneuma integration (section 10).
- Releases, manifest URL, and a GitHub release workflow.
- Module settings and further homebrew rules.
- Full Blast for Suppressive Fire.
- Foundry v13. CPR's v13 release will need a migration pass, mostly for sheet and dialog hooks.

## 12. Delivery conventions

- Repo `TheCadoc/cpr-autofire-homebrew` (private). Local clone `D:\Antigravity\foundry-cpr\modules\cpr-autofire-homebrew` with the repo-local identity from decision 4 already configured.
- Work on feature branches and open pull requests into `main`. Never push to `main`.
- `foundry-cpr/CLAUDE.md` loads for sessions in this folder and applies (targets, commands, CPR integration guidance).
- Next step: write the implementation plan from this spec with `superpowers:writing-plans`, then implement test-first starting with `rules.js`.
