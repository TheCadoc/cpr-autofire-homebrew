# Going public design spec

- Date: 2026-10-07
- Status: design approved; the public docs PR and the release wait for the Optional Rules PR to merge
- Module: `cpr-autofire-homebrew` (this repo)
- Approved by: Lukasz Dobbek (decisions 1 to 5 and design sections 1 to 3, 2026-10-07)

This document is the handoff for the session that writes the plan and does the work. Every fact it relies on is cited in section 4.

## 1. Goal

Make the module public so that others can install it by manifest URL or by hand, and can open pull requests. Credit the rule it automates to its author. Keep the public text inside R. Talsorian Games' Homebrew Content Policy.

## 2. Decisions

| #   | Decision                              | Choice                                                                                                                                                                                                             |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Die cap                               | Match the source: a boosted die is capped at 6. The Optional Rules PR owns this change. It also adds two world settings, both off by default: dice may exceed 6, and modified dice count toward critical injuries. |
| 2   | Which weapons get Full Blast          | Every Autofire weapon, as today. The README states this. Gating Full Blast per weapon, as the source's tech upgrade does, becomes a GitHub issue.                                                                  |
| 3   | Title                                 | "Autofire Homebrew for Cyberpunk RED". The id `cpr-autofire-homebrew` and the repo name stay unchanged.                                                                                                            |
| 4   | Code license                          | MIT, "Copyright (c) 2026 Lukasz Dobbek".                                                                                                                                                                           |
| 5   | Release mechanism                     | A GitHub Actions workflow that runs when a release is published. It checks the tag against `module.json`, stamps the version-pinned `download` URL, builds `module.zip`, and attaches both files to the release.   |
| 6   | Owner of the rule-math change         | The Optional Rules session. This work never edits `scripts/`.                                                                                                                                                      |
| 7   | First public version                  | `0.3.0`. It is a minor bump because the cap changes behavior.                                                                                                                                                      |
| 8   | Design history in `docs/superpowers/` | Stays public as it is. It contains local paths but no credentials.                                                                                                                                                 |

Rejected alternatives:

- **A local `npm run release` script.** It needs the maintainer's machine, and nothing checks that the tag matches the version.
- **A manifest on `main` with GitHub's source archive as the download.** The archive nests everything under a versioned folder and ships `docs/`, `test/`, and the screenshots. Foundry would also see a version on `main` before that version's release exists.
- **A separate cap PR from this work.** It would conflict with the Optional Rules PR, which edits the same functions in `scripts/rules.js`.

## 3. Environment

- Module repo `TheCadoc/cpr-autofire-homebrew`, currently **private**. `origin/main` is at b771e0e (v0.2.0, with Pneuma support). The live clone at `foundry-cpr/modules/cpr-autofire-homebrew` is the copy Foundry loads, and it is 11 commits behind.
- The Optional Rules work is draft PR #7, "feat: optional rules for dice above 6 and modified criticals" (`feat/optional-dice-rules`). "The Optional Rules PR" in this spec means PR #7.
- The `foundry-cpr` workspace has ESLint 10.12.0, `@eslint/js` ^10.0.1, `globals` ^17.13.0, and Prettier ^3.9.9. The module repo has no lint or format config of its own. Its `package.json` has only `"test": "node --test"`.
- Node 22. `gh` is logged in as `TheCadoc` with the scopes `repo` and `workflow`.

## 4. Facts the design depends on

1. **The source rule** is "Adjustable Gas Piston" in _Heavy Armor Lizard's Autofire Compendium_ ([Google Doc](https://docs.google.com/document/d/10Urp21DHQ6FP0OGr-oKwqXbIZsYK95-Hsev5wgLy420/edit?usp=sharing), read 2026-10-07):
   1. It is an Invented Tech Upgrade: Upgrade DV24, a second cost of 1000eb, installed on a weapon capable of Autofire.
   2. During an Autofire attack the user may spend twice the usual ammunition. Each damage die then goes up by 1, to a maximum of 6, before the multiplier.
   3. Its alternate rule: roll 3d6 and drop the lowest before the multiplier.
   4. The doc is silent on critical injuries.
   5. The doc's byline is "Heavy Armor Lizard". It credits "Fershte and Corgopolis for some items" without saying which items. It carries the RTG homebrew disclaimer and states no license for its text.
2. **The author.** The [reddit post](https://www.reddit.com/r/cyberpunkred/comments/1wspvae/heavy_armor_lizards_autofire_homebrew_compendium/) is by u/Infernox-Ratchet, per Lukasz. Reddit blocks automated fetches, so this session could not confirm the handle.
3. **R. Talsorian Games' [Homebrew Content Policy](https://rtalsoriangames.com/homebrew-content-policy/)**:
   1. A title may not lead with an RTG game title; the title may appear only descriptively ("X: ... for use with Cyberpunk RED").
   2. Content other than forum posts must carry, in a noticeable place: "[Title] is unofficial content provided under the Homebrew Content Policy of R. Talsorian Games and is not approved or endorsed by RTG."
   3. Homebrew must be free. VTT modules are allowed.
   4. Rules text from official products may not be reproduced.
4. **Foundry 12.343 package fields.** `common/packages/base-package.mjs:343-347` defines `url`, `license`, `readme`, `bugs`, and `changelog`, and `:394-395` defines `manifest` and `download`. All are optional strings.
5. **Foundry updates.** Foundry offers an update when the remote manifest's version is newer than the installed one. A package can be locked in Setup. "Locking a Package prevents it from being uninstalled or updated" (`public/lang/en.json:1792`, `SETUP.LockHint`).
6. **ESLint 10 finds a config file per linted file.** `lib/config/config-loader.js:385` (`findConfigFileForPath`) is the only lookup, and there is no legacy loader. A module-level `eslint.config.mjs` therefore governs the module's files even when the workspace runs `eslint .`. Its imports resolve through Node's normal lookup up the directory tree, so they reach `foundry-cpr/node_modules` when the module has no `node_modules` of its own.
7. **Workspace Prettier** runs with `--ignore-path .prettierignore` from the workspace root. A `.prettierignore` inside the module does not affect workspace runs.
8. **Repository history.** Every commit uses `167940519+TheCadoc@users.noreply.github.com`. A scan for local emails, tokens, and secrets found none. The plan docs contain `D:\` paths and the user ID of the local world's Gamemaster account; neither is a credential.
9. **Remote branches.** `docs/pneuma-compat-spec`, `feat/full-blast`, `feat/full-blast-damage-card-line`, `feat/full-blast-prompt-style`, and `feat/pneuma-compat` were merged through PRs #1 to #6. `feat/full-blast-damage-line` (36cd901) was never merged; `git range-diff` shows its commits are pre-rebase copies of PR #5 that differ only in context lines.
10. **GitHub rulesets** on a private repo need a paid plan for personal accounts. A public repo gets them free, so the ruleset is created after the visibility change.

## 5. Requirements

- **G1.** The README and the `module.json` description credit the Adjustable Gas Piston to u/Infernox-Ratchet and _Heavy Armor Lizard's Autofire Compendium_. The README links the reddit post and the Google Doc.
- **G2.** The rule is summarized in this project's own words. No text is copied from the source doc or from any RTG product.
- **G3.** The README carries the RTG disclaimer from fact 3.2, using the title from decision 3.
- **G4.** `module.json` `title` is "Autofire Homebrew for Cyberpunk RED", and its `id` is unchanged.
- **G5.** `LICENSE` is MIT (decision 4). `module.json` `license` points to it.
- **G6.** The README has a "Differences from the source" list:
  1. It applies to every Autofire weapon, with no upgrade DV or cost; the gating issue is linked.
  2. The alternate rule (3d6, drop the lowest) is not implemented.
  3. Each Optional Rules setting that departs from the source is named, and its default is given.
- **G7.** The README documents the settings the Optional Rules PR adds, using the names and defaults in its merged code.
- **G8.** An anonymous GET of the manifest URL returns the latest release's `module.json`. Its `version` equals the release tag without the `v`, and its `download` is that release's `module.zip`.
- **G9.** `module.zip` has `module.json` at its root and contains only `module.json`, `LICENSE`, `README.md`, `scripts/`, `styles/`, `templates/`, `lang/`, and, from 0.4.0, the compiled `packs/` without `packs/_source/`.
- **G10.** The release workflow fails, and attaches nothing, when the tag does not equal `v` + `module.json` `version`.
- **G11.** CI runs `npm test`, `npm run lint`, and `npm run format:check` on every pull request and every push to `main`. A ruleset on `main` requires it to pass.
- **G12.** A fresh clone of the module repo on its own, outside the workspace, passes `npm ci`, `npm test`, `npm run lint`, and `npm run format:check`.
- **G13.** The workspace's `npm run lint` and `npm run format:check` still cover the module and still pass.
- **G14.** Nothing in this work edits `scripts/`, `styles/`, `templates/`, or `lang/`. Those belong to feature PRs.

## 6. Deliverables

### 6.1 PR A, `chore/contributor-tooling` (can start now)

- **`LICENSE`**: the MIT text with the copyright line from decision 4.
- **`package.json`**:
  - Keep `"private": true` and `"type": "module"`.
  - Add the devDependencies `eslint`, `@eslint/js`, `globals`, and `prettier` at the workspace's ranges.
  - Scripts: `test` (`node --test`), `lint` (`eslint .`), `format` (`prettier --write .`), and `format:check` (`prettier --check .`).
  - Commit `package-lock.json`.
- **`eslint.config.mjs`**:
  - Ignores `.claude/**` and `docs/**`.
  - Applies `js.configs.recommended`.
  - `scripts/**/*.js` gets the browser and jQuery globals plus the workspace's Foundry global list. Copy it, then add any global the module uses that the list lacks.
  - `test/**/*.js` gets the Node globals.
- **`.prettierignore`**: `*.hbs` (Prettier cannot parse Handlebars partials), `.claude/`, and `package-lock.json`.
- **`.gitignore`**: unchanged. It already lists `.claude/` and `node_modules/`.
- **`.github/workflows/ci.yml`**:
  - Triggers on `pull_request` and on `push` to `main`, with `permissions: contents: read`.
  - One job named `check`: `actions/checkout`, `actions/setup-node` with Node 22 and npm cache, `npm ci`, `npm test`, `npm run lint`, `npm run format:check`.
- **`CONTRIBUTING.md`**:
  - Target: Foundry v12 (verified 12.343) and Cyberpunk RED Core 0.92.4. There is no build step.
  - Setup: clone into, or link to, `Data/modules/cpr-autofire-homebrew`, run `npm ci`, and enable libWrapper. Lock the module in Foundry Setup on a development install so an update cannot overwrite the clone.
  - Commands.
  - PR expectations: one change per PR; unit tests for rule math in `scripts/rules.js`-style pure modules; the steps of the in-Foundry test in the PR description; screenshots for UI changes; CI passing.
  - New homebrew rules start as an issue that links the source and names its author. No RTG rules text may be copied.
- **`.github/ISSUE_TEMPLATE/bug_report.yml`**:
  - Required fields: Foundry version, Cyberpunk RED Core version, module version, libWrapper version, steps to reproduce, expected result, and actual result.
  - Optional fields: the Pneuma's Combat Tools version, and console errors (F12).

### 6.2 PR B, `chore/public-release-0.3.0` (after the Optional Rules PR merges)

- **`module.json`**:
  - `title` per decision 3.
  - `description`: "Homebrew Autofire rules for Cyberpunk RED. Full Blast, adapted from Infernox-Ratchet's Adjustable Gas Piston: spend double ammunition to add 1 to each damage die (max 6) before the Autofire multiplier."
  - `version`: `0.3.0`.
  - `authors[0].url`: `https://github.com/TheCadoc`.
  - `url`: the repo.
  - `manifest`: `https://github.com/TheCadoc/cpr-autofire-homebrew/releases/latest/download/module.json`.
  - `download`: `https://github.com/TheCadoc/cpr-autofire-homebrew/releases/latest/download/module.zip`. This value is a fallback; the release workflow pins it.
  - `bugs`: the Issues page.
  - `readme`: the README on `main`.
  - `license`: the LICENSE on `main`.
  - `changelog`: the Releases page.
- **`.github/workflows/release.yml`**:
  - Triggers on `release: types: [published]`, with `permissions: contents: write`.
  - Steps:
    1. Checkout at the tag.
    2. A Node step that reads `module.json`, exits non-zero unless `"v" + version === GITHUB_REF_NAME`, and writes `download: https://github.com/TheCadoc/cpr-autofire-homebrew/releases/download/<tag>/module.zip`.
    3. `zip -r module.zip module.json LICENSE README.md scripts styles templates lang`.
    4. `gh release upload "$GITHUB_REF_NAME" module.json module.zip --clobber`.
- **`README.md`**, rewritten in this order:
  1. The title and a one-line summary.
  2. Credit (G1).
  3. Full Blast: the behavior as merged, with the capped formula and two screenshots from `docs/screenshots/`. Retake the damage card screenshot if it shows a natural 6.
  4. Settings (G7).
  5. Differences from the source (G6).
  6. Pneuma's Combat Tools, the current section.
  7. Requirements.
  8. Install, with the manifest URL and the manual zip steps.
  9. Contributing (a link).
  10. License (MIT for the code; the rule is credited to its author).
  11. The disclaimer (G3).

  Remove the current Development section, which points to the private workspace; its useful content moves to CONTRIBUTING.

### 6.3 Repository operations (Lukasz confirms each one before it runs)

1. Delete the remote branches listed in fact 4.9. Remove the stale local worktrees `damage-card-line`, `pneuma-compat`, and `pneuma-compat-spec`, and delete their local branches. Leave `optional-dice-rules` alone.
2. File the gating issue: "Gate Full Blast per weapon (Adjustable Gas Piston as a tech upgrade)". It states the source rule and the current global behavior, and gets the label `enhancement`. The repo is still private at this point; the issue becomes public with it. PR B links it.
3. After PR A and PR B merge: make the repo public, turn off the wiki, and turn on automatic deletion of head branches.
4. Create the ruleset on `main`, with no bypass list:
   - A pull request is required, with 0 approvals.
   - The status check `check` must pass.
   - Force pushes and deletion are blocked.
5. Publish the release: `gh release create v0.3.0 --generate-notes` on `main`.

### 6.4 Steps only Lukasz can take (optional, after the release)

- Submit the package to the Foundry package listing with his foundryvtt.com account.
- Tell u/Infernox-Ratchet that the rule is credited, and link the repo.

## 7. Release data flow

`module.json` on `main` (version, plus the `latest` URLs) → maintainer publishes `vX.Y.Z` → release workflow checks the tag and pins `download` to `.../download/vX.Y.Z/module.zip` → it zips the files the module needs to run, including the pinned `module.json` → it attaches `module.json` and `module.zip` → Foundry fetches `.../latest/download/module.json`, compares versions, and downloads the pinned zip.

## 8. Failure modes

- **Tag and version mismatch.** The workflow fails and attaches nothing (G10). The fix is to delete the release, correct the version or the tag, and publish again.
- **Foundry "Update" on a development install.** If a release is newer than the live clone's `module.json`, Foundry can extract the zip through the `npm run link` junction and overwrite the clone. Mitigations: lock the module in Setup (fact 4.5), keep the live clone's `main` pulled, and say this in CONTRIBUTING.
- **Fork PRs.** GitHub's default requires a maintainer to approve workflow runs from first-time contributors. Keep the default. CI has read-only permissions and uses no secrets.
- **A nested ESLint config breaking the workspace lint.** Covered by G13 and checked in 9.1.

## 9. Testing and acceptance

### 9.1 PR A

1. Clone the PR branch into `$CLAUDE_JOB_DIR/tmp/standalone`, which is outside the workspace so no parent `node_modules` exists. Run `npm ci`, `npm test`, `npm run lint`, and `npm run format:check`. Expected: all pass (G12).
2. From `D:\Antigravity\foundry-cpr`, with the live clone checked out at the PR branch:
   1. `npm run lint` and `npm run format:check` pass.
   2. `npx eslint --print-config modules/cpr-autofire-homebrew/scripts/main.js` shows the module's globals.
   3. `npx eslint --print-config modules/cpr-autofire-homebrew/test/rules.test.js` shows the Node globals.
   4. Afterwards, `git switch main` in the live clone (G13).
3. Lint the worktree from the worktree's own directory with `npx eslint .`. Expected: it uses the module config and passes. This confirms the memory gotcha "lint worktrees from the workspace cwd" no longer applies to this module.
4. CI is green on the PR.

### 9.2 Release workflow, before PR B merges

1. Run the Node check-and-stamp step locally with a mismatched tag (`GITHUB_REF_NAME=v9.9.9`). Expected: it exits non-zero.
2. Run it with `v0.3.0`. Expected: `download` is pinned to `.../download/v0.3.0/module.zip`. Restore the file afterwards.
3. `git diff --stat main..HEAD -- scripts styles templates lang` is empty (G14).

### 9.3 After the release

1. `curl -sL https://github.com/TheCadoc/cpr-autofire-homebrew/releases/latest/download/module.json`, without auth. Expected: version `0.3.0` and the pinned `download` (G8).
2. Download `module.zip` and list it. Expected: exactly the contents in G9, with `module.json` at the root.
3. Install from the manifest in Foundry:
   1. Stop the world and go to Setup.
   2. Remove the dev junction with `cmd /c rmdir "%LOCALAPPDATA%\FoundryVTT\Data\modules\cpr-autofire-homebrew"`. This removes only the link; never use a recursive delete on it.
   3. Install Module, paste the manifest URL. Expected: it installs `0.3.0`, and libWrapper is offered as a dependency if it is missing.
   4. Launch the test world. Expected: Foundry's module list shows the new title and description, and an Autofire attack shows the Full Blast prompt.
   5. Return to Setup and uninstall the module. Run `npm run link` from `foundry-cpr`, and lock the module.
4. Open the public repo while logged out. Expected: the README renders with the credit, disclaimer, and screenshots, and "Fork" and "New issue" with the bug template are available.

## 10. Delivery

1. This spec, through PR `docs/go-public-spec`.
2. PR A (section 6.1), in parallel with the Optional Rules PR. If the Optional Rules PR merges after PR A, it must pass the new CI.
3. Repository operations 6.3.1 and 6.3.2.
4. PR B (section 6.2), after the Optional Rules PR merges.
5. Repository operations 6.3.3 to 6.3.5, then the checks in 9.3.
6. Housekeeping:
   - Pull `main` in the live clone.
   - In the `foundry-cpr` workspace `CLAUDE.md`, change the nested repo note from "private" to "public". The workspace has no remote, so Lukasz approves this edit.
   - Report the steps in 6.4 to Lukasz.

## 11. Out of scope

- Gating Full Blast per weapon (the issue from operation 6.3.2).
- The alternate 3d6-drop-lowest rule. It is listed in the README's differences and can be filed as an issue if wanted.
- Submitting to the Foundry package listing, which needs Lukasz's account (6.4).
- Foundry v13 and CPR's v13 migration.
- Any change to the rule math, the settings, or their UI. These belong to the Optional Rules PR.
