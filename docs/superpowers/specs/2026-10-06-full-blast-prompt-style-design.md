# Full Blast prompt restyle: design

Date: 2026-10-06. Status: approved scope (relayed task, fixed by the user). Builds on `2026-10-05-full-blast-design.md` section 6.3, unit 4.

## 1. Request (from the user, verbatim)

> Visual tweak to the firing mode selection screen. Make sure to use the same fonts as the core module, and use a red border like the cards in chat. Most crucially, make sure the text fits the buttons.

## 2. Measured problems (live, Foundry 12.343, CPR 0.92.4, light theme)

1. The window is 420px wide. The two footer buttons sit side by side at 188px each, which leaves about 170px for a label. "Standard Autofire (10 rounds)" needs 178px in Signika and 176px in Jost, so it wraps to 56px inside a 40px button. Switching the font alone does not fix it.
2. The title bar and the buttons use Foundry's Signika. The body text is already Jost, because CPR sets `font-family: var(--cpr-font-primary) !important` on every `.application .window-content`.
3. The disabled Full Blast button looks like plain text. Foundry's `button:disabled` sets `--button-border-color: transparent`. CPR's unlayered `.application .window-content button` rule then paints enabled and disabled buttons with the same colors, and that color matches the window background.
4. There is no red frame. CPR's chat cards are built from `.cpr-block` panels (chat.less): a `--cpr-background-chat-card-block` (red) background, a `--cpr-background-chat-card-block-before` (white) `::before` inset by 0.25rem, and a clipped top-left corner.

Premise check: CPR's own roll dialog also uses Signika for its title bar and buttons and Jost only for its content. "Same fonts as the core module" therefore goes one step past CPR's own dialog chrome. This design applies Jost to the title and buttons as the user asked, and the PR says so.

## 3. Design

All fonts, colors, and the frame come from CPR, either by reusing its classes or through its `--cpr-*` CSS variables. Nothing is copied.

1. **Dialog class.** `promptFullBlast` passes `classes: ["cpr-autofire-homebrew-prompt"]` to `DialogV2.wait`. ApplicationV2 concatenates it with `dialog`. Every rule in the new stylesheet is scoped under this class.
2. **Red frame.** The content is wrapped in CPR's own `<div class="cpr-block">`, so the frame, the cut corner, and dark mode come from CPR's CSS unchanged. The lines reuse CPR's chat-card text classes. The rounds-loaded line uses `text-center text-normal text-semi`, like the card title. The "needs N rounds" line uses `text-center text-small`, like the card subtitle.
3. **Fonts.** The window header and the buttons get `font-family: var(--cpr-font-primary)`. The title inherits it from the header, which avoids a specificity fight with Foundry's unlayered `.application .window-header .window-title { font-family: inherit }` in `css/style.css`. The body already inherits it from CPR.
4. **Labels fit.** The footer stacks the buttons in a column (`flex-direction: column; align-items: stretch`), and the buttons get `flex: none; white-space: nowrap`. Each label gets the full content width, about 366px for a 176px label. The dialog gets `min-width: 25rem`, because a column footer no longer holds the shrink-to-fit window at its old 420px width. Because the window still sizes itself to its content above that floor, a longer label or a long weapon name widens the window instead of wrapping.
5. **Disabled state.** `button:disabled` gets `color` and a 0.125rem dashed `border` (CPR's dialog border width) from `var(--cpr-text-icon-dimmed)`, plus `background: none`. Foundry keeps `pointer-events: none` on disabled buttons, so there is no hover state.
6. **Manifest.** `module.json` gains `"styles": ["styles/full-blast-prompt.css"]`.

Considered and rejected: keeping the buttons side by side and widening the dialog to about 460px. That fits today's labels, but a translation or a font change breaks it again. Stacking gives each label about twice the room it needs.

## 4. Unchanged behavior

- Buttons, actions, order, and `default: true` on Standard are the same, so Enter still picks Standard Autofire.
- `rejectClose: false`, the `render` callback that disables Full Blast, and the return values are the same.
- The rounds-loaded line always shows. The "needs N rounds" line shows when ammo is short.
- Pneuma's Combat Tools only touches `CPRRollDialog`. This prompt stays a DialogV2, and every rule is scoped to its own class.

## 5. Verification

No unit test covers CSS. `npm test` keeps covering `rules.js`. Live checks via DOM measurement:

1. Both buttons: `scrollWidth <= clientWidth`, and the label `span` height equals one line height, with a normal weapon and with a 60-character weapon name.
2. The title, the paragraphs, and the buttons compute `font-family: Jost`.
3. The `.cpr-block` background is `--cpr-background-chat-card-block`, and its `::before` background is `--cpr-background-chat-card-block-before`.
4. With ammo short, the Full Blast button is `disabled` and has a dashed border and a dimmed color that differ from the Standard button.
5. Enter on a fresh prompt resolves Standard. A screenshot of both states goes in the PR.
