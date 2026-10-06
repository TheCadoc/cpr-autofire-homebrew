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
