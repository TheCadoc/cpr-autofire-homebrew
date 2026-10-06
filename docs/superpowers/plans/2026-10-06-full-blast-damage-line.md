# Full Blast Damage Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show `Full Blast! +1 per die (6 + 5)` in the stored damage card, directly above CPR's "Autofire! (x4)", so the dice, the multiplier, and the total reconcile at a glance.

**Architecture:** For Full Blast damage rolls only, the `_computeBase` override swaps `rollCard` to a module wrapper template. The wrapper renders CPR's native damage card as a partial inside a block helper, which inserts one line into CPR's `.d6-data-div`. The output is stored as message content. Spec: `docs/superpowers/specs/2026-10-06-full-blast-damage-line-design.md` ("line spec §n"); base spec `2026-10-05-full-blast-design.md`.

**Tech Stack:** Foundry VTT 12.343, Cyberpunk RED Core 0.92.4, libWrapper, Handlebars (Foundry global), Node 22 `node:test`, workspace ESLint and Prettier.

---

## File map

| File                                   | Change                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `scripts/rules.js`                     | Add `fullBlastFaces(faces)`.                                             |
| `test/rules.test.js`                   | Tests for `fullBlastFaces`.                                              |
| `templates/full-blast-damage-card.hbs` | New wrapper: block helper around CPR's damage card partial.              |
| `scripts/full-blast.js`                | Register the helper; swap `rollCard` and set the line in `_computeBase`. |
| `lang/en.json`                         | `FullBlast.DamageLine`.                                                  |
| `README.md`                            | Describe the visible line.                                               |

Lint and format run from `D:\Antigravity\foundry-cpr`, which ignores `**/.claude/**`. From a worktree, lint the worktree explicitly (Task 4) and rerun the workspace commands in the live clone during live testing.

---

### Task 1: `fullBlastFaces` rule

**Files:** Modify `scripts/rules.js`, `test/rules.test.js`

- [ ] **Step 1: Write the failing tests** (append to `test/rules.test.js`, and add `fullBlastFaces` to its import list)

```js
test("fullBlastFaces adds one to each natural face without mutating them", () => {
  const faces = [5, 4];
  assert.deepEqual(fullBlastFaces(faces), [6, 5]);
  assert.deepEqual(faces, [5, 4]);
  assert.deepEqual(fullBlastFaces([]), []);
});

test("the displayed Full Blast dice reconcile with the bonus modifier", () => {
  const sum = (values) => values.reduce((total, value) => total + value, 0);
  for (let d1 = 1; d1 <= 6; d1 += 1) {
    for (let d2 = 1; d2 <= 6; d2 += 1) {
      for (let m = 1; m <= 4; m += 1) {
        const faces = [d1, d2];
        assert.equal(
          sum(fullBlastFaces(faces)) * m,
          sum(faces) * m + fullBlastBonus(faces.length, m),
          `d1=${d1} d2=${d2} m=${m}`,
        );
      }
    }
  }
});
```

- [ ] **Step 2: Run** `npm test`. Expected: FAIL, `fullBlastFaces` is not exported.

- [ ] **Step 3: Implement** (append to `scripts/rules.js`)

```js
/**
 * Die values Full Blast counts: each natural face plus 1. For display only;
 * crits and die images keep the natural faces.
 *
 * @param {number[]} faces - natural d6 results
 * @returns {number[]}
 */
export function fullBlastFaces(faces) {
  return faces.map((face) => face + 1);
}
```

- [ ] **Step 4: Run** `npm test`. Expected: all tests pass.

- [ ] **Step 5: Commit** `feat: add fullBlastFaces for the damage card line`

### Task 2: Damage card wrapper, helper, and string

**Files:** Create `templates/full-blast-damage-card.hbs`; modify `scripts/full-blast.js`, `lang/en.json`

- [ ] **Step 1: Template** `templates/full-blast-damage-card.hbs`

```hbs
<div class="cpr-autofire-homebrew-full-blast">
  {{#cprAutofireHomebrewDamageLine fullBlastLine}}
    {{> (lookup this "fullBlastBaseCard")}}
  {{/cprAutofireHomebrewDamageLine}}
</div>
```

- [ ] **Step 2: String** in `lang/en.json` under `FullBlast`, after `ModSource`:

```json
"DamageLine": "Full Blast! +1 per die ({dice})",
```

- [ ] **Step 3: `scripts/full-blast.js`**

Import `fullBlastFaces` alongside the other rules. Add constants after `CARD_TEMPLATE`:

```js
const DAMAGE_CARD_TEMPLATE = `modules/${MODULE_ID}/templates/full-blast-damage-card.hbs`;
const LINE_HELPER = "cprAutofireHomebrewDamageLine";
```

and after `MARKER_CLASS`:

```js
const LINE_CLASS = `${MARKER_CLASS}-line`;
```

In `register()`, before the two `Hooks.on` calls:

```js
Handlebars.registerHelper(LINE_HELPER, insertDamageLine);
```

Replace `decorateDamage` with:

```js
/** Adds the Full Blast bonus as one modifier when CPR computes damage, and shows it on the card. */
function decorateDamage(roll, fullBlast) {
  const baseTitle = roll.rollTitle;
  const baseCard = roll.rollCard;
  const fullBlastTitle = t("FullBlast.Title", { name: baseTitle });
  roll.isFullBlast = fullBlast;
  roll._computeBase = function _computeBase() {
    // CPR's removeMod splices the last mod when the id is absent, so remove by index.
    const index = this.mods.findIndex((mod) => mod.id === MOD_ID);
    if (index !== -1) this.mods.splice(index, 1);
    if (this.rollCard === DAMAGE_CARD_TEMPLATE) this.rollCard = baseCard;
    const base = Object.getPrototypeOf(this)._computeBase.call(this); // caps the multiplier
    if (!(this.isAutofire && this.isFullBlast)) {
      if (this.rollTitle === fullBlastTitle) this.rollTitle = baseTitle;
      return base;
    }
    const bonus = fullBlastBonus(this.faces.length, this.autofireMultiplier);
    if (bonus !== 0) {
      this.mods.push({
        id: MOD_ID,
        value: bonus,
        source: t("FullBlast.ModSource"),
      });
      showDamageLine(this, baseCard, bonus);
    }
    this.rollTitle = fullBlastTitle;
    return base + bonus;
  };
  damageRolls.add(roll);
}

/** Renders the card through the wrapper. Without CPR's card as a partial, keeps the native card. */
function showDamageLine(roll, baseCard, bonus) {
  if (!(baseCard in Handlebars.partials)) return;
  roll.fullBlastBaseCard = baseCard;
  roll.fullBlastLine = t("FullBlast.DamageLine", {
    dice: fullBlastFaces(roll.faces).join(" + "),
    bonus,
  });
  roll.rollCard = DAMAGE_CARD_TEMPLATE;
}

/** Block helper: puts the line first in CPR's dice column, or after the card if the column is gone. */
function insertDamageLine(line, options) {
  const card = document.createElement("template");
  card.innerHTML = options.fn(this);
  const row = document.createElement("div");
  row.className = `text-normal text-semi ${LINE_CLASS}`;
  row.textContent = line;
  const column = card.content.querySelector(".d6-data-div");
  if (column) column.prepend(row);
  else card.content.append(row);
  return new Handlebars.SafeString(card.innerHTML);
}
```

`bonus` is passed even though the shipped string does not use it, so wording options 2 and 3 are string-only changes.

- [ ] **Step 4: Run** `npm test`. Expected: pass (no Node coverage for Foundry glue; Task 5 checks it live).

- [ ] **Step 5: Commit** `feat: show the Full Blast bonus on the damage card`

### Task 3: README

- [ ] **Step 1:** In `README.md`, replace the sentence "The damage card shows the bonus as a "Full Blast (+1 per die)" modifier." with:

```md
The damage card shows a line such as "Full Blast! +1 per die (6 + 5)" above the Autofire multiplier, and lists the bonus as a "Full Blast (+1 per die)" modifier in the breakdown. Die images keep the natural rolls.
```

Add `- Damage card line: docs/superpowers/specs/2026-10-06-full-blast-damage-line-design.md.` under Development.

- [ ] **Step 2: Commit** `docs: describe the Full Blast damage card line`

### Task 4: Static checks

- [ ] Run `npm test` in the worktree. Expected: all pass.
- [ ] From `D:\Antigravity\foundry-cpr`: `npx eslint --no-ignore modules/cpr-autofire-homebrew/.claude/worktrees/damage-card-line` and `npx prettier --check "modules/cpr-autofire-homebrew/.claude/worktrees/damage-card-line/**/*.{js,json,md}"`. Expected: clean.

### Task 5: Live test (only while holding the live clone)

From a session that is not inside the worktree (ExitWorktree keep first): in the live clone run `git checkout --detach feat/full-blast-damage-line`, then `npm run lint` and `npm run format:check` from `foundry-cpr`. In Foundry (recipe in the task brief), run line spec §6 checks D1 to D5 with Pneuma disabled, then restore the module configuration found at the start, delete the temp actor and its messages, `game.shutDown()`, `git switch main` in the live clone, and send `foundry pneuma-compat` "live clone released".
