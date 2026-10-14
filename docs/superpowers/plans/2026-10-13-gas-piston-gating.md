# Adjustable Gas Piston gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An optional world setting that limits Full Blast to weapons with the Adjustable Gas Piston installed, and a compendium that ships the piston as a native CPR upgrade item.

**Architecture:** Pure rules in `scripts/gating.js` decide whether a weapon may Full Blast, from the setting and the module flag on the weapon's installed upgrades. `scripts/full-blast.js` uses them at its single prompt entry point (`wrapCreateRoll`) and in the damage dialog checkbox. The piston item is JSON under `packs/_source/`, compiled to LevelDB by `@foundryvtt/foundryvtt-cli` in `npm run packs`, CI, and the release workflow; the compiled pack is not committed.

**Tech Stack:** Foundry VTT v12 (12.343), Cyberpunk RED Core 0.92.4, libWrapper, plain ES modules, Node 22 (`node --test`), `@foundryvtt/foundryvtt-cli` 3.x, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-11-gas-piston-gating-design.md`. Lukasz accepted the review's recommendations on 2026-10-13: world scope, a native upgrade item detected by flag, 0 slots, no code restriction to Autofire weapons, no prompt for a gated weapon, the checkbox hidden only when the roll is not already Full Blast, old Full Blast cards still roll Full Blast damage, compiled packs gitignored and built in release, and the 3d6 alternate rule out of scope.

**Open before merge (not before implementation):** spec question 6. The piston ships as an item, so Lukasz either hears back from u/Infernox-Ratchet or decides to ship with the credit alone. The PR stays draft until he says which.

---

## File structure

| File                                                               | Change | Responsibility                                                            |
| ------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------- |
| `scripts/constants.js`                                             | modify | `GAS_PISTON_FLAG`, shared by the rules and the pack data                  |
| `scripts/gating.js`                                                | create | Pure: `allowsFullBlast(gatingOn, hasPiston)` and `hasGasPiston(upgrades)` |
| `test/gating.test.js`                                              | create | Unit tests for `gating.js`                                                |
| `scripts/full-blast.js`                                            | modify | The setting, `fullBlastAllowed(item)`, the prompt gate, the checkbox gate |
| `lang/en.json`                                                     | modify | The setting's name and hint                                               |
| `packs/_source/autofire-homebrew-items/adjustable-gas-piston.json` | create | The piston item source                                                    |
| `test/packs.test.js`                                               | create | Checks every pack source entry and the piston's key fields                |
| `tools/build-packs.mjs`                                            | create | Compiles every folder in `packs/_source/` into `packs/<name>`             |
| `package.json`, `package-lock.json`                                | modify | `@foundryvtt/foundryvtt-cli` devDependency, `packs` script                |
| `eslint.config.mjs`                                                | modify | Node globals for `tools/`                                                 |
| `.gitignore`                                                       | modify | Ignore compiled packs, keep `packs/_source/`                              |
| `module.json`                                                      | modify | The `packs` entry; version 0.4.0                                          |
| `.github/workflows/ci.yml`                                         | modify | Compile the packs in CI                                                   |
| `.github/workflows/release.yml`                                    | modify | Install, compile, and zip `packs/` without `packs/_source/`               |
| `docs/superpowers/specs/2026-10-07-go-public-design.md`            | modify | G9 file list gains `packs/` (spec R8)                                     |
| `docs/superpowers/specs/2026-10-11-gas-piston-gating-design.md`    | modify | Status and decisions marked accepted                                      |
| `README.md`, `CONTRIBUTING.md`                                     | modify | The setting, the compendium, the build step                               |

Facts the code relies on, all checked against CPR v0.92.4 (`foundry-cpr/reference/fvtt-cyberpunk-red-core/src/`) on 2026-10-13:

- `getInstalledItems(type)` is an own property set by CPR's container mixin (`modules/item/mixins/cpr-container.js:60-77`). On an actor-owned weapon it resolves ids with `actor.getOwnedItem`. Check `typeof item.getInstalledItems === "function"` before calling it.
- `installItems([item])` and `uninstallItems([item])` (`cpr-container.js:221`, `:358`) are the install API the live test uses.
- `CPRRollDialog` stores the item as `app.item` (`modules/dialog/cpr-roll-dialog.js:15-30`).
- An `itemUpgrade` with `system.size` 0 installs without using a slot (`installable-schema.js:14-20`, `cpr-container.js:200-211`).
- Item `flags` survive install, uninstall, and copies (`cpr-container.js:248-276, 534-571`).
- CPR's latest data model version is 38 (`modules/system/migrate/migration.js:18`). An item whose `flags["cyberpunk-red-core"]._migration.current` is 38 counts as migrated (`migration.js:719-727`).
- Foundry v12 shows a pack's `label` as written; it is not localized (`client/apps/sidebar/tabs/compendium-directory.js:205, 234`). The pack label is therefore the one new string outside `lang/en.json`.
- `compilePack(src, dest, { log })` in `@foundryvtt/foundryvtt-cli` 3.0.5 reads `*.json` files directly under `src`, skips any entry without `_key`, and deletes keys that are no longer in the source (`lib/package.mjs:258-390`).

---

### Task 1: Pure gating rules

**Files:**

- Modify: `scripts/constants.js`
- Create: `scripts/gating.js`
- Test: `test/gating.test.js`

- [ ] **Step 1: Write the failing tests**

Create `test/gating.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { allowsFullBlast, hasGasPiston } from "../scripts/gating.js";

const flagged = (value) => ({
  flags: { "cpr-autofire-homebrew": { gasPiston: value } },
});

test("allowsFullBlast allows every weapon while gating is off", () => {
  assert.equal(allowsFullBlast(false, false), true);
  assert.equal(allowsFullBlast(false, true), true);
});

test("allowsFullBlast requires the piston while gating is on", () => {
  assert.equal(allowsFullBlast(true, true), true);
  assert.equal(allowsFullBlast(true, false), false);
});

test("hasGasPiston finds the module flag on any installed upgrade", () => {
  assert.equal(hasGasPiston([]), false);
  assert.equal(hasGasPiston([{ flags: {} }]), false);
  assert.equal(hasGasPiston([{ flags: {} }, flagged(true)]), true);
});

test("hasGasPiston needs the flag to be exactly true", () => {
  assert.equal(hasGasPiston([flagged("true")]), false);
  assert.equal(hasGasPiston([flagged(1)]), false);
  // A renamed or translated piston still counts; a lookalike name does not.
  assert.equal(
    hasGasPiston([{ name: "Adjustable Gas Piston", flags: {} }]),
    false,
  );
});

test("hasGasPiston treats bad input as no piston", () => {
  assert.equal(hasGasPiston(undefined), false);
  assert.equal(hasGasPiston([null, undefined]), false);
  assert.equal(hasGasPiston([{}]), false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, `Cannot find module '.../scripts/gating.js'`.

- [ ] **Step 3: Add the flag constant**

Append to `scripts/constants.js`:

```js
/** Flag key under `flags["cpr-autofire-homebrew"]` that marks an upgrade as the Adjustable Gas Piston. */
export const GAS_PISTON_FLAG = "gasPiston";
```

- [ ] **Step 4: Write the rules**

Create `scripts/gating.js`:

```js
// Rules for gating Full Blast behind the Adjustable Gas Piston. No Foundry globals, so Node can unit-test them.
import { GAS_PISTON_FLAG, MODULE_ID } from "./constants.js";

/**
 * Whether a weapon may Full Blast.
 *
 * @param {boolean} gatingOn - the "Require the Adjustable Gas Piston" setting
 * @param {boolean} hasPiston - whether the weapon has the piston installed
 * @returns {boolean}
 */
export function allowsFullBlast(gatingOn, hasPiston) {
  return !gatingOn || hasPiston;
}

/**
 * Whether any installed upgrade is the Adjustable Gas Piston. Matches this module's flag, never the
 * name, so a renamed or translated copy still counts.
 *
 * @param {Array<{flags?: object}|null|undefined>|undefined} upgrades
 * @returns {boolean}
 */
export function hasGasPiston(upgrades) {
  return (
    Array.isArray(upgrades) &&
    upgrades.some(
      (upgrade) => upgrade?.flags?.[MODULE_ID]?.[GAS_PISTON_FLAG] === true,
    )
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. The count is 25 before this task plus 5 new tests, so `# pass 30`, `# fail 0`.

- [ ] **Step 6: Lint and format**

Run: `npm run lint` and `npm run format:check`
Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add scripts/constants.js scripts/gating.js test/gating.test.js
git commit -m "feat: add the pure rules for gating Full Blast behind the Gas Piston"
```

---

### Task 2: Gate the prompt and the damage checkbox

**Files:**

- Modify: `scripts/full-blast.js:1-27` (imports, constants, state), `:41-53` (settings loop), `:80-86` (`wrapCreateRoll`), `:164-200` (`decorateDamage`), `:227-229` (`addDamageCheckbox`)
- Modify: `lang/en.json` (`Settings`)

No unit test: this task is Foundry wiring around the pure rules from Task 1. Task 7's live checks M1 to M7 and M10 cover it.

- [ ] **Step 1: Import the rules and add the setting key**

In `scripts/full-blast.js`, after line 9 (`import { takePneumaFullBlast } from "./pneuma.js";`) add:

```js
import { allowsFullBlast, hasGasPiston } from "./gating.js";
```

After line 20 (`const CRITICAL_SETTING = "modifiedCriticals";`) add:

```js
const GATING_SETTING = "requireGasPiston";
```

After line 27 (the `doubled` WeakSet) add:

```js
/** Damage rolls that started as Full Blast (from a Full Blast card or Pneuma exchange), so gating never hides their checkbox. */
const startedFullBlast = new WeakSet();
```

- [ ] **Step 2: Register the setting**

Replace the settings list in `register()` (lines 41-44):

```js
  for (const [key, label] of [
    [ABOVE_SIX_SETTING, "AboveSix"],
    [CRITICAL_SETTING, "ModifiedCriticals"],
  ]) {
```

with:

```js
  for (const [key, label] of [
    [ABOVE_SIX_SETTING, "AboveSix"],
    [CRITICAL_SETTING, "ModifiedCriticals"],
    [GATING_SETTING, "RequireGasPiston"],
  ]) {
```

The loop already registers each one as a world Boolean, `config: true`, default `false`.

- [ ] **Step 3: Add `fullBlastAllowed`**

Add this function directly above `function wrapCreateRoll(` (line 71):

```js
/** Whether this weapon may Full Blast under the "Require the Adjustable Gas Piston" setting. */
function fullBlastAllowed(item) {
  const upgrades =
    typeof item?.getInstalledItems === "function"
      ? item.getInstalledItems("itemUpgrade")
      : [];
  return allowsFullBlast(setting(GATING_SETTING), hasGasPiston(upgrades));
}
```

- [ ] **Step 4: Gate the prompt**

In `wrapCreateRoll`, replace:

<!-- prettier-ignore -->
```js
  if (
    type === "autofire" &&
    this.system.isRanged &&
    typeof this.bulletConsumption === "function"
  ) {
    decorateAttack(roll, this);
  }
```

with:

<!-- prettier-ignore -->
```js
  if (
    type === "autofire" &&
    this.system.isRanged &&
    typeof this.bulletConsumption === "function" &&
    fullBlastAllowed(this)
  ) {
    decorateAttack(roll, this);
  }
```

A gated weapon's attack is never decorated, so it never sets `isFullBlast`, pays the native cost (the `loadMixins` wrapper only doubles for `roll.isFullBlast`), and its card carries no marker, so neither CPR's damage button nor Pneuma's is retargeted.

- [ ] **Step 5: Remember rolls that started as Full Blast**

In `decorateDamage`, replace the last line, `damageRolls.add(roll);` (indented two spaces), with:

<!-- prettier-ignore -->
```js
  damageRolls.add(roll);
  if (fullBlast) startedFullBlast.add(roll);
```

- [ ] **Step 6: Gate the checkbox**

In `addDamageCheckbox`, replace:

<!-- prettier-ignore -->
```js
  const roll = app.rollData;
  if (!damageRolls.has(roll) || !roll.isAutofire) return;
```

with:

<!-- prettier-ignore -->
```js
  const roll = app.rollData;
  if (!damageRolls.has(roll) || !roll.isAutofire) return;
  // A Full Blast card made before gating still rolls Full Blast damage, so its checkbox stays.
  if (!startedFullBlast.has(roll) && !fullBlastAllowed(app.item)) return;
```

`startedFullBlast` rather than `roll.isFullBlast`, because CPR's `submitOnChange` writes the checkbox back onto `roll.isFullBlast`. Unticking it and re-rendering must not make the box disappear.

- [ ] **Step 7: Add the strings**

In `lang/en.json`, replace:

```json
      "ModifiedCriticals": {
        "Name": "Count modified dice towards criticals",
        "Hint": "Off: only natural 6s count toward a critical. On: a die Full Blast raises to 6 or more also counts, so a natural 5 counts."
      }
```

with:

```json
      "ModifiedCriticals": {
        "Name": "Count modified dice towards criticals",
        "Hint": "Off: only natural 6s count toward a critical. On: a die Full Blast raises to 6 or more also counts, so a natural 5 counts."
      },
      "RequireGasPiston": {
        "Name": "Require the Adjustable Gas Piston for Full Blast",
        "Hint": "Off: every Autofire weapon can Full Blast. On: only a weapon with the Adjustable Gas Piston installed can; others fire standard Autofire. The piston is in the Autofire Homebrew Items compendium."
      }
```

- [ ] **Step 8: Run the checks**

Run: `npm test`, `npm run lint`, `npm run format:check`
Expected: `# pass 30`, `# fail 0`; lint and format clean.

- [ ] **Step 9: Commit**

```bash
git add scripts/full-blast.js lang/en.json
git commit -m "feat: limit Full Blast to weapons with the Gas Piston when the setting is on"
```

---

### Task 3: The piston item source

**Files:**

- Create: `packs/_source/autofire-homebrew-items/adjustable-gas-piston.json`
- Test: `test/packs.test.js`

- [ ] **Step 1: Write the failing test**

Create `test/packs.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const SOURCE = new URL("../packs/_source/", import.meta.url);

/** Every pack source entry, as [pack folder, file name, document]. */
const entries = readdirSync(SOURCE, { withFileTypes: true })
  .filter((dir) => dir.isDirectory())
  .flatMap((dir) =>
    readdirSync(new URL(`${dir.name}/`, SOURCE))
      .filter((file) => file.endsWith(".json"))
      .map((file) => [
        dir.name,
        file,
        JSON.parse(
          readFileSync(new URL(`${dir.name}/${file}`, SOURCE), "utf8"),
        ),
      ]),
  );

test("every pack entry has a Foundry id and the LevelDB key compilePack needs", () => {
  assert.ok(entries.length > 0);
  const ids = new Set();
  for (const [, file, doc] of entries) {
    assert.match(doc._id, /^[a-zA-Z0-9]{16}$/, file);
    assert.equal(doc._key, `!items!${doc._id}`, file);
    assert.ok(!ids.has(doc._id), `${file}: duplicate _id`);
    ids.add(doc._id);
  }
});

test("the Adjustable Gas Piston is a flagged, slotless weapon upgrade", () => {
  const pistons = entries.filter(
    ([, , doc]) => doc.flags?.["cpr-autofire-homebrew"]?.gasPiston === true,
  );
  assert.equal(pistons.length, 1);
  const [[pack, , piston]] = pistons;
  assert.equal(pack, "autofire-homebrew-items");
  assert.equal(piston.type, "itemUpgrade");
  assert.equal(piston.system.type, "weapon");
  assert.equal(piston.system.size, 0);
  assert.equal(piston.system.price.market, 1000);
  assert.equal(piston.flags["cyberpunk-red-core"]._migration.current, 38);
  assert.match(piston.system.description.value, /u\/Infernox-Ratchet/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL with `ENOENT: no such file or directory, scandir '.../packs/_source/'`.

- [ ] **Step 3: Write the item**

Create `packs/_source/autofire-homebrew-items/adjustable-gas-piston.json`. The description is in this project's words (go-public G2); copy nothing from the source doc.

```json
{
  "_id": "afhGasPiston0001",
  "_key": "!items!afhGasPiston0001",
  "name": "Adjustable Gas Piston",
  "type": "itemUpgrade",
  "img": "icons/svg/upgrade.svg",
  "system": {
    "type": "weapon",
    "size": 0,
    "price": { "market": 1000 },
    "description": {
      "value": "<p>An invented tech upgrade for a weapon capable of Autofire. A weapon with it installed can Full Blast: an Autofire attack that spends twice the usual ammunition and adds 1 to each damage die before the Autofire multiplier. A raised die stops at 6 unless the GM turns on <em>Allow dice results to be modified above 6</em>.</p><p>Inventing it is an Upgrade DV24 check. The first cost is the cost of the weapon being upgraded; the second cost, 1,000eb, is this item's price. It takes no upgrade slot. Installed in a weapon without Autofire, it does nothing.</p><p>It matters only when the GM turns on <em>Require the Adjustable Gas Piston for Full Blast</em>. Otherwise every Autofire weapon can Full Blast.</p><p><em>Adapted from the Adjustable Gas Piston by u/Infernox-Ratchet, in Heavy Armor Lizard's Autofire Compendium.</em></p>"
    }
  },
  "effects": [],
  "flags": {
    "cpr-autofire-homebrew": { "gasPiston": true },
    "cyberpunk-red-core": { "_migration": { "current": 38 } }
  }
}
```

The `system` object lists only the fields that differ from CPR's defaults. CPR's data model fills in every other field when Foundry loads the item, so the source does not go stale when CPR adds fields. If Task 7 check M8 shows a validation error on load, replace `system` with the full field set from `foundry-cpr/reference/fvtt-cyberpunk-red-core/src/packs/core/upgrades/itemupgrade.infrared.nightvision.scope.yaml`, converted to JSON, keeping the values above.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: `# pass 32`, `# fail 0`.

- [ ] **Step 5: Format**

Run: `npm run format:check`
Expected: clean. If Prettier reports the new JSON, run `npx prettier --write packs/_source` and re-run the check.

- [ ] **Step 6: Commit**

```bash
git add packs/_source/autofire-homebrew-items/adjustable-gas-piston.json test/packs.test.js
git commit -m "feat: add the Adjustable Gas Piston item source"
```

---

### Task 4: Compile the pack

**Files:**

- Create: `tools/build-packs.mjs`
- Modify: `package.json`, `package-lock.json`, `eslint.config.mjs`, `.gitignore`, `module.json`, `.github/workflows/ci.yml`

- [ ] **Step 1: Install the CLI**

Run: `npm install --save-dev @foundryvtt/foundryvtt-cli@^3.0.5`
Expected: `package.json` gains `"@foundryvtt/foundryvtt-cli": "^3.0.5"` under `devDependencies`, and `package-lock.json` changes.

- [ ] **Step 2: Write the build script**

Create `tools/build-packs.mjs`:

```js
// Compiles each folder in packs/_source/ into a LevelDB pack in packs/. Foundry locks an open pack, so close the world first.
import { readdir } from "node:fs/promises";
import { compilePack } from "@foundryvtt/foundryvtt-cli";

const SOURCE = "packs/_source";

for (const entry of await readdir(SOURCE, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  await compilePack(`${SOURCE}/${entry.name}`, `packs/${entry.name}`, {
    log: true,
  });
}
```

It lives in `tools/`, not `scripts/`, because `scripts/` ships in `module.zip`.

- [ ] **Step 3: Add the npm script**

In `package.json` `scripts`, after `"format:check": "prettier --check ."`, add a comma and:

```json
    "packs": "node tools/build-packs.mjs"
```

- [ ] **Step 4: Give `tools/` the Node globals**

In `eslint.config.mjs`, replace:

```js
    files: ["test/**/*.js", ".github/scripts/**/*.mjs"],
```

with:

```js
    files: ["test/**/*.js", ".github/scripts/**/*.mjs", "tools/**/*.mjs"],
```

- [ ] **Step 5: Ignore the compiled packs**

Append to `.gitignore`:

```
packs/*
!packs/_source/
```

- [ ] **Step 6: Declare the pack**

In `module.json`, after the `"languages"` line, add:

```json
  "packs": [
    {
      "name": "autofire-homebrew-items",
      "label": "Autofire Homebrew Items",
      "path": "packs/autofire-homebrew-items",
      "type": "Item",
      "system": "cyberpunk-red-core"
    }
  ],
```

- [ ] **Step 7: Build and check the output**

Run: `npm run packs`
Expected: a log line for the Adjustable Gas Piston, exit 0, and a `packs/autofire-homebrew-items/` folder holding LevelDB files (`CURRENT`, `LOG`, `MANIFEST-*`, and `.ldb` or `.log` files).

Run: `git status --short`
Expected: `packs/autofire-homebrew-items/` is not listed (ignored), and `packs/_source/...` is already committed, so it does not show either.

- [ ] **Step 8: Compile in CI**

In `.github/workflows/ci.yml`, replace:

<!-- prettier-ignore -->
```yaml
      - run: npm ci
      - run: npm test
```

with:

<!-- prettier-ignore -->
```yaml
      - run: npm ci
      - run: npm run packs
      - run: npm test
```

- [ ] **Step 9: Run the checks**

Run: `npm test`, `npm run lint`, `npm run format:check`
Expected: `# pass 32`; lint and format clean. If format:check reports a file under `packs/autofire-homebrew-items/`, add `packs/*` and `!packs/_source/` to `.prettierignore` too.

- [ ] **Step 10: Commit**

```bash
git add tools/build-packs.mjs package.json package-lock.json eslint.config.mjs .gitignore module.json .github/workflows/ci.yml
git commit -m "build: compile the Autofire Homebrew Items pack with the Foundry CLI"
```

---

### Task 5: Ship the pack in the release

**Files:**

- Modify: `.github/workflows/release.yml`
- Modify: `docs/superpowers/specs/2026-10-07-go-public-design.md:75` (G9)

- [ ] **Step 1: Install and compile before zipping**

In `.github/workflows/release.yml`, replace:

<!-- prettier-ignore -->
```yaml
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - name: Check the tag and pin the download URL
        run: node .github/scripts/stamp-manifest.mjs
      - name: Build module.zip
        run: zip -r module.zip module.json LICENSE README.md scripts styles templates lang
```

with:

<!-- prettier-ignore -->
```yaml
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Check the tag and pin the download URL
        run: node .github/scripts/stamp-manifest.mjs
      - name: Compile the compendium packs
        run: npm run packs
      - name: Build module.zip
        run: zip -r module.zip module.json LICENSE README.md scripts styles templates lang packs -x "packs/_source" "packs/_source/*"
      - name: Check that module.zip ships no pack sources
        run: test -z "$(unzip -Z1 module.zip | grep 'packs/_source')"
```

- [ ] **Step 2: Update G9**

In `docs/superpowers/specs/2026-10-07-go-public-design.md`, replace:

```
- **G9.** `module.zip` has `module.json` at its root and contains only `module.json`, `LICENSE`, `README.md`, `scripts/`, `styles/`, `templates/`, and `lang/`.
```

with:

```
- **G9.** `module.zip` has `module.json` at its root and contains only `module.json`, `LICENSE`, `README.md`, `scripts/`, `styles/`, `templates/`, `lang/`, and, from 0.4.0, the compiled `packs/` without `packs/_source/`.
```

- [ ] **Step 3: Check the zip's file list locally**

`zip` is not installed on the Windows workstation, so list what the workflow's `zip` command would include. After `npm run packs`, run:

```bash
node -e "const fs=require('node:fs'),p=require('node:path');const out=[];const walk=(d)=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=p.posix.join(d,e.name);if(f.startsWith('packs/_source'))continue;e.isDirectory()?walk(f):out.push(f)}};for(const t of ['module.json','LICENSE','README.md'])out.push(t);for(const d of ['scripts','styles','templates','lang','packs'])walk(d);console.log(out.join('\n'))"
```

Expected: the files under `scripts/`, `styles/`, `templates/`, and `lang/` as today, plus `packs/autofire-homebrew-items/...` LevelDB files, and nothing under `packs/_source/`.

- [ ] **Step 4: Format and commit**

Run: `npm run format:check`
Expected: clean.

```bash
git add .github/workflows/release.yml docs/superpowers/specs/2026-10-07-go-public-design.md
git commit -m "ci: compile and ship the compendium packs in module.zip"
```

---

### Task 6: Docs and version

**Files:**

- Modify: `README.md`, `CONTRIBUTING.md`, `module.json` (version), `docs/superpowers/specs/2026-10-11-gas-piston-gating-design.md`

- [ ] **Step 1: README, Full Blast section**

Replace:

```
When you attack with Autofire, a prompt asks whether to Full Blast. Every Autofire weapon gets the prompt.
```

with:

```
When you attack with Autofire, a prompt asks whether to Full Blast. Every Autofire weapon gets the prompt, unless the GM requires the Adjustable Gas Piston (see Settings).
```

- [ ] **Step 2: README, Settings section**

Replace:

```
Two world settings, both off by default and independent:
```

with:

```
Three world settings, all off by default and independent:
```

Then, directly after the bullet that starts `- **Count modified dice towards criticals**`, add:

```
- **Require the Adjustable Gas Piston for Full Blast**: only a weapon with the Adjustable Gas Piston installed gets the prompt. Other Autofire weapons fire standard Autofire, and their damage dialog has no "Full Blast?" checkbox. The piston is in the **Autofire Homebrew Items** compendium; install it in a weapon like any upgrade. It takes no slot. Full Blast cards made before the setting was turned on still roll Full Blast damage.
```

- [ ] **Step 3: README, Differences from the source**

Replace:

```
- Full Blast works with every Autofire weapon. The source makes it an invented tech upgrade (Upgrade DV24, 1,000eb) installed on one weapon; this module has no upgrade, DV, or cost. Gating Full Blast per weapon is [issue #10](https://github.com/TheCadoc/cpr-autofire-homebrew/issues/10).
```

with:

```
- By default, Full Blast works with every Autofire weapon. The source makes it an invented tech upgrade (Upgrade DV24, 1,000eb) installed on one weapon. **Require the Adjustable Gas Piston for Full Blast** (off by default) enforces the upgrade, but not its DV or cost.
```

- [ ] **Step 4: CONTRIBUTING**

Replace:

```
This module targets Foundry VTT v12 (verified 12.343) and Cyberpunk RED Core 0.92.4. It is plain ES modules with no build step.
```

with:

```
This module targets Foundry VTT v12 (verified 12.343) and Cyberpunk RED Core 0.92.4. It is plain ES modules. The only build step compiles the compendium packs (`npm run packs`).
```

Replace:

```
3. Run `npm ci`.
```

with:

```
3. Run `npm ci`, then `npm run packs`. The compiled packs are not committed, so Foundry sees no compendium until you build it.
```

After the line `- \`npm run format\` and \`npm run format:check\`: Prettier.`, add:

```
- `npm run packs`: compiles `packs/_source/` into the LevelDB packs Foundry loads. Close the world first: Foundry locks a pack while the world is open. Run it again after any change under `packs/_source/`, then relaunch the world.
```

- [ ] **Step 5: Version**

In `module.json`, replace `"version": "0.3.0",` with `"version": "0.4.0",`.

- [ ] **Step 6: Record the accepted decisions in the spec**

In `docs/superpowers/specs/2026-10-11-gas-piston-gating-design.md`:

- Replace the line `- Status: draft; reviewed 2026-10-13, decisions open (section 2). Not approved.` with `- Status: approved 2026-10-13. Lukasz accepted the review's recommendations for decisions 2 to 12; question 6 (asking the author before shipping the item) is open until the PR merges.`
- In the section 2 table, change the Status cell of decisions 2 to 12 from `Open` to `Decided`.
- Add a line under the header: `- Plan: docs/superpowers/plans/2026-10-13-gas-piston-gating.md`.

- [ ] **Step 7: Format and commit**

Run: `npm run format:check` (and `npx prettier --write README.md CONTRIBUTING.md docs` if it reports a file), then `npm test`.
Expected: clean; `# pass 32`.

```bash
git add README.md CONTRIBUTING.md module.json docs/superpowers/specs/2026-10-11-gas-piston-gating-design.md
git commit -m "docs: describe the Gas Piston setting and compendium, and bump to 0.4.0"
```

---

### Task 7: Live test

Runs against the pushed branch in the live clone, which is the copy Foundry loads. Gotchas: `memory/pneuma-live-test-gotchas.md` and `memory/live-clone-worktree-git-block.md` in the workspace's Claude memory.

**Setup**

- [ ] Push: `git push -u origin feat/gas-piston-gating`.
- [ ] Leave the worktree with `ExitWorktree` (`keep`); the harness refuses git in the live clone from inside it.
- [ ] Make sure Foundry is not running: `curl -s -o /dev/null -w "%{http_code}" http://localhost:30000/` prints `000`. The pack build needs the pack unlocked.
- [ ] In the live clone: `git -C D:/Antigravity/foundry-cpr/modules/cpr-autofire-homebrew fetch origin`, then `git -C D:/Antigravity/foundry-cpr/modules/cpr-autofire-homebrew checkout --detach origin/feat/gas-piston-gating`.
- [ ] From `D:\Antigravity\foundry-cpr\modules\cpr-autofire-homebrew`: `npm ci`, then `npm run packs`. Expected: `packs/autofire-homebrew-items/` exists.
- [ ] Start Foundry headless as a background Bash task: `node "C:/Program Files/Foundry Virtual Tabletop/resources/app/main.js" --dataPath="C:/Users/Lukasz/AppData/Local/FoundryVTT" --port=30000`. Wait until the log says "Server started and listening on port 30000".
- [ ] With Playwright, open `http://localhost:30000/setup` and launch the world: `await fetch('/setup', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'launchWorld', world:'cyberpunk'})})`. Open `/join` and join as Gamemaster: `await fetch('/join', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'join', userid:'GL8aKrML8b7z0Bsm', password:''})})`. Open `/game` and wait for `game.ready`.
- [ ] Record the starting state and keep it in the session notes:

```js
const before = {
  modules: foundry.utils.deepClone(
    game.settings.get("core", "moduleConfiguration"),
  ),
  messages: game.messages.map((m) => m.id),
  actors: game.actors.map((a) => a.id),
  scenes: game.scenes.map((s) => s.id),
  combats: game.combats.map((c) => c.id),
  viewed: game.scenes.viewed?.id,
  route: game.settings.get("pneuma-combattools", "routeSheetAttacks"),
  gating: game.settings.get("cpr-autofire-homebrew", "requireGasPiston"),
};
JSON.stringify(before);
```

- [ ] Fixtures (Pneuma active, as in the world today):

```js
const ActorClass = CONFIG.Actor.documentClass;
const attacker = await ActorClass.create({
  name: "Piston Attacker (temp)",
  type: "character",
  items: [],
});
const defender = await ActorClass.create({
  name: "Piston Defender (temp)",
  type: "character",
  items: [],
});
await attacker.update({ "system.stats.ref.value": 8 });
await attacker.items
  .find((i) => i.type === "skill" && i.name === "Autofire")
  .update({ "system.level": 10 });
const core = game.packs.get("cyberpunk-red-core.core_weapons");
const rifleSrc = await core.getDocument(
  (await core.getIndex()).find((e) => e.name === "Assault Rifle")._id,
);
const ours = game.packs.get("cpr-autofire-homebrew.autofire-homebrew-items");
const pistonSrc = (await ours.getDocuments()).find(
  (d) => d.flags["cpr-autofire-homebrew"]?.gasPiston === true,
);
const [rifle, piston] = await attacker.createEmbeddedDocuments("Item", [
  rifleSrc.toObject(),
  pistonSrc.toObject(),
]);
await rifle.update({
  "system.magazine.value": 25,
  "system.equipped": "equipped",
});
await attacker.setFlag(
  "cyberpunk-red-core",
  `firetype-${rifle.id}`,
  "autofire",
);
const scene = await Scene.create({
  name: "Piston test (temp)",
  width: 3000,
  height: 2000,
  padding: 0,
  tokenVision: false,
});
await scene.view();
const [attackerToken, defenderToken] = await scene.createEmbeddedDocuments(
  "Token",
  [
    (await attacker.getTokenDocument({ x: 500, y: 1000 })).toObject(),
    (await defender.getTokenDocument({ x: 1500, y: 1000 })).toObject(),
  ],
);
globalThis.__t = {
  attacker,
  defender,
  rifle,
  piston,
  scene,
  attackerToken,
  defenderToken,
};
```

Helpers (re-define after any reload). Pin the attack die with `CONFIG.Dice.randomUniform = () => 0.3` around attacks so they hit, and restore it after:

```js
const T = globalThis.__t;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rounds = () => T.attacker.items.get(T.rifle.id).system.magazine.value;
const promptShown = () =>
  !!document.querySelector(".cpr-autofire-homebrew-prompt");
const cprDialog = () =>
  Object.values(ui.windows).find((w) => w.constructor.name === "CPRRollDialog");
async function confirmDialog() {
  for (let i = 0; i < 20 && !cprDialog(); i++) await wait(250);
  const app = cprDialog();
  if (!app) return null;
  const box = app.element[0].querySelector('input[name="isFullBlast"]');
  const info = { title: app.title, checkbox: box ? box.checked : "absent" };
  [...app.element[0].querySelectorAll("button")]
    .find((b) => b.innerText.trim() === "Confirm")
    .click();
  await wait(2000);
  return info;
}
async function sheetAttack(choice) {
  await T.rifle.update({ "system.magazine.value": 25 });
  const [a, d] = [
    canvas.tokens.get(T.attackerToken.id),
    canvas.tokens.get(T.defenderToken.id),
  ];
  a.control({ releaseOthers: true });
  d.setTarget(true, { releaseOthers: true });
  await T.attacker.sheet.render(true);
  await wait(1000);
  const rng = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => 0.3;
  T.attacker.sheet.element[0]
    .querySelector(
      `a.rollable[data-roll-type="attack"][data-item-id="${T.rifle.id}"]`,
    )
    .click();
  await wait(1200);
  const prompt = promptShown();
  if (prompt) {
    document
      .querySelector(
        `.cpr-autofire-homebrew-prompt button[data-action="${choice}"]`,
      )
      .click();
    await wait(1200);
  }
  const dialog = await confirmDialog();
  CONFIG.Dice.randomUniform = rng;
  const card = game.messages.contents.at(-1);
  return {
    prompt,
    dialog,
    spent: 25 - rounds(),
    cardId: card.id,
    marker: !!document.querySelector(
      `[data-message-id="${card.id}"] .cpr-autofire-homebrew-full-blast`,
    ),
  };
}
async function hudAttack(choice) {
  await T.rifle.update({ "system.magazine.value": 25 });
  const defenderObject = canvas.tokens.get(T.defenderToken.id);
  canvas.tokens.get(T.attackerToken.id).control({ releaseOthers: true });
  defenderObject.setTarget(true, { releaseOthers: true });
  canvas.hud.token.bind(defenderObject);
  await wait(700);
  const rng = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => 0.3;
  document
    .querySelector(
      `#token-hud [data-attack-mode="autofire"][data-item-id="${T.rifle.id}"]`,
    )
    .click();
  await wait(1000);
  const prompt = promptShown();
  if (prompt) {
    document
      .querySelector(
        `.cpr-autofire-homebrew-prompt button[data-action="${choice}"]`,
      )
      .click();
    await wait(1200);
  }
  await confirmDialog();
  CONFIG.Dice.randomUniform = rng;
  const msg = game.messages.contents.findLast(
    (m) => m.flags?.["pneuma-combattools"]?.exchange,
  );
  const el = document.querySelector(`[data-message-id="${msg.id}"]`);
  return {
    prompt,
    spent: 25 - rounds(),
    msgId: msg.id,
    name: el?.querySelector(".pneuma-attack-name")?.innerText ?? null,
    damageTitle:
      el?.querySelector('[data-action="pneumaRollDamage"]')?.title ?? null,
  };
}
async function pneumaDamage(msgId) {
  document
    .querySelector(
      `[data-message-id="${msgId}"] [data-action="pneumaRollDamage"]`,
    )
    .click();
  await wait(2500);
  const html =
    game.messages.get(msgId).flags["pneuma-combattools"].exchange.damage?.result
      ?.html ?? "";
  return { line: html.includes("cpr-autofire-homebrew-full-blast-line") };
}
async function cardDamage(cardId) {
  document
    .querySelector(`[data-message-id="${cardId}"] [data-action="rollDamage"]`)
    .click();
  await wait(1500);
  const dialog = await confirmDialog();
  const dm = game.messages.contents.at(-1);
  return {
    dialog,
    line:
      document.querySelector(
        `[data-message-id="${dm.id}"] .cpr-autofire-homebrew-full-blast-line`,
      )?.textContent ?? null,
  };
}
```

**Checks** (spec section 8; record each result)

- [ ] **M8** Pack and item: `ours` exists; `T.piston.flags["cpr-autofire-homebrew"].gasPiston === true`; `T.piston.system.size === 0`; `T.piston.system.price.market === 1000`; `(await fetch(T.piston.img)).ok === true`; the description shows in the item sheet (`T.piston.sheet.render(true)`). No validation error in the console (`browser_console_messages`, level error).
- [ ] **M1** Gating off (`await game.settings.set("cpr-autofire-homebrew", "requireGasPiston", false)`), no piston installed: `await sheetAttack("standard")`. Expected: `prompt: true`, `spent: 10`.
- [ ] **M10, part 1** Still gating off, no piston: `const old = await sheetAttack("fullBlast")`. Expected: `prompt: true`, `spent: 20`, `marker: true`. Keep `old.cardId`.
- [ ] **M2** Gating on (`await game.settings.set("cpr-autofire-homebrew", "requireGasPiston", true)`), no piston: `const gated = await sheetAttack("fullBlast")`. Expected: `prompt: false`, `dialog.title` is "Assault Rifle" (no "(Full Blast)"), `spent: 10`, `marker: false`.
- [ ] **M4** `await cardDamage(gated.cardId)`. Expected: `dialog.checkbox === "absent"`, `line: null`.
- [ ] **M10, part 2** `await cardDamage(old.cardId)`. Expected: `dialog.checkbox === true`, a "Full Blast! +1 per die (...)" line.
- [ ] **M3** Install: `await T.attacker.items.get(T.rifle.id).installItems([T.attacker.items.get(T.piston.id)])`; then `T.attacker.items.get(T.rifle.id).getInstalledItems("itemUpgrade").map((i) => i.name)` includes "Adjustable Gas Piston", and the rifle's `system.installedItems.usedSlots` did not change. `const fb = await sheetAttack("fullBlast")`. Expected: `prompt: true`, `spent: 20`, `marker: true`; `await cardDamage(fb.cardId)` shows `checkbox: true` and the line.
- [ ] **M6** Piston installed, Pneuma HUD: `const hud = await hudAttack("fullBlast")`. Expected: `prompt: true`, `spent: 20`, `name` "Assault Rifle (Full Blast)", `damageTitle` starting "Roll Full Blast damage". Then `await pneumaDamage(hud.msgId)`. Expected: `line: true`.
- [ ] **M7** Uninstall: `await T.attacker.items.get(T.rifle.id).uninstallItems([T.attacker.items.get(T.piston.id)])`. `await sheetAttack("fullBlast")`. Expected: `prompt: false`, `spent: 10`.
- [ ] **M5** Still no piston, gating on: `await hudAttack("fullBlast")`. Expected: `prompt: false`, `spent: 10`, `name` "Assault Rifle" with no "(Full Blast)". Then Pneuma's sheet routing: `await game.settings.set("pneuma-combattools", "routeSheetAttacks", true)`, `await sheetAttack("fullBlast")`. Expected: `prompt: false`, `spent: 10`. Set `routeSheetAttacks` back to false.
- [ ] Console: `browser_console_messages` at level error shows nothing from `cpr-autofire-homebrew`.

M9 (install from the release zip on a clean world) runs after the 0.4.0 release, with the go-public spec's section 9.3 checks.

**Restore**

- [ ] Close windows; delete every chat message, actor, scene, and combat whose id is not in `before`; `scene.view()` the `before.viewed` scene first. Set `requireGasPiston` back to `before.gating` and `routeSheetAttacks` to `before.route`. Leave `moduleConfiguration` as in `before.modules`. Restore `CONFIG.Dice.randomUniform` if changed.
- [ ] `game.shutDown()`, close the Playwright page, and stop the Foundry background task.
- [ ] In the live clone: `git -C D:/Antigravity/foundry-cpr/modules/cpr-autofire-homebrew switch main`. The compiled `packs/` folder stays; it is ignored.
- [ ] Delete the `.playwright-mcp/` folder Playwright wrote into the session's working directory.

If any check fails, stop, use `superpowers:systematic-debugging`, fix in the worktree (with a unit test where the logic is pure), push, and rerun the affected checks.

---

### Task 8: Pull request

- [ ] Return to the worktree: `EnterWorktree` with `path` `D:\Antigravity\foundry-cpr\modules\cpr-autofire-homebrew\.claude\worktrees\gas-piston-gating`.
- [ ] Push any fixes: `git push`.
- [ ] Open a draft PR. Write the body to `$CLAUDE_JOB_DIR/tmp/gas-piston-pr.md` (the session's scratch directory) with the Write tool, then:

```bash
gh pr create --draft --base main --head feat/gas-piston-gating --title "feat: optionally require the Adjustable Gas Piston for Full Blast" --body-file "$CLAUDE_JOB_DIR/tmp/gas-piston-pr.md"
```

The body covers: closes #10; the setting and its default; the compendium and the build step (compiled packs ignored, built in CI and release); the live results M1 to M8 and M10; M9 deferred to the release; and the open merge gate (spec question 6, the author's permission or Lukasz's call to ship with credit).

- [ ] Wait for CI: `gh pr checks feat/gas-piston-gating --watch`. Expected: `check` passes, including the new `npm run packs` step.
- [ ] After merge (Lukasz merges): pull `main` in the live clone, run `npm ci` and `npm run packs` there with the world closed, and publish `gh release create v0.4.0 --generate-notes`. Then run the go-public spec's 9.3 checks, and M9: install from the manifest on a clean world and open the compendium.
