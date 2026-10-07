# Contributor tooling (PR A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let anyone clone this repo on its own and test, lint, and format it, with CI enforcing the same checks on every PR and push to `main`.

**Architecture:** The repo gets its own ESLint flat config, a Prettier ignore file, devDependencies, and npm scripts, so it no longer relies on the `foundry-cpr` workspace. A GitHub Actions job named `check` runs `npm test`, `npm run lint`, and `npm run format:check`. LICENSE, CONTRIBUTING, and a bug report form complete the public contributor surface. Nothing under `scripts/`, `styles/`, `templates/`, or `lang/` changes (spec G14).

**Tech Stack:** Node 22, npm, ESLint 10 (flat config), Prettier 3.9.9 (exact), GitHub Actions (`actions/checkout@v7`, `actions/setup-node@v7`), GitHub issue forms.

**Spec:** `docs/superpowers/specs/2026-10-07-go-public-design.md`, section 6.1, tested per 9.1. The spec is in PR #8. This branch starts from `origin/main` (b771e0e), so the spec file is not on it.

---

## Context

- Worktree: `D:\Antigravity\foundry-cpr\modules\cpr-autofire-homebrew\.claude\worktrees\go-public`, on branch `chore/contributor-tooling` (from `origin/main` b771e0e, no upstream yet). Run every command from the worktree unless a step says otherwise. The worktree guard refuses compound git commands such as loops over variables, `-C <other path>`, or `cd` into the shared clone; use plain, separate commands.
- Workspace tool versions (installed in `D:\Antigravity\foundry-cpr\node_modules`): eslint 10.12.0, @eslint/js 10.0.1, globals 17.13.0, prettier 3.9.9. The module pins Prettier exactly, as Prettier recommends, so the module and the workspace always format identically. The ESLint packages use the workspace's caret ranges.
- ESLint 10 looks up the nearest `eslint.config.mjs` for each linted file (spec fact 4.6). Before Task 4, `npx eslint .` in the worktree finds the workspace config, which ignores `**/.claude/**`, so it lints nothing.
- Prettier 3 reads `.gitignore` and `.prettierignore` from the cwd by default. `.gitignore` already lists `.claude/` and `node_modules/`.
- Do not check out branches in the live clone `D:\Antigravity\foundry-cpr\modules\cpr-autofire-homebrew`. The Optional Rules session (PR #7) may be live-testing from it. The live-clone half of spec 9.1.2 runs after PR A merges (Task 10).

## File structure

| File                                    | Action | Responsibility                                                     |
| --------------------------------------- | ------ | ------------------------------------------------------------------ |
| `LICENSE`                               | Create | MIT license text                                                   |
| `package.json`                          | Modify | devDependencies and the `test`, `lint`, and `format` scripts       |
| `package-lock.json`                     | Create | Locked dependency tree for `npm ci`                                |
| `eslint.config.mjs`                     | Create | Lint rules and globals for `scripts/` (Foundry) and `test/` (Node) |
| `.prettierignore`                       | Create | Files Prettier must skip                                           |
| `.github/workflows/ci.yml`              | Create | The `check` job                                                    |
| `CONTRIBUTING.md`                       | Create | Setup, commands, PR expectations, new-rule policy                  |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | Create | Bug report form                                                    |

---

### Task 1: Commit this plan

**Files:**

- Create: `docs/superpowers/plans/2026-10-07-contributor-tooling.md`

- [ ] **Step 1: Format and commit**

From `D:\Antigravity\foundry-cpr` (workspace cwd; the worktree has no Prettier yet), with the explicit empty ignore path, because the workspace `.prettierignore` skips `**/.claude/**`:

```bash
npx prettier --ignore-path "" --write modules/cpr-autofire-homebrew/.claude/worktrees/go-public/docs/superpowers/plans/2026-10-07-contributor-tooling.md
```

Then from the worktree:

```bash
git add docs/superpowers/plans/2026-10-07-contributor-tooling.md
git commit -m "docs: add contributor tooling implementation plan"
```

---

### Task 2: LICENSE

**Files:**

- Create: `LICENSE`

- [ ] **Step 1: Write the file**

```text
MIT License

Copyright (c) 2026 Lukasz Dobbek

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Commit**

```bash
git add LICENSE
git commit -m "chore: license the code under MIT"
```

---

### Task 3: devDependencies and scripts

**Files:**

- Modify: `package.json` (currently `{"private": true, "type": "module", "scripts": {"test": "node --test"}}`)
- Create: `package-lock.json`

- [ ] **Step 1: Install the tools**

```bash
npm install --save-dev eslint@^10.12.0 @eslint/js@^10.0.1 globals@^17.13.0
npm install --save-dev --save-exact prettier@3.9.9
```

Expected: `node_modules/` and `package-lock.json` appear. `git status` does not list `node_modules/`, because `.gitignore` covers it.

- [ ] **Step 2: Set the scripts**

Edit `package.json` so it reads exactly this, keeping the devDependency versions npm wrote:

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "eslint": "^10.12.0",
    "globals": "^17.13.0",
    "prettier": "3.9.9"
  }
}
```

- [ ] **Step 3: Check that the tests still pass**

Run: `npm test`
Expected: every test in `test/rules.test.js` and `test/pneuma-match.test.js` passes, and the summary shows `fail 0`. Node's runner skips `node_modules/`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add ESLint and Prettier as devDependencies"
```

---

### Task 4: ESLint config

**Files:**

- Create: `eslint.config.mjs`

- [ ] **Step 1: See the missing config fail**

Run: `npm run lint`
Expected: ESLint finds the workspace config, which ignores `**/.claude/**`, and reports that every file is ignored or that no files matched. Either way, nothing is linted. This is the gap the config fills.

- [ ] **Step 2: Write the config**

The Foundry global list is copied from the workspace `eslint.config.mjs`, which the module already passes.

```js
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: [".claude/**", "docs/**"] },
  js.configs.recommended,
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jquery,
        // Foundry v12 runtime globals; extend as the module needs more.
        foundry: "readonly",
        game: "readonly",
        canvas: "readonly",
        ui: "readonly",
        CONFIG: "readonly",
        CONST: "readonly",
        Hooks: "readonly",
        Actor: "readonly",
        Item: "readonly",
        ChatMessage: "readonly",
        Roll: "readonly",
        Dialog: "readonly",
        Handlebars: "readonly",
        renderTemplate: "readonly",
        loadTemplates: "readonly",
        getTemplate: "readonly",
        libWrapper: "readonly",
        fromUuid: "readonly",
        fromUuidSync: "readonly",
      },
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: { globals: globals.node },
  },
];
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: exit code 0 and no output. If a global is reported as undefined in `scripts/`, add it to the Foundry list. Do not edit `scripts/` (G14).

- [ ] **Step 4: Prove the right config applies to each folder**

Run: `npx eslint --print-config scripts/main.js | grep -c '"libWrapper"'`
Expected: `1`.

Run: `npx eslint --print-config test/rules.test.js | grep -cE '"process"|"window"'`
Expected: `1`. Only `process` matches, because test files get Node globals and not browser globals.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore: add a standalone ESLint config"
```

---

### Task 5: Prettier ignore

**Files:**

- Create: `.prettierignore`

- [ ] **Step 1: See the format check fail**

Run: `npm run format:check`
Expected: it fails on `templates/*.hbs`, because Prettier's Handlebars parser cannot parse the `{{> ...}}` partials. It may also flag `package-lock.json`.

- [ ] **Step 2: Write the file**

```text
# Prettier's Handlebars parser cannot parse partials ({{> ...}}), which Foundry templates use.
*.hbs
.claude/
package-lock.json
```

- [ ] **Step 3: Run the format check**

Run: `npm run format:check`
Expected: `All matched files use Prettier code style!`. If it flags a file this PR created, run `npx prettier --write <that file>`. If it flags an existing file, stop and report: the workspace already checks those files with the same Prettier version, so a failure means the two setups disagree.

- [ ] **Step 4: Commit**

```bash
git add .prettierignore
git commit -m "chore: add a Prettier ignore file"
```

---

### Task 6: CI workflow

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run format:check
```

- [ ] **Step 2: Format check**

Run: `npm run format:check`
Expected: passes. If not, `npx prettier --write .github/workflows/ci.yml`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run tests, lint, and format check on PRs and main"
```

---

### Task 7: CONTRIBUTING.md

**Files:**

- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Write the file**

```markdown
# Contributing

This module targets Foundry VTT v12 (verified 12.343) and Cyberpunk RED Core 0.92.4. It is plain ES modules with no build step.

## Setup

1. Install Node 22.
2. Clone this repo into your Foundry data folder as `Data/modules/cpr-autofire-homebrew`, or clone it elsewhere and link it there (Windows: `mklink /J`; macOS and Linux: `ln -s`). The folder must be named `cpr-autofire-homebrew`.
3. Run `npm ci`.
4. In Foundry, install libWrapper, then enable libWrapper and this module in a Cyberpunk RED world.
5. In Foundry Setup, lock this module (the lock icon under Add-on Modules). A locked package is never updated, so a release can't overwrite your clone.

After a JavaScript change, reload the browser (F5). After a `module.json` change, return to Setup and relaunch the world.

## Commands

- `npm test`: unit tests, with Node's test runner.
- `npm run lint`: ESLint.
- `npm run format` and `npm run format:check`: Prettier.

CI runs `npm test`, `npm run lint`, and `npm run format:check` on every pull request. All three must pass.

## Pull requests

- Branch from `main`, and keep each PR to one change.
- Put rule math in pure modules with no Foundry globals, like `scripts/rules.js`, and unit-test it in `test/`.
- In the PR description, list the steps you ran in Foundry and what you saw. Add screenshots for anything visible.
- Don't import Cyberpunk RED internals from `/systems/cyberpunk-red-core/modules/...`. Use Foundry hooks, libWrapper, and `game.cpr`; internal imports break when the system refactors.

## New homebrew rules

Open an issue before writing code. Link the rule's source and name its author, so the README can credit them. Describe rules in your own words. R. Talsorian Games' [Homebrew Content Policy](https://rtalsoriangames.com/homebrew-content-policy/) does not allow copying official rules text, and other homebrewers' text belongs to them.

## Bugs

Use the bug report form. Include your Foundry, Cyberpunk RED Core, module, and libWrapper versions, and any errors from the browser console (F12).

## License

By contributing, you agree that your contributions are licensed under the MIT License in `LICENSE`.
```

- [ ] **Step 2: Format check**

Run: `npm run format:check`
Expected: passes. If not, `npx prettier --write CONTRIBUTING.md` and review the diff.

- [ ] **Step 3: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add contributing guide"
```

---

### Task 8: Bug report form

**Files:**

- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`

- [ ] **Step 1: Write the form**

```yaml
name: Bug report
description: Something in the module does not work as the README describes.
labels: [bug]
body:
  - type: markdown
    attributes:
      value: Before reporting, check that the bug still happens with only this module, libWrapper, and (if relevant) Pneuma's Combat Tools enabled.
  - type: input
    id: foundry
    attributes:
      label: Foundry VTT version
      placeholder: "12.343"
    validations:
      required: true
  - type: input
    id: cpr
    attributes:
      label: Cyberpunk RED Core version
      placeholder: "0.92.4"
    validations:
      required: true
  - type: input
    id: module
    attributes:
      label: Module version
      placeholder: "0.3.0"
    validations:
      required: true
  - type: input
    id: libwrapper
    attributes:
      label: libWrapper version
    validations:
      required: true
  - type: input
    id: pneuma
    attributes:
      label: Pneuma's Combat Tools version, if installed
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      placeholder: |
        1.
        2.
        3.
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected result
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: Actual result
    validations:
      required: true
  - type: textarea
    id: console
    attributes:
      label: Console errors
      description: Open the browser console (F12), reproduce the bug, and paste any red errors.
      render: text
```

- [ ] **Step 2: Format check**

Run: `npm run format:check`
Expected: passes. If not, `npx prettier --write .github/ISSUE_TEMPLATE/bug_report.yml`.

- [ ] **Step 3: Commit**

```bash
git add .github/ISSUE_TEMPLATE/bug_report.yml
git commit -m "chore: add a bug report form"
```

---

### Task 9: Verify (spec 9.1, the parts done before merge)

- [ ] **Step 1: Standalone clone (G12)**

From the worktree:

```bash
git clone --branch chore/contributor-tooling . "$CLAUDE_JOB_DIR/tmp/standalone"
```

Then, in `$CLAUDE_JOB_DIR/tmp/standalone`, run `npm ci`, then `npm test`, then `npm run lint`, then `npm run format:check`, as separate commands. No parent folder of that path has a `node_modules` (checked 2026-10-07).
Expected: all four exit 0.

- [ ] **Step 2: The workspace sees the module config (G13, first half)**

From `D:\Antigravity\foundry-cpr`:

Run: `npx eslint --print-config modules/cpr-autofire-homebrew/.claude/worktrees/go-public/test/rules.test.js | grep -cE '"process"|"window"'`
Expected: `1`. The worktree's config, not the workspace's, governs the file even from the workspace cwd.

Run: `npx eslint modules/cpr-autofire-homebrew/.claude/worktrees/go-public/scripts modules/cpr-autofire-homebrew/.claude/worktrees/go-public/test`
Expected: exit 0 with no output, and no "File ignored" warning, because the nearest config does not ignore these paths.

- [ ] **Step 3: The workspace lint still skips worktrees**

From `D:\Antigravity\foundry-cpr`:

Run: `npm run lint`
Expected: exit 0.

Run: `npx eslint . -f json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).filter(r=>r.filePath.includes('.claude')).length))"`
Expected: `0`. The worktree's nested config does not pull worktree files into the workspace lint.

- [ ] **Step 4: Scope check (G14)**

Run: `git diff --stat origin/main..HEAD -- scripts styles templates lang`
Expected: empty output.

---

### Task 10: PR, CI, and the post-merge workspace check

- [ ] **Step 1: Push and open the PR**

```bash
git push -u origin chore/contributor-tooling
```

```bash
gh pr create --base main --head chore/contributor-tooling --title "chore: contributor tooling and CI" --body-file "$CLAUDE_JOB_DIR/tmp/pr-a-body.md"
```

Write `$CLAUDE_JOB_DIR/tmp/pr-a-body.md` first. It should summarize the files added, list the Task 9 results, say that CI is a required check only once the ruleset exists (spec 6.3.4), say that PR #7 must pass this CI if it merges later, and end with the attribution line from the session's system reminder.

- [ ] **Step 2: CI is green (spec 9.1.4)**

Run: `gh pr checks --watch`
Expected: `check` passes. If it fails, read the log with `gh run view --log-failed`, fix the cause, commit, and push.

- [ ] **Step 3: Report to Lukasz**

Give the PR link, the CI result, the Task 9 results, and anything skipped. Merging is his call.

- [ ] **Step 4: After the merge, check the workspace from the live clone (spec 9.1.2, G13 second half)**

Run this only after Lukasz merges, and only if the live clone is on `main` with a clean `git status` (otherwise PR #7 may be live-testing from it: ask first). Per the memory "live clone git blocked in worktree", ExitWorktree with `action: "keep"` first. Then:

1. In `D:\Antigravity\foundry-cpr\modules\cpr-autofire-homebrew`, run `git pull --ff-only`.
2. From `D:\Antigravity\foundry-cpr`, run `npm run lint`, then `npm run format:check`.
   Expected: both exit 0.
3. Run `npx eslint --print-config modules/cpr-autofire-homebrew/test/rules.test.js | grep -cE '"process"|"window"'`.
   Expected: `1`.

The live clone has no `node_modules` of its own. ESLint resolves `@eslint/js` and `globals` from `foundry-cpr/node_modules` (spec fact 4.6).
