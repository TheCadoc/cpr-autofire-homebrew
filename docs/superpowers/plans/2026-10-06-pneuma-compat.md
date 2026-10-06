# Pneuma's Combat Tools Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full Blast damage rolls automatically from Pneuma's Combat Tools 0.9.10 damage button on a Full Blast exchange, and Pneuma's cards show "(Full Blast)", with no change to Pneuma.

**Architecture:** A render hook on Pneuma exchange messages whose stored attack HTML carries the Full Blast marker class restores the title, retitles the damage button, and captures clicks on that button as a short-lived pending note. The existing `createRoll` wrapper takes the note on every damage roll and flags the roll as Full Blast when the note matches the weapon and attacker. Pure matching rules live in a Node-tested module. Spec: `docs/superpowers/specs/2026-10-06-pneuma-compat-design.md` (PR #4; "spec §n").

**Tech Stack:** Foundry VTT 12.343, Cyberpunk RED Core 0.92.4, libWrapper, Pneuma's Combat Tools 0.9.10, Node 22 `node:test`, workspace ESLint and Prettier.

---

## File map

| File                        | Change | Responsibility                                                                                      |
| --------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `scripts/constants.js`      | new    | `MODULE_ID`, `MARKER_CLASS`, `t()`.                                                                 |
| `scripts/full-blast.js`     | edit   | Import the constants; take the Pneuma note in the damage branch of `wrapCreateRoll`.                |
| `scripts/pneuma-match.js`   | new    | Pure rules: `hasClassToken`, `isPneumaFullBlast`, `shouldWarnPneuma`.                               |
| `test/pneuma-match.test.js` | new    | Unit tests for `pneuma-match.js`.                                                                   |
| `scripts/pneuma.js`         | new    | Foundry glue: `registerPneuma`, render hook, click capture, `takePneumaFullBlast`, version warning. |
| `scripts/main.js`           | edit   | Call `registerPneuma()` after `register()`.                                                         |
| `lang/en.json`              | edit   | `FullBlast.PneumaDamageTooltip`, `Errors.PneumaUnverified`.                                         |
| `README.md`                 | edit   | Pneuma section.                                                                                     |
| `module.json`               | edit   | `version` 0.2.0.                                                                                    |

Paths are relative to the module repo root. The worktree is `D:\Antigravity\foundry-cpr\modules\cpr-autofire-homebrew\.claude\worktrees\pneuma-compat` on `feat/pneuma-compat` (based on `origin/main` de5ff4e). The workspace lint and format configs ignore `**/.claude/**`, so Task 6 checks the worktree explicitly and Task 7 reruns the workspace commands in the live clone.

---

### Task 1: Shared constants

No behavior change. `full-blast.js` and the new `pneuma.js` both need the module id, the marker class, and `t()`; a shared module keeps them from importing each other's internals.

**Files:** Create `scripts/constants.js`; modify `scripts/full-blast.js:1-24`

- [ ] **Step 1: Create `scripts/constants.js`**

```js
// Identifiers and strings shared by the Full Blast and Pneuma integration scripts.

export const MODULE_ID = "cpr-autofire-homebrew";

/** Class on the wrapper of every Full Blast chat card this module renders. */
export const MARKER_CLASS = `${MODULE_ID}-full-blast`;

/** Localizes `CPR_AUTOFIRE_HOMEBREW.<key>` with `data` formatted in. */
export const t = (key, data) =>
  game.i18n.format(`CPR_AUTOFIRE_HOMEBREW.${key}`, data);
```

- [ ] **Step 2: Use it in `scripts/full-blast.js`**

Add the import after the `./rules.js` import:

```js
import { MARKER_CLASS, MODULE_ID, t } from "./constants.js";
```

Delete these three lines (the other constants stay, they derive from the imported ones):

```js
const MODULE_ID = "cpr-autofire-homebrew";
```

```js
const MARKER_CLASS = `${MODULE_ID}-full-blast`;
```

```js
const t = (key, data) => game.i18n.format(`CPR_AUTOFIRE_HOMEBREW.${key}`, data);
```

- [ ] **Step 3: Check nothing else broke**

Run: `npm test`
Expected: all existing `rules.test.js` tests pass.
Run: `grep -n "MODULE_ID\|MARKER_CLASS\|const t" scripts/full-blast.js`
Expected: no `const MODULE_ID`, `const MARKER_CLASS`, or `const t` definitions remain; uses remain.

- [ ] **Step 4: Commit**

```bash
git add scripts/constants.js scripts/full-blast.js
git commit -m "refactor: share the module id, marker class, and t() via constants.js"
```

---

### Task 2: Pure matching rules (TDD)

**Files:** Create `test/pneuma-match.test.js`, `scripts/pneuma-match.js`

- [ ] **Step 1: Write the failing tests** in `test/pneuma-match.test.js`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasClassToken,
  isPneumaFullBlast,
  shouldWarnPneuma,
} from "../scripts/pneuma-match.js";

const MARKER = "cpr-autofire-homebrew-full-blast";

test("hasClassToken matches an exact class token", () => {
  assert.equal(
    hasClassToken(`<div class="a ${MARKER} b"><p>x</p></div>`, MARKER),
    true,
  );
  assert.equal(hasClassToken(`<div class='${MARKER}'></div>`, MARKER), true);
});

test("hasClassToken ignores longer classes and other attributes", () => {
  assert.equal(
    hasClassToken(`<div class="${MARKER}-line"></div>`, MARKER),
    false,
  );
  assert.equal(hasClassToken(`<div data-x="${MARKER}"></div>`, MARKER), false);
  assert.equal(
    hasClassToken(`<div data-class="${MARKER}"></div>`, MARKER),
    false,
  );
  assert.equal(hasClassToken(`<p>${MARKER}</p>`, MARKER), false);
});

test("hasClassToken is false for empty or missing html", () => {
  assert.equal(hasClassToken("", MARKER), false);
  assert.equal(hasClassToken(undefined, MARKER), false);
});

/** A matching case; each test overrides one field. */
const match = (overrides = {}) => ({
  pending: { messageId: "m1", expiresAt: 1000 },
  now: 500,
  exchange: { weaponId: "w1", html: `<div class="${MARKER}"></div>` },
  itemId: "w1",
  actorUuid: "Actor.a1",
  attackerActorUuid: "Actor.a1",
  markerClass: MARKER,
  ...overrides,
});

test("isPneumaFullBlast is true when every condition holds", () => {
  assert.equal(isPneumaFullBlast(match()), true);
});

test("isPneumaFullBlast needs a pending click that has not expired", () => {
  assert.equal(isPneumaFullBlast(match({ pending: null })), false);
  assert.equal(isPneumaFullBlast(match({ now: 1000 })), true);
  assert.equal(isPneumaFullBlast(match({ now: 1001 })), false);
});

test("isPneumaFullBlast needs the marker in the stored attack html", () => {
  assert.equal(isPneumaFullBlast(match({ exchange: undefined })), false);
  assert.equal(
    isPneumaFullBlast(match({ exchange: { weaponId: "w1", html: 42 } })),
    false,
  );
  assert.equal(
    isPneumaFullBlast(
      match({
        exchange: {
          weaponId: "w1",
          html: '<div class="rollcard"></div>',
          damage: { result: { html: `<div class="${MARKER}"></div>` } },
        },
      }),
    ),
    false,
  );
});

test("isPneumaFullBlast needs the same weapon and attacker", () => {
  assert.equal(isPneumaFullBlast(match({ itemId: "w2" })), false);
  assert.equal(
    isPneumaFullBlast(match({ attackerActorUuid: "Actor.a2" })),
    false,
  );
  assert.equal(
    isPneumaFullBlast(
      match({ actorUuid: undefined, attackerActorUuid: undefined }),
    ),
    false,
  );
  assert.equal(
    isPneumaFullBlast(match({ actorUuid: "", attackerActorUuid: "" })),
    false,
  );
});

test("shouldWarnPneuma warns once per unverified version", () => {
  assert.equal(shouldWarnPneuma("0.9.10", "0.9.10", ""), false);
  assert.equal(shouldWarnPneuma("0.9.11", "0.9.10", ""), true);
  assert.equal(shouldWarnPneuma("0.9.11", "0.9.10", "0.9.11"), false);
  assert.equal(shouldWarnPneuma("0.9.12", "0.9.10", "0.9.11"), true);
  assert.equal(shouldWarnPneuma(undefined, "0.9.10", ""), false);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test`
Expected: FAIL, `Cannot find module` for `../scripts/pneuma-match.js`.

- [ ] **Step 3: Write `scripts/pneuma-match.js`**

```js
// Rules for matching Pneuma's Combat Tools exchanges. No Foundry globals, so Node can unit-test them.

/** A class attribute value, double- or single-quoted. The leading space excludes `data-class`. */
const CLASS_ATTRIBUTE = /\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

/**
 * Whether an HTML string has an element whose class list contains `token` exactly.
 *
 * @param {string|undefined} html
 * @param {string} token
 * @returns {boolean}
 */
export function hasClassToken(html, token) {
  if (typeof html !== "string") return false;
  for (const match of html.matchAll(CLASS_ATTRIBUTE)) {
    if ((match[1] ?? match[2]).split(/\s+/).includes(token)) return true;
  }
  return false;
}

/**
 * Whether a pending click on Pneuma's damage button flags this damage roll as Full Blast.
 *
 * @param {object} args
 * @param {{messageId: string, expiresAt: number}|null} args.pending
 * @param {number} args.now - milliseconds since the epoch
 * @param {object|undefined} args.exchange - Pneuma's stored exchange for `pending.messageId`
 * @param {string} args.itemId - the item creating the damage roll
 * @param {string|undefined} args.actorUuid - the actor passed to `createRoll`
 * @param {string|undefined} args.attackerActorUuid - the actor of the token at `exchange.attacker`
 * @param {string} args.markerClass
 * @returns {boolean}
 */
export function isPneumaFullBlast({
  pending,
  now,
  exchange,
  itemId,
  actorUuid,
  attackerActorUuid,
  markerClass,
}) {
  return (
    !!pending &&
    now <= pending.expiresAt &&
    hasClassToken(exchange?.html, markerClass) &&
    exchange.weaponId === itemId &&
    typeof actorUuid === "string" &&
    actorUuid !== "" &&
    attackerActorUuid === actorUuid
  );
}

/**
 * Whether to warn the GM that the installed Pneuma version was not verified.
 *
 * @param {string|undefined} version - the installed Pneuma version
 * @param {string} verified - the version this module was verified with
 * @param {string} lastWarned - the version the GM was last warned about
 * @returns {boolean}
 */
export function shouldWarnPneuma(version, verified, lastWarned) {
  return (
    typeof version === "string" &&
    version !== verified &&
    version !== lastWarned
  );
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test`
Expected: PASS, including every `rules.test.js` test.

- [ ] **Step 5: Commit**

```bash
git add scripts/pneuma-match.js test/pneuma-match.test.js
git commit -m "feat: add Pneuma exchange matching rules with unit tests"
```

---

### Task 3: Pneuma glue and strings

**Files:** Create `scripts/pneuma.js`; modify `lang/en.json`

- [ ] **Step 1: Add the strings to `lang/en.json`**

In `CPR_AUTOFIRE_HOMEBREW.FullBlast`, after `"DamageTooltip"`:

```json
"PneumaDamageTooltip": "Roll Full Blast damage (Shift-click to roll immediately)"
```

In `CPR_AUTOFIRE_HOMEBREW.Errors`, after `"Unavailable"`:

```json
"PneumaUnverified": "CPR Autofire Homebrew was verified with Pneuma's Combat Tools {verified}; {version} is installed. If Pneuma's damage button stops rolling Full Blast damage, tick \"Full Blast?\" in the damage dialog."
```

Run: `node -e "JSON.parse(require('fs').readFileSync('lang/en.json','utf8'))"`
Expected: no output (valid JSON).

- [ ] **Step 2: Create `scripts/pneuma.js`**

```js
import { MARKER_CLASS, MODULE_ID, t } from "./constants.js";
import {
  hasClassToken,
  isPneumaFullBlast,
  shouldWarnPneuma,
} from "./pneuma-match.js";

const PNEUMA_ID = "pneuma-combattools";
const PNEUMA_VERIFIED = "0.9.10";
/** Pneuma's own GM reply timeout, so its damage claim has finished or failed by then. */
const PENDING_MS = 15000;
const WARNED_SETTING = "pneumaWarnedVersion";
const DAMAGE_BUTTON = '[data-action="pneumaRollDamage"]';
const TITLED = `data-${MODULE_ID}-titled`;

/** The last click on a Full Blast exchange's damage button, until a damage roll takes it. */
let pending = null;

/** Wires the Pneuma's Combat Tools integration when Pneuma is active. Must run in the init hook. */
export function registerPneuma() {
  if (!game.modules.get(PNEUMA_ID)?.active) return;
  game.settings.register(MODULE_ID, WARNED_SETTING, {
    scope: "world",
    config: false,
    type: String,
    default: "",
  });
  Hooks.on("renderChatMessage", decorateExchange);
  Hooks.once("ready", warnUnverifiedPneuma);
}

/** Pneuma's stored exchange. getProperty, because getFlag throws for an inactive scope. */
function exchangeOf(message) {
  return foundry.utils.getProperty(
    message ?? {},
    `flags.${PNEUMA_ID}.exchange`,
  );
}

/** Render-time only: the title, the damage tooltip, and the click capture on Full Blast exchanges. */
function decorateExchange(message, html) {
  const root = html[0];
  if (!root || !hasClassToken(exchangeOf(message)?.html, MARKER_CLASS)) return;
  for (const name of root.querySelectorAll(
    `.pneuma-attack-name:not([${TITLED}])`,
  )) {
    const title = t("FullBlast.Title", { name: name.textContent.trim() });
    name.textContent = title;
    name.title = title;
    name.setAttribute(TITLED, "");
  }
  const button = root.querySelector(DAMAGE_BUTTON);
  if (button) button.title = t("FullBlast.PneumaDamageTooltip");
  // Capture runs before Pneuma's own click handler on the button.
  root.addEventListener(
    "click",
    (event) => {
      const target = event.target.closest?.(DAMAGE_BUTTON);
      if (target && !target.disabled) {
        pending = { messageId: message.id, expiresAt: Date.now() + PENDING_MS };
      }
    },
    { capture: true },
  );
}

/**
 * Takes the pending click and reports whether it makes this damage roll Full Blast.
 * Every damage roll calls this, so a stale click never carries over.
 *
 * @param {Item} item - the item creating the damage roll
 * @param {Actor} actor - the actor passed to createRoll
 * @returns {boolean}
 */
export function takePneumaFullBlast(item, actor) {
  const current = pending;
  pending = null;
  if (!current) return false;
  const exchange = exchangeOf(game.messages.get(current.messageId));
  return isPneumaFullBlast({
    pending: current,
    now: Date.now(),
    exchange,
    itemId: item.id,
    actorUuid: actor?.uuid,
    attackerActorUuid: attackerActorUuid(exchange),
    markerClass: MARKER_CLASS,
  });
}

/** The actor of the exchange's attacker token, or undefined when it cannot be resolved. */
function attackerActorUuid(exchange) {
  try {
    return fromUuidSync(exchange?.attacker)?.actor?.uuid;
  } catch {
    return undefined;
  }
}

/** One permanent warning per Pneuma version this module was not verified with. */
async function warnUnverifiedPneuma() {
  if (!game.user.isGM) return;
  const version = game.modules.get(PNEUMA_ID)?.version;
  const lastWarned = game.settings.get(MODULE_ID, WARNED_SETTING);
  if (!shouldWarnPneuma(version, PNEUMA_VERIFIED, lastWarned)) return;
  ui.notifications.warn(
    t("Errors.PneumaUnverified", { version, verified: PNEUMA_VERIFIED }),
    { permanent: true },
  );
  await game.settings.set(MODULE_ID, WARNED_SETTING, version);
}
```

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: PASS (nothing imports `pneuma.js` yet; this checks nothing regressed).

- [ ] **Step 4: Commit**

```bash
git add scripts/pneuma.js lang/en.json
git commit -m "feat: decorate Pneuma exchanges and capture Full Blast damage clicks"
```

---

### Task 4: Wire it in

**Files:** Modify `scripts/full-blast.js` (`wrapCreateRoll`), `scripts/main.js`

- [ ] **Step 1: Take the note in `wrapCreateRoll`**

Add the import next to the other imports in `scripts/full-blast.js`:

```js
import { takePneumaFullBlast } from "./pneuma.js";
```

Replace the first line of `wrapCreateRoll`:

```js
const fullBlast = type === "damage" && extraData?.damageType === DAMAGE_TYPE;
```

with:

```js
// Every damage roll takes any pending Pneuma click, so a stale one never carries over.
const pneuma = type === "damage" && takePneumaFullBlast(this, actor);
const fullBlast =
  type === "damage" &&
  (extraData?.damageType === DAMAGE_TYPE ||
    (pneuma && extraData?.damageType === "autofire"));
```

The next line (`if (fullBlast) extraData = { ...extraData, damageType: "autofire" };`) and the rest of the function stay as they are.

- [ ] **Step 2: Register the integration in `scripts/main.js`**

Replace the file with:

```js
import { register } from "./full-blast.js";
import { registerPneuma } from "./pneuma.js";

Hooks.once("init", () => {
  register();
  registerPneuma(); // no-op unless Pneuma's Combat Tools is active
});
```

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add scripts/full-blast.js scripts/main.js
git commit -m "feat: roll Full Blast damage from Pneuma's damage button"
```

---

### Task 5: README and version

**Files:** Modify `README.md`, `module.json`

- [ ] **Step 1: Add a README section** after the Full Blast section and before `## Requirements`:

```markdown
## Pneuma's Combat Tools

Verified with Pneuma's Combat Tools 0.9.10. It is optional; nothing changes when it is not active.

- Autofire attacks from Pneuma's token HUD, and sheet attacks Pneuma routes through its exchange, show the Full Blast prompt and spend the Full Blast cost.
- Pneuma's damage button on a Full Blast attack rolls Full Blast damage, including Shift-click. The damage dialog shows "Full Blast?" checked.
- Pneuma's attack cards show "(Full Blast)".
- Pneuma's HUD still disables Autofire below 10 rounds. The prompt disables Full Blast below 20.
- With another Pneuma version, the GM sees one warning. If its damage button stops rolling Full Blast damage, tick "Full Blast?" in the damage dialog.
```

In `## Development`, after the design line, add:

```markdown
- Pneuma integration design: `docs/superpowers/specs/2026-10-06-pneuma-compat-design.md`.
```

- [ ] **Step 2: Bump the version** in `module.json`: `"version": "0.1.0"` becomes `"version": "0.2.0"`.

- [ ] **Step 3: Commit**

```bash
git add README.md module.json
git commit -m "docs: describe Pneuma's Combat Tools support and bump to 0.2.0"
```

---

### Task 6: Lint and format the worktree

The workspace configs ignore `**/.claude/**`, so point the tools at the worktree explicitly. Run from `D:\Antigravity\foundry-cpr`.

- [ ] **Step 1: ESLint**

Run: `npx eslint --no-ignore modules/cpr-autofire-homebrew/.claude/worktrees/pneuma-compat/scripts modules/cpr-autofire-homebrew/.claude/worktrees/pneuma-compat/test`
Expected: no output.

- [ ] **Step 2: Prettier**

Create an empty file outside the repo (for example `$CLAUDE_JOB_DIR/tmp/empty-ignore`) and run:
`npx prettier --ignore-path <that empty file> --check "modules/cpr-autofire-homebrew/.claude/worktrees/pneuma-compat/{scripts,test,lang,docs}/**/*.{js,json,md}" modules/cpr-autofire-homebrew/.claude/worktrees/pneuma-compat/README.md modules/cpr-autofire-homebrew/.claude/worktrees/pneuma-compat/module.json`
Expected: `All matched files use Prettier code style!` If not, rerun with `--write`, review the diff, and commit it as `style: format with Prettier`.

- [ ] **Step 3: Push**

```bash
git push -u origin feat/pneuma-compat
```

---

### Task 7: Live test with Pneuma enabled

Live resources were released to this session by `foundry full-blast-damage` on 2026-10-06. A session inside the worktree cannot run git in the live clone: `ExitWorktree` with `keep` first.

Notes from the first attempt (2026-10-06, paused before L1 on Lukasz's request):

- If `browser_navigate` fails with "Browser is already in use", another session's Playwright MCP holds the shared profile. Ask that session to run `browser_close`.
- The assault rifle's magazine holds 25 rounds, so refill it after each Full Blast.
- A new scene needs `tokenVision: false` (in the fixture below). Otherwise Pneuma's HUD attack does nothing.

**Setup**

- [ ] In the live clone `D:\Antigravity\foundry-cpr\modules\cpr-autofire-homebrew`: `git fetch origin`, `git checkout --detach origin/feat/pneuma-compat`. From `D:\Antigravity\foundry-cpr`: `npm run lint` and `npm run format:check`. Expected: clean (Playwright snapshot files in `foundry-cpr/.playwright-mcp/` fail `format:check`; delete them after testing, never commit them).
- [ ] Launch world `cyberpunk` from `/setup` (the world-launch control click in the task brief), join as Gamemaster (`GL8aKrML8b7z0Bsm`, empty password), open `/game`. The `module.json` version change and PR #3's `styles` need this fresh launch.
- [ ] Record the starting state, then make sure Pneuma is on:

```js
const before = {
  modules: foundry.utils.deepClone(
    game.settings.get("core", "moduleConfiguration"),
  ),
  route: game.settings.get("pneuma-combattools", "routeSheetAttacks"),
  messages: game.messages.map((m) => m.id),
};
console.log(JSON.stringify(before));
```

If `pneuma-combattools` is false, set it true with `game.settings.set("core", "moduleConfiguration", { ...before.modules, "pneuma-combattools": true })` and reload `/game`.

- [ ] Create the test fixtures:

```js
const ActorClass = CONFIG.Actor.documentClass;
const attacker = await ActorClass.create({
  name: "Pneuma Attacker (temp)",
  type: "character",
  items: [],
});
const defender = await ActorClass.create({
  name: "Pneuma Defender (temp)",
  type: "character",
  items: [],
});
const pack = game.packs.get("cyberpunk-red-core.core_weapons");
const index = await pack.getIndex();
const sources = await Promise.all(
  ["Assault Rifle", "SMG"].map((name) =>
    pack.getDocument(index.find((e) => e.name === name)._id),
  ),
);
const [rifle, smg] = await attacker.createEmbeddedDocuments(
  "Item",
  sources.map((d) => d.toObject()),
);
for (const weapon of [rifle, smg]) {
  await weapon.update({
    "system.magazine.value": weapon.system.magazine.max,
    "system.equipped": "equipped",
  });
  await attacker.setFlag(
    "cyberpunk-red-core",
    `firetype-${weapon.id}`,
    "autofire",
  );
}
const scene = await Scene.create({
  name: "Pneuma test (temp)",
  width: 3000,
  height: 2000,
  padding: 0,
  // Without this the defender is not visible to the controlled attacker, and
  // Pneuma's attackFromHUD returns silently (target.isVisible is false).
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
```

- [ ] Helpers for each case (re-define after any reload):

```js
const tokens = () => [
  canvas.tokens.get(attackerToken.id),
  canvas.tokens.get(defenderToken.id),
];
async function openHUD() {
  const [a, d] = tokens();
  a.control({ releaseOthers: true });
  d.setTarget(true, { releaseOthers: true });
  canvas.hud.token.bind(d);
  await new Promise((r) => setTimeout(r, 500));
}
const hudButton = (itemId, mode = "autofire") =>
  document.querySelector(
    `#token-hud [data-attack-mode="${mode}"][data-item-id="${itemId}"]`,
  );
const lastExchange = () =>
  game.messages.contents.findLast(
    (m) => m.flags?.["pneuma-combattools"]?.exchange,
  );
const exchange = (m) => m.flags["pneuma-combattools"].exchange;
const rounds = (id) => attacker.items.get(id).system.magazine.value;
```

Drive dialogs with DOM clicks: the prompt's `[data-action="fullBlast"]` / `[data-action="standard"]`, CPR's dialog confirm button, and, as GM, Pneuma's "Defender is unaware" checkbox (`.pneuma-unaware-choice input`) to resolve without evasion. To raise the attack total so the margin multiplier exceeds 1, set `CONFIG.Dice.randomUniform = () => 0.01` before confirming (Foundry maps `u` to `Math.ceil((1 - u) * faces)`, so this rolls maximum faces), and restore the original afterwards (`const rng = CONFIG.Dice.randomUniform;` first).

**Checks** (spec §9; record each result)

- [ ] **L1** `await openHUD(); hudButton(rifle.id).click();` The Full Blast prompt shows. Choose Full Blast, tick unaware, confirm. Expected: `rounds(rifle.id)` dropped by 20; the message's `.pneuma-attack-name` reads "Assault Rifle (Full Blast)"; `[data-action="pneumaRollDamage"]` title is "Roll Full Blast damage (Shift-click to roll immediately)"; `exchange(lastExchange()).html` contains `cpr-autofire-homebrew-full-blast`. Before ticking unaware on a second attack, also check the pending card heading shows the suffix.
- [ ] **L2** Same with Standard. Expected: 10 rounds; no suffix; Pneuma's own tooltip.
- [ ] **L3** `hudButton(rifle.id).dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }))`. Expected: the prompt shows; CPR's dialog does not.
- [ ] **L4** Set the rifle magazine to 19, attack from the HUD. Expected: Full Blast button disabled with "Full Blast needs 20 rounds."; Standard works. Set it to 9 and re-open the HUD. Expected: `hudButton(rifle.id)` is disabled with title "Requires 10 rounds". Refill afterwards.
- [ ] **L5** On L1's message, click `[data-action="pneumaRollDamage"]`. Expected: CPR's damage dialog has "Full Blast?" checked and Pneuma's multiplier `m`; after confirming, `exchange(msg).damage.result.html` contains `cpr-autofire-homebrew-full-blast-line`, and `damage.result.values.total` equals (sum of the natural faces + 2) x m plus other modifiers (read the faces from the stored dice images or the line text).
- [ ] **L6** New Full Blast attack, then Shift-click its damage button (`dispatchEvent` with `shiftKey: true`). Expected: no dialog; the line and the bonus are present.
- [ ] **L7** On L2's message, click damage. Expected: "Full Blast?" unchecked; no line; no bonus.
- [ ] **L8** `await game.settings.set("pneuma-combattools", "routeSheetAttacks", true)`; open the attacker sheet with the defender targeted and the attacker token controlled; click `a.rollable[data-roll-type="attack"][data-item-id="${rifle.id}"]`. Expected: L1 and L5 results through a Pneuma exchange card.
- [ ] **L9** Set `routeSheetAttacks` false and repeat the sheet attack. Expected: the v1 prompt and native CPR card; its damage button rolls Full Blast damage with the line.
- [ ] **L10** Full Blast attack, then set `CONFIG.Dice.randomUniform = () => 0.01` and roll its damage (6 + 6). Expected: `exchange(msg).damage.result.sixes === 2`, `values.bonus === 5`, and `.pneuma-apply-critical` present. Repeat with `() => 0.2` (5 + 5). Expected: `sixes === 0`, `values.bonus === 0`, no `.pneuma-apply-critical`. Restore `CONFIG.Dice.randomUniform = rng`.
- [ ] **L11** After the launch, no warning with "Pneuma's Combat Tools 0.9.10" text appeared, and `game.settings.get("cpr-autofire-homebrew", "pneumaWarnedVersion") === ""`.
- [ ] **L12** Turn Pneuma off (`moduleConfiguration` with `"pneuma-combattools": false`), reload `/game`, and run Full Blast spec M1, M3, and M6 from the sheet. Expected: v1 behavior with the damage line; no Pneuma listeners (`game.settings.settings.has("cpr-autofire-homebrew.pneumaWarnedVersion") === false`).

**Restore** (Lukasz: Pneuma off after testing)

- [ ] Delete the temp scene, both temp actors, any combat created, and every chat message whose id is not in `before.messages`. Restore `routeSheetAttacks` to `before.route` (needs Pneuma on, so do it before L12's toggle, or re-enable briefly). Leave `"pneuma-combattools": false` in `moduleConfiguration`; every other module as in `before.modules`. Restore `CONFIG.Dice.randomUniform` if changed.
- [ ] `game.shutDown()`; Foundry returns to `/setup`.
- [ ] In the live clone: `git switch main`, `git pull --ff-only`. Delete `foundry-cpr/.playwright-mcp/` snapshot files created during the test.

If any check fails, stop, use `superpowers:systematic-debugging`, fix in the worktree with a test where the logic is pure, push, and rerun the affected checks.

---

### Task 8: Pull request

- [ ] **Step 1: Open the PR**

```bash
gh pr create --repo TheCadoc/cpr-autofire-homebrew --base main --head feat/pneuma-compat \
  --title "feat: Full Blast with Pneuma's Combat Tools" \
  --body "<summary, the L1 to L12 results, and the world state left behind>"
```

The body lists what changed, every live check with its result, that Pneuma was left disabled, and ends with the Claude Code attribution line.

- [ ] **Step 2: Report** to Lukasz: the PR link, the check results, anything that failed or was skipped, and that spec PR #4 is still open if it is.
