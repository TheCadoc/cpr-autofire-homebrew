# Full Blast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship rule 1 of `cpr-autofire-homebrew`, Full Blast: an opt-in Autofire that spends double ammunition and adds 1 to each damage die before the multiplier.

**Architecture:** Plain ES modules, no build step. `scripts/rules.js` holds the pure math (unit-tested with `node:test`). `scripts/full-blast.js` is the Foundry glue: two libWrapper `WRAPPER`s on `CONFIG.Item.documentClass.prototype` (`createRoll`, `loadMixins`), per-roll instance overrides (`handleRollDialog`, `_computeBase`), and two render hooks (`renderCPRRollDialog`, `renderChatMessage`). Spec: `docs/superpowers/specs/2026-10-05-full-blast-design.md` (sections cited as "spec §n").

**Tech Stack:** Foundry VTT 12.343, Cyberpunk RED Core 0.92.4, libWrapper 1.13.5.1, Node 22 `node:test`, ESLint and Prettier from the `foundry-cpr` workspace.

---

## Verified before planning (2026-10-06)

- Every CPR and Foundry fact in spec §4 was re-read against `reference/fvtt-cyberpunk-red-core/src` (v0.92.4) and Foundry 12.343 `client-esm/applications/api/dialog.mjs`. All hold.
- libWrapper composes with the per-roll `handleRollDialog` override. When another module (Pneuma) wraps `CPRRoll.prototype.handleRollDialog`, assigning `roll.handleRollDialog = fn` on an instance goes through libWrapper's `set_nonproperty`, which defines an own property on the instance (`src/lib/libWrapper-wrapper.js`, inherited branch). The override still wins, and `Object.getPrototypeOf(roll).handleRollDialog` still reaches the wrapped chain.
- Pneuma 0.9.10 (installed) also wraps `loadMixins`, but only re-wraps `reload` and `load`. It does not touch `bulletConsumption`, so our `loadMixins` wrapper composes with it.
- One spec deviation, in spec §6.3.5 step 4: the unflagged branch of `_computeBase` restores the base title only when this module set the Full Blast title. Restoring it unconditionally would clobber titles that other callers set after `createRoll` (CPR's `setNetCombat`).
- One simplification: the `createRoll` wrapper forwards the caller's `item` argument to CPR's dialog unchanged. It uses the captured item only for ammo math, which is what spec §6.3.3 protects.

## File map

| File                                   | Responsibility                                                         |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `package.json`                         | `npm test` runs `node --test`. No dependencies.                        |
| `module.json`                          | Foundry manifest (spec §6.1).                                          |
| `lang/en.json`                         | All user-facing strings (spec §6.5).                                   |
| `README.md`                            | Rule, requirements, install. Replaces GitHub's CRLF stub.              |
| `scripts/rules.js`                     | Pure rule math.                                                        |
| `test/rules.test.js`                   | Unit tests for `rules.js` (spec §9).                                   |
| `scripts/main.js`                      | Entry point: `Hooks.once("init", register)`.                           |
| `scripts/full-blast.js`                | Wrappers, prompt, damage decoration, dialog checkbox, chat retargeting. |
| `templates/full-blast-attack-card.hbs` | Marker wrapper around CPR's native Autofire card (spec §6.4).          |

Paths are relative to the repo root `D:\Antigravity\foundry-cpr\modules\cpr-autofire-homebrew`. Lint and format run from `D:\Antigravity\foundry-cpr`.

---

### Task 1: Scaffold the module

**Files:**

- Create: `package.json`, `module.json`, `lang/en.json`
- Modify: `README.md` (full rewrite)

- [ ] **Step 1: Write `package.json`**

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Write `module.json`** (spec §6.1)

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

- [ ] **Step 3: Write `lang/en.json`** (spec §6.5)

```json
{
  "CPR_AUTOFIRE_HOMEBREW": {
    "FullBlast": {
      "PromptTitle": "Autofire: {weapon}",
      "PromptLoaded": "Rounds loaded: {loaded}",
      "PromptShort": "Full Blast needs {required} rounds.",
      "ButtonFullBlast": "Full Blast ({rounds} rounds)",
      "ButtonStandard": "Standard Autofire ({rounds} rounds)",
      "Title": "{name} (Full Blast)",
      "DamageCheckbox": "Full Blast?",
      "ModSource": "Full Blast (+1 per die)",
      "DamageTooltip": "Roll Full Blast damage"
    },
    "Errors": {
      "Unavailable": "CPR Autofire Homebrew could not hook into Cyberpunk RED. Full Blast is off."
    }
  }
}
```

- [ ] **Step 4: Rewrite `README.md`**

```markdown
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
```

- [ ] **Step 5: Verify JSON parses and formatting passes**

Run (from the module repo): `node -e "for (const f of ['package.json','module.json','lang/en.json']) JSON.parse(require('fs').readFileSync(f,'utf8'))" && echo ok`
Expected: `ok`

Run (from `D:\Antigravity\foundry-cpr`): `npx prettier --check modules/cpr-autofire-homebrew --ignore-path .prettierignore`
Expected: `All matched files use Prettier code style!` If not, run `npx prettier --write` on the listed files and re-check.

- [ ] **Step 6: Commit**

```bash
git add package.json module.json lang/en.json README.md
git commit -m "feat: scaffold module manifest, strings, and README"
```

---

### Task 2: Rule math, test-first

**Files:**

- Create: `test/rules.test.js`, `scripts/rules.js`

- [ ] **Step 1: Write the failing tests** (spec §9 table)

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canFullBlast,
  fullBlastBonus,
  fullBlastRounds,
} from "../scripts/rules.js";

test("fullBlastRounds doubles the native Autofire cost", () => {
  assert.equal(fullBlastRounds(10), 20);
});

test("canFullBlast needs the whole Full Blast cost loaded", () => {
  assert.equal(canFullBlast(19, 10), false);
  assert.equal(canFullBlast(20, 10), true);
  assert.equal(canFullBlast(0, 10), false);
});

test("fullBlastBonus is one per die, multiplied", () => {
  assert.deepEqual(
    [1, 2, 3, 4].map((m) => fullBlastBonus(2, m)),
    [2, 4, 6, 8],
  );
  assert.equal(fullBlastBonus(0, 3), 0);
});

test("one bonus modifier equals +1 per die before multiplying", () => {
  for (let d1 = 1; d1 <= 6; d1 += 1) {
    for (let d2 = 1; d2 <= 6; d2 += 1) {
      for (let m = 1; m <= 4; m += 1) {
        assert.equal(
          (d1 + 1 + d2 + 1) * m,
          (d1 + d2) * m + fullBlastBonus(2, m),
          `d1=${d1} d2=${d2} m=${m}`,
        );
      }
    }
  }
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm test`
Expected: FAIL, `Cannot find module '.../scripts/rules.js'` (ERR_MODULE_NOT_FOUND).

- [ ] **Step 3: Write `scripts/rules.js`**

```js
// Full Blast rule math. No Foundry globals, so Node can unit-test it.

/**
 * Rounds a Full Blast costs.
 *
 * @param {number} standardRounds - the native Autofire cost
 * @returns {number}
 */
export function fullBlastRounds(standardRounds) {
  return standardRounds * 2;
}

/**
 * Whether the loaded magazine covers a Full Blast.
 *
 * @param {number} loadedRounds
 * @param {number} standardRounds - the native Autofire cost
 * @returns {boolean}
 */
export function canFullBlast(loadedRounds, standardRounds) {
  return loadedRounds >= fullBlastRounds(standardRounds);
}

/**
 * Damage Full Blast adds: +1 per die, multiplied. CPR multiplies the dice and
 * adds other modifiers afterward, so this equals raising each die by 1 first.
 *
 * @param {number} diceCount
 * @param {number} multiplier - CPR's capped Autofire multiplier
 * @returns {number}
 */
export function fullBlastBonus(diceCount, multiplier) {
  return diceCount * multiplier;
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test`
Expected: `# tests 4`, `# pass 4`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/rules.js test/rules.test.js
git commit -m "feat: add Full Blast rule math with unit tests"
```

---

### Task 3: Attack path (prompt, doubled ammo, marked card)

**Files:**

- Create: `scripts/main.js`, `scripts/full-blast.js`, `templates/full-blast-attack-card.hbs`

Covers R1 to R7 and R12 (spec §5) and units 1 to 4 and 7 (spec §6.3).

- [ ] **Step 1: Write `scripts/main.js`**

```js
import { register } from "./full-blast.js";

Hooks.once("init", register);
```

- [ ] **Step 2: Write `templates/full-blast-attack-card.hbs`** (spec §6.4)

```hbs
<div class="cpr-autofire-homebrew-full-blast">
  {{> (lookup this "fullBlastBaseCard")}}
</div>
```

- [ ] **Step 3: Write `scripts/full-blast.js` (attack half)**

```js
import { canFullBlast, fullBlastBonus, fullBlastRounds } from "./rules.js";

const MODULE_ID = "cpr-autofire-homebrew";
const MOD_ID = `${MODULE_ID}-full-blast`;
const CARD_TEMPLATE = `modules/${MODULE_ID}/templates/full-blast-attack-card.hbs`;
const MARKER_CLASS = `${MODULE_ID}-full-blast`;
const DAMAGE_TYPE = "fullblast";
const ITEM = "CONFIG.Item.documentClass.prototype";

/** Damage rolls this module decorated. Only these get the dialog checkbox. */
const damageRolls = new WeakSet();
/** Our bulletConsumption replacements, so none is ever wrapped twice. */
const doubled = new WeakSet();

const t = (key, data) =>
  game.i18n.format(`CPR_AUTOFIRE_HOMEBREW.${key}`, data);

/** Wires Full Blast into Cyberpunk RED. Must run in the init hook. */
export function register() {
  if (
    !globalThis.libWrapper ||
    typeof CONFIG.Item.documentClass?.prototype?.createRoll !== "function"
  ) {
    console.error(
      `${MODULE_ID} | libWrapper or the Cyberpunk RED item class is missing`,
    );
    Hooks.once("ready", () => ui.notifications.error(t("Errors.Unavailable")));
    return;
  }
  libWrapper.register(MODULE_ID, `${ITEM}.createRoll`, wrapCreateRoll, "WRAPPER");
  libWrapper.register(MODULE_ID, `${ITEM}.loadMixins`, wrapLoadMixins, "WRAPPER");
}

function wrapCreateRoll(wrapped, type, actor, extraData, ...rest) {
  const fullBlast = type === "damage" && extraData?.damageType === DAMAGE_TYPE;
  if (fullBlast) extraData = { ...extraData, damageType: "autofire" };
  const roll = wrapped(type, actor, extraData, ...rest);
  if (
    type === "autofire" &&
    this.system.isRanged &&
    typeof this.bulletConsumption === "function"
  ) {
    decorateAttack(roll, this);
  }
  return roll;
}

/** Puts the Full Blast prompt in front of CPR's attack dialog for this roll only. */
function decorateAttack(roll, item) {
  roll.handleRollDialog = async function handleRollDialog(event, ...args) {
    // Ammo math uses the item that created the roll, whatever a caller passes.
    const standard = item.bulletConsumption(this);
    const loaded = Number(item.system.magazine?.value) || 0;
    const choice = await promptFullBlast(item.name, loaded, standard);
    if (!choice) return false;
    if (choice === "fullBlast") {
      this.isFullBlast = true;
      this.fullBlastBaseCard = this.rollCard;
      await getTemplate(this.fullBlastBaseCard); // registers it as a partial
      this.rollCard = CARD_TEMPLATE;
      this.rollTitle = t("FullBlast.Title", { name: this.rollTitle });
    }
    // Resolved at call time so other modules' prototype wrappers still run.
    return Object.getPrototypeOf(this).handleRollDialog.call(
      this,
      event,
      ...args,
    );
  };
}

/** @returns {Promise<"fullBlast"|"standard"|null>} null when closed */
function promptFullBlast(weapon, loaded, standard) {
  const required = fullBlastRounds(standard);
  const allowed = canFullBlast(loaded, standard);
  const lines = [t("FullBlast.PromptLoaded", { loaded })];
  if (!allowed) lines.push(t("FullBlast.PromptShort", { required }));
  return foundry.applications.api.DialogV2.wait({
    window: { title: t("FullBlast.PromptTitle", { weapon }) },
    content: lines.map((line) => `<p>${line}</p>`).join(""),
    buttons: [
      {
        action: "fullBlast",
        label: t("FullBlast.ButtonFullBlast", { rounds: required }),
      },
      {
        action: "standard",
        label: t("FullBlast.ButtonStandard", { rounds: standard }),
        default: true,
      },
    ],
    rejectClose: false,
    render: (event, element) => {
      if (!allowed) {
        element.querySelector('[data-action="fullBlast"]').disabled = true;
      }
    },
  });
}

/** CPR recreates bulletConsumption on every loadMixins, so re-double it after each call. */
function wrapLoadMixins(wrapped, ...args) {
  const result = wrapped(...args);
  const native = this.bulletConsumption;
  if (typeof native === "function" && !doubled.has(native)) {
    const bulletConsumption = function bulletConsumption(roll) {
      const rounds = native.call(this, roll);
      return roll?.isFullBlast ? fullBlastRounds(rounds) : rounds;
    };
    doubled.add(bulletConsumption);
    this.bulletConsumption = bulletConsumption;
  }
  return result;
}
```

`fullBlastBonus`, `MOD_ID`, `MARKER_CLASS`, and `damageRolls` are used in Task 4. Until then, ESLint reports them as `no-unused-vars`, which is expected.

- [ ] **Step 4: Format and lint**

Run (from `D:\Antigravity\foundry-cpr`): `npx prettier --write modules/cpr-autofire-homebrew --ignore-path .prettierignore && npx eslint modules/cpr-autofire-homebrew`
Expected: only the `no-unused-vars` errors for `fullBlastBonus`, `MOD_ID`, `MARKER_CLASS`, and `damageRolls`.

- [ ] **Step 5: Commit**

```bash
git add scripts/main.js scripts/full-blast.js templates/full-blast-attack-card.hbs
git commit -m "feat: prompt for Full Blast on Autofire and double its ammo cost"
```

---

### Task 4: Damage path (bonus modifier, dialog checkbox, card button)

**Files:**

- Modify: `scripts/full-blast.js`

Covers R8 to R11 (spec §5) and units 2.2, 5, 6, and 8 (spec §6.3).

- [ ] **Step 1: Register the two hooks.** In `register()`, after the two `libWrapper.register` calls, add:

```js
  Hooks.on("renderCPRRollDialog", addDamageCheckbox);
  Hooks.on("renderChatMessage", retargetDamageButton);
```

- [ ] **Step 2: Decorate damage rolls.** In `wrapCreateRoll`, after the `decorateAttack` `if` block and before `return roll;`, add:

```js
  if (type === "damage") decorateDamage(roll, fullBlast);
```

- [ ] **Step 3: Append the damage units to `scripts/full-blast.js`**

```js
/** Adds the Full Blast bonus as one visible modifier when CPR computes damage. */
function decorateDamage(roll, fullBlast) {
  const baseTitle = roll.rollTitle;
  const fullBlastTitle = t("FullBlast.Title", { name: baseTitle });
  roll.isFullBlast = fullBlast;
  roll._computeBase = function _computeBase() {
    // CPR's removeMod splices the last mod when the id is absent, so remove by index.
    const index = this.mods.findIndex((mod) => mod.id === MOD_ID);
    if (index !== -1) this.mods.splice(index, 1);
    const base = Object.getPrototypeOf(this)._computeBase.call(this); // caps the multiplier
    if (!(this.isAutofire && this.isFullBlast)) {
      if (this.rollTitle === fullBlastTitle) this.rollTitle = baseTitle;
      return base;
    }
    const bonus = fullBlastBonus(this.faces.length, this.autofireMultiplier);
    if (bonus !== 0) {
      this.mods.push({ id: MOD_ID, value: bonus, source: t("FullBlast.ModSource") });
    }
    this.rollTitle = fullBlastTitle;
    return base + bonus;
  };
  damageRolls.add(roll);
}

/** "Full Blast?" after CPR's multiplier row. CPR's submitOnChange saves it onto the roll. */
function addDamageCheckbox(app, html) {
  const roll = app.rollData;
  if (!damageRolls.has(roll) || !roll.isAutofire) return;
  const anchor = html
    .find('input[name="autofireMultiplier"]')
    .closest("li.dialog-item");
  if (!anchor.length) return;
  anchor.after(`<li class="dialog-item flexrow ${MODULE_ID}-row">
    <div class="dialog-item-name text-nowrap">${t("FullBlast.DamageCheckbox")}</div>
    <div class="dialog-item-input text-nowrap">
      <input type="checkbox" name="isFullBlast" data-dtype="Boolean"${roll.isFullBlast ? " checked" : ""} />
    </div>
  </li>`);
}

/** Render-time only: the stored card keeps "autofire", so it rolls Autofire damage if this module is off. */
function retargetDamageButton(message, html) {
  html
    .find(`.${MARKER_CLASS} [data-action="rollDamage"][data-attack-type="autofire"]`)
    .attr("data-attack-type", DAMAGE_TYPE)
    .find("[data-tooltip]")
    .attr("data-tooltip", t("FullBlast.DamageTooltip"));
}
```

- [ ] **Step 4: Format, lint, and test**

Run (from `D:\Antigravity\foundry-cpr`): `npx prettier --write modules/cpr-autofire-homebrew --ignore-path .prettierignore && npm run lint && npm run format:check`
Expected: ESLint reports nothing. Prettier prints `All matched files use Prettier code style!`

Run (from the module repo): `npm test`
Expected: `# pass 4`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/full-blast.js
git commit -m "feat: add Full Blast damage bonus, dialog checkbox, and card button"
```

---

### Task 5: Link and verify in Foundry

- [ ] **Step 1: Link the module.** Run `npm run link` from `D:\Antigravity\foundry-cpr`.
      Expected: `linked cpr-autofire-homebrew` (and `ok cpr-dev-smoke`).
- [ ] **Step 2: Enable it.** Return to Foundry Setup so it rescans packages. Launch the `cyberpunk` world, then enable libWrapper and CPR Autofire Homebrew in Manage Modules. To test the native path, disable Pneuma's Combat Tools, turn off its `routeSheetAttacks` world setting, or attack with no target. With one target and `routeSheetAttacks` on, Pneuma's exchange replaces the native card (spec §10).
- [ ] **Step 3: Smoke check in the browser console (F12).**

```js
game.modules.get("cpr-autofire-homebrew").active; // true
```

Expected: `true`, no `cpr-autofire-homebrew |` errors in the console, no "could not hook" notification, and libWrapper's settings (Game Settings, libWrapper, Active Wrappers) list `createRoll` and `loadMixins` under this module.

- [ ] **Step 4: Run the manual checklist M1 to M11** (spec §9) with an SMG or assault rifle, a full magazine, and the Autofire box ticked. Record pass or fail per row in the PR description.

---

### Task 6: Pull request

- [ ] **Step 1: Push the branch:** `git push -u origin feat/full-blast`
- [ ] **Step 2: Open the PR into `main`:** `gh pr create --base main --head feat/full-blast --title "feat: Full Blast autofire rule" --body-file <body>`. The body lists the requirements covered (R1 to R13), the two spec deviations above, test evidence, and the M1 to M11 results. Open it as a draft if any manual row has not been run.
