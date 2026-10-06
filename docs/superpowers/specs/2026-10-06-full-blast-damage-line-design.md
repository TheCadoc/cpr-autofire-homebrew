# Full Blast damage line design spec

- Date: 2026-10-06
- Status: mechanism approved (option A, Lukasz Dobbek, 2026-10-06). Wording ships as the recommended option 1, pending confirmation; switching is a one-line `lang/en.json` change.
- Extends: `2026-10-05-full-blast-design.md` (R9, R10). Section numbers below cite that spec as "base §n".

## 1. Problem (from the user, verbatim)

> There is no indication in the end results that the damage is increased, so in the previously shared screenshot a user would see 5 and 4 with a x4 multiplier adding up to 44, leading to confusion.

The bonus exists only as the "Full Blast (+1 per die): +8" modifier, which is a tooltip on "Total Mods: 8" inside CPR's hidden `.d6-data-details`. The visible card shows dice 5 and 4, "Autofire! (x4)", and 44. The real math, (5 + 1 + 4 + 1) x 4 = 44, is not visible.

## 2. Decision

| #   | Question  | Choice                                                                                                                                                       |
| --- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 11  | Mechanism | Stored line inside CPR's dice column, above "Autofire! (x4)", rendered by a wrapper template and a Handlebars block helper.                                    |
| 12  | Wording   | `Full Blast! +1 per die ({dice})`, for example `Full Blast! +1 per die (6 + 5)`. Alternatives `Full Blast! (+1 per die)` and `Full Blast: +1 per die (+{bonus})` need only a string change. |

Rejected:

- Line below CPR's card (wrapper only): lands after the "Apply damage to following" target list, away from the dice.
- Relabel "Autofire! (x4)": the label is literal text in CPR's template, so it needs a forked template (drifts on CPR updates) or a render-time edit.
- Render-time `renderChatMessage` decoration: module enablement is world-wide, so every client already runs it, but disabling the module later strips the explanation from every old card while the stored total stays. It also still needs a stored marker.
- Drawing boosted die faces: violates base decision 1 and R10 (a natural 5 drawn as a 6 looks like a crit).

## 3. Facts this design depends on

Verified against CPR 0.92.4, Foundry 12.343, and Pneuma's Combat Tools 0.9.10 (installed) on 2026-10-06.

1. `templates/chat/cpr-damage-rollcard.hbs`: `.rollcard-bottom .d6-rollcard-data` is a grid with dice and total on row 1 and `.d6-data-div` spanning row 2. `.d6-data-div` is a right-aligned flex column holding "Autofire! (x{{autofireMultiplier}})" (`text-normal text-semi`, when `isAutofire`), the aimed location, "Critical Damage", and the hidden `.d6-data-details` (`less/chat.less:135-167`).
2. CPR preloads `cpr-damage-rollcard.hbs` (`modules/system/preload-templates.js:97`). Foundry's `getTemplate` registers every loaded template as a partial under its path (`foundry.js:7836`), so the native card is in `Handlebars.partials` by the time any roll renders.
3. `RenderRollCard` sets `criticalCard`, then `renderTemplate(cprRoll.rollCard, cprRoll)` (`modules/chat/cpr-chat.js:59`). The rendered HTML becomes the stored message content. Viewers never re-render the template.
4. Pneuma renders damage with `renderTemplate(roll.rollCard, roll)` (`native-combat.js:113`), then reparses it: it replaces the first `.rollcard-top .cpr-block`, reads the first `[data-action="applyDamage"]` for totals, and moves `.d6-data-details`. It overwrites `rollTitle` after `roll()`. Its crit count uses natural dice in `roll._roll`. Confirmed with the `foundry pneuma-compat` session.

## 4. Requirements

- **R14.** A Full Blast damage card shows one visible line, `Full Blast! +1 per die (<d1 + 1> + <d2 + 1>)`, as the first entry of CPR's `.d6-data-div`, directly above "Autofire! (x4)". The line uses CPR's `text-normal text-semi` classes and the marker class `cpr-autofire-homebrew-full-blast-line`.
- **R15.** The line is part of the stored message content. It survives the module being disabled later and needs nothing on viewing clients.
- **R16.** The line appears exactly when R9's modifier does: `isAutofire && isFullBlast` and a non-zero bonus.
- **R17.** Everything else on the card is CPR's native markup, unchanged: die images (natural faces), total, crit display and +5, apply-damage anchors and their `data-*` totals, the mods breakdown. Non-Full-Blast damage cards render CPR's template directly.
- **R18.** If CPR's markup changes and `.d6-data-div` is missing, the line is appended after CPR's card inside the wrapper instead. If CPR's damage card is not a registered partial, the roll keeps CPR's native card (no line) rather than failing to render.

## 5. Design

Changes to base §6.3 unit 5 (damage decoration) and two new files.

1. **`rules.js`**: `fullBlastFaces(faces)` returns each natural face plus 1. Pure, unit-tested.
2. **`templates/full-blast-damage-card.hbs`**:

   ```hbs
   <div class="cpr-autofire-homebrew-full-blast">
     {{#cprAutofireHomebrewDamageLine fullBlastLine}}
       {{> (lookup this "fullBlastBaseCard")}}
     {{/cprAutofireHomebrewDamageLine}}
   </div>
   ```

   The wrapper reuses the attack card's marker class. That is safe: the v0.1.0 retarget selector only matches `[data-action="rollDamage"]`, which damage cards do not contain.

3. **Block helper `cprAutofireHomebrewDamageLine(line, options)`**, registered in `register()`: renders the block (CPR's card) with `options.fn(this)`, parses it into a `<template>`, builds the line `<div>` with `textContent` (so it is escaped), prepends it to `.d6-data-div` or appends it to the fragment (R18), and returns a `Handlebars.SafeString`.
4. **`_computeBase` override**: `decorateDamage` captures `baseCard = roll.rollCard`. In the Full Blast branch, after pushing the modifier, set `fullBlastLine` from `FullBlast.DamageLine` with `{ dice: fullBlastFaces(faces).join(" + "), bonus }`, and, when `baseCard` is a registered partial, set `fullBlastBaseCard = baseCard` and `rollCard` to the module template. In every other branch, restore `rollCard` to `baseCard` only if this module set it (same rule as the title).
5. **String**: `FullBlast.DamageLine` = `Full Blast! +1 per die ({dice})`.

Data flow: `roll()` calls `_computeBase` (bonus, line, card swap), then `RenderRollCard` (or Pneuma) renders the module template, which renders CPR's card and inserts the line. The resulting HTML is stored.

## 6. Testing and acceptance

- Unit: `fullBlastFaces([5, 4])` is `[6, 5]`; `fullBlastFaces([])` is `[]`; the input array is not mutated.
- `npm test` here; `npm run lint` and `npm run format:check` from `foundry-cpr` (the live clone, since the workspace ignores `**/.claude/**`).
- Live, CPR only (Pneuma disabled), assault rifle:

| #   | Steps                                                            | Expected                                                                                                     | Req      |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| D1  | Full Blast attack, damage from the card, multiplier 4            | Line `Full Blast! +1 per die (a + b)` above "Autofire! (x4)"; a, b are the natural faces + 1; total = (a + b) x 4 | R14, R16 |
| D2  | Inspect stored `message.content`                                 | Contains the line and the wrapper; `data-total-damage` equals the total                                     | R15, R17 |
| D3  | Standard Autofire damage, and sheet damage with the box unticked | No line, no wrapper, native card                                                                            | R16, R17 |
| D4  | Disable the module, reload                                       | The D1 card still shows the line                                                                            | R15      |
| D5  | Screenshot of D1 for the PR                                      | Visual check of placement and styling                                                                       | R14      |
