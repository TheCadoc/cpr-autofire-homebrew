# Full Blast Prompt Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Full Blast prompt so it uses CPR's fonts, sits in CPR's red chat-card block, fits both labels on one line, and shows a visibly disabled Full Blast button.

**Architecture:** One scoped stylesheet (`styles/full-blast-prompt.css`) plus two small changes to `promptFullBlast`: a DialogV2 `classes` entry and markup that reuses CPR's `.cpr-block` and text utility classes. All values come from CPR's classes or `--cpr-*` variables. Behavior is unchanged.

**Tech Stack:** Foundry VTT 12.343 DialogV2, Cyberpunk RED Core 0.92.4 CSS, plain CSS and ES modules, no build step.

Spec: `docs/superpowers/specs/2026-10-06-full-blast-prompt-style-design.md`.

---

## Files

- Create: `styles/full-blast-prompt.css`. Every rule is scoped under `.cpr-autofire-homebrew-prompt`.
- Modify: `scripts/full-blast.js`. Add the `PROMPT_CLASS` constant and update `promptFullBlast` (content markup and `classes`).
- Modify: `module.json`. Add `"styles"`.
- No unit test: CSS and DialogV2 markup need Foundry. `test/rules.test.js` still covers the rule math. Live DOM checks in Task 3 are the test.

### Task 1: Stylesheet and manifest

**Files:**

- Create: `styles/full-blast-prompt.css`
- Modify: `module.json` (after `"esmodules"`)

- [ ] **Step 1: Write the stylesheet**

```css
/*
 * Full Blast prompt (DialogV2 with class cpr-autofire-homebrew-prompt).
 * Fonts and colors come from Cyberpunk RED's --cpr-* variables. The red
 * frame is CPR's own .cpr-block, set in the dialog content markup.
 */

/* The stacked footer no longer sets the window width, so give it a floor. */
.cpr-autofire-homebrew-prompt {
  min-width: 25rem;
}

/*
 * CPR sets its font on .window-content, which misses the title and buttons.
 * Foundry's title inherits its font, so set it on the header.
 */
.cpr-autofire-homebrew-prompt .window-header,
.cpr-autofire-homebrew-prompt .form-footer button {
  font-family: var(--cpr-font-primary);
}

.cpr-autofire-homebrew-prompt .cpr-block {
  padding: 0.5rem;
}

/* One full-width button per row, so each label fits on one line. */
.cpr-autofire-homebrew-prompt .form-footer {
  flex-direction: column;
  align-items: stretch;
}

.cpr-autofire-homebrew-prompt .form-footer button {
  flex: none;
  white-space: nowrap;
}

/* Foundry hides a disabled button's border and CPR paints every button the window color. */
.cpr-autofire-homebrew-prompt .form-footer button:disabled {
  color: var(--cpr-text-icon-dimmed);
  background: none;
  border: 0.125rem dashed var(--cpr-text-icon-dimmed);
}
```

- [ ] **Step 2: Register it in `module.json`**

Insert after the `"esmodules"` line:

```json
  "styles": ["styles/full-blast-prompt.css"],
```

- [ ] **Step 3: Format check**

Run from `D:\Antigravity\foundry-cpr`: `npm run format:check`
Expected: exit 0 (the worktree is under `.claude/`, which is skipped, so also run `npx prettier --check` on the changed files directly).

### Task 2: Dialog class and block markup

**Files:**

- Modify: `scripts/full-blast.js` (constants block, and `promptFullBlast`)

- [ ] **Step 1: Add the constant** after `MARKER_CLASS`:

```js
const PROMPT_CLASS = `${MODULE_ID}-prompt`;
```

- [ ] **Step 2: Replace the content lines and add `classes`** in `promptFullBlast`:

```js
/** @returns {Promise<"fullBlast"|"standard"|null>} null when closed */
function promptFullBlast(weapon, loaded, standard) {
  const required = fullBlastRounds(standard);
  const allowed = canFullBlast(loaded, standard);
  // CPR's chat-card block and text classes, so the prompt matches the attack card.
  let content = `<div class="text-center text-normal text-semi">${t("FullBlast.PromptLoaded", { loaded })}</div>`;
  if (!allowed) {
    content += `<div class="text-center text-small">${t("FullBlast.PromptShort", { required })}</div>`;
  }
  return foundry.applications.api.DialogV2.wait({
    classes: [PROMPT_CLASS],
    window: { title: t("FullBlast.PromptTitle", { weapon }) },
    content: `<div class="cpr-block">${content}</div>`,
    buttons: [
      // unchanged
    ],
    // rejectClose and render unchanged
  });
}
```

Keep `buttons`, `rejectClose`, and `render` exactly as they are.

- [ ] **Step 3: Run tests and lint**

Run in the module repo: `npm test`. Expected: all `rules.test.js` tests pass.
Run from `D:\Antigravity\foundry-cpr`: `npm run lint`. Also lint the worktree file directly: `npx eslint <worktree>/scripts/full-blast.js`. Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add styles/full-blast-prompt.css module.json scripts/full-blast.js docs/superpowers
git commit -m "feat: restyle the Full Blast prompt with CPR fonts and a red block"
```

### Task 3: Live verification

- [ ] **Step 1: Load the branch.** In the live clone: `git checkout --detach feat/full-blast-prompt-style`. Then relaunch the world, because `module.json` changed: `game.shutDown()` as GM, launch from `/setup`, join, and open `/game`.
- [ ] **Step 2: Allowed state.** Assault Rifle at 25/25. Click the sheet attack control and wait for `dialog.cpr-autofire-homebrew-prompt[open]`. Assert:
  - For each footer button: `scrollWidth <= clientWidth`, and the label span's height is at most its line height plus 1px.
  - Title, block lines, and buttons compute `font-family` `Jost`.
  - `.cpr-block` background is `rgb(185, 2, 2)`, and its `::before` background is `rgb(234, 234, 234)` (light theme).
  - Take a screenshot.
- [ ] **Step 3: Enter.** Press Enter. Expect CPR's roll dialog for Standard Autofire to open. Close it.
- [ ] **Step 4: Disabled state.** Set the magazine to 15. Open the prompt again and assert that Full Blast is `disabled`, its border style is `dashed`, and its color differs from Standard's. Check that the "needs 20 rounds" line shows. Take a screenshot.
- [ ] **Step 5: Long name.** Rename the weapon to a 60-character name. Open the prompt and repeat the Step 2 fit assertions. Restore the name.
- [ ] **Step 6: Clean up.** Delete the temp actor and its chat messages, run `game.shutDown()`, run `git switch main` in the live clone, and send `foundry full-blast-damage` the message "live clone released".

### Task 4: Deliver

- [ ] Copy the screenshots to `docs/screenshots/` only if the PR cannot hold images any other way. Otherwise attach them to the PR.
- [ ] Push `feat/full-blast-prompt-style` and open a PR into `main`. The body covers the four fixes, notes that the disabled-state fix was not asked for, and notes that CPR's own dialog title bars and buttons use Signika, so Jost goes beyond CPR parity.
