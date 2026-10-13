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

## Design docs

Each feature's design spec is in `docs/superpowers/specs/` and its implementation plan in `docs/superpowers/plans/`. Read the spec for a rule before changing how it behaves.

## New homebrew rules

Open an issue before writing code. Link the rule's source and name its author, so the README can credit them. Describe rules in your own words. R. Talsorian Games' [Homebrew Content Policy](https://rtalsoriangames.com/homebrew-content-policy/) does not allow copying official rules text, and other homebrewers' text belongs to them.

## Bugs

Use the bug report form. Include your Foundry, Cyberpunk RED Core, module, and libWrapper versions, and any errors from the browser console (F12).

## License

By contributing, you agree that your contributions are licensed under the MIT License in `LICENSE`.
