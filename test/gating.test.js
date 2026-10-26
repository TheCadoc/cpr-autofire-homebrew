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
