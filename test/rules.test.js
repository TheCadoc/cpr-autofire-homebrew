import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canFullBlast,
  countsTowardCritical,
  fullBlastBonus,
  fullBlastFaces,
  fullBlastRounds,
  isFullBlastCritical,
} from "../scripts/rules.js";

const sum = (values) => values.reduce((total, value) => total + value, 0);

/** Every setting combination as [aboveSix, countModified]. */
const COMBOS = [
  [false, false],
  [true, false],
  [false, true],
  [true, true],
];

test("fullBlastRounds doubles the native Autofire cost", () => {
  assert.equal(fullBlastRounds(10), 20);
});

test("canFullBlast needs the whole Full Blast cost loaded", () => {
  assert.equal(canFullBlast(19, 10), false);
  assert.equal(canFullBlast(20, 10), true);
  assert.equal(canFullBlast(0, 10), false);
});

test("fullBlastFaces caps each raised die at 6 by default", () => {
  assert.deepEqual(fullBlastFaces([5, 4], false), [6, 5]);
  assert.deepEqual(fullBlastFaces([6, 5], false), [6, 6]);
  assert.deepEqual(fullBlastFaces([6, 6], false), [6, 6]);
});

test("fullBlastFaces raises a 6 to 7 when results may go above 6", () => {
  assert.deepEqual(fullBlastFaces([6, 5], true), [7, 6]);
  assert.deepEqual(fullBlastFaces([1, 4], true), [2, 5]);
});

test("fullBlastFaces does not mutate the natural faces", () => {
  const faces = [6, 4];
  fullBlastFaces(faces, false);
  fullBlastFaces(faces, true);
  assert.deepEqual(faces, [6, 4]);
  assert.deepEqual(fullBlastFaces([], false), []);
});

test("fullBlastBonus is one per raised die, multiplied", () => {
  assert.deepEqual(
    [1, 2, 3, 4].map((m) => fullBlastBonus([5, 4], m, false)),
    [2, 4, 6, 8],
  );
  assert.equal(fullBlastBonus([5, 4], 0, false), 0);
  assert.equal(fullBlastBonus([], 3, false), 0);
});

test("fullBlastBonus skips a natural 6 unless results may go above 6", () => {
  assert.equal(fullBlastBonus([6, 5], 2, false), 2);
  assert.equal(fullBlastBonus([6, 6], 2, false), 0);
  assert.equal(fullBlastBonus([6, 5], 2, true), 4);
  assert.equal(fullBlastBonus([6, 6], 2, true), 4);
});

test("one bonus modifier equals raising each die before multiplying", () => {
  for (const aboveSix of [false, true]) {
    const raise = (die) => (aboveSix ? die + 1 : Math.min(die + 1, 6));
    for (let d1 = 1; d1 <= 6; d1 += 1) {
      for (let d2 = 1; d2 <= 6; d2 += 1) {
        for (let m = 1; m <= 4; m += 1) {
          assert.equal(
            (raise(d1) + raise(d2)) * m,
            (d1 + d2) * m + fullBlastBonus([d1, d2], m, aboveSix),
            `d1=${d1} d2=${d2} m=${m} aboveSix=${aboveSix}`,
          );
        }
      }
    }
  }
});

test("the displayed Full Blast dice reconcile with the bonus modifier", () => {
  for (const aboveSix of [false, true]) {
    for (let d1 = 1; d1 <= 6; d1 += 1) {
      for (let d2 = 1; d2 <= 6; d2 += 1) {
        for (let m = 1; m <= 4; m += 1) {
          const faces = [d1, d2];
          assert.equal(
            sum(fullBlastFaces(faces, aboveSix)) * m,
            sum(faces) * m + fullBlastBonus(faces, m, aboveSix),
            `d1=${d1} d2=${d2} m=${m} aboveSix=${aboveSix}`,
          );
        }
      }
    }
  }
});

test("a natural 6 counts toward a critical whatever it was modified to", () => {
  for (const countModified of [false, true]) {
    assert.equal(countsTowardCritical(6, 6, countModified), true);
    assert.equal(countsTowardCritical(6, 7, countModified), true);
    assert.equal(countsTowardCritical(6, 5, countModified), true);
  }
});

test("a modified die counts toward a critical only when the setting is on", () => {
  assert.equal(countsTowardCritical(5, 6, false), false);
  assert.equal(countsTowardCritical(5, 6, true), true);
  assert.equal(countsTowardCritical(4, 5, true), false);
});

test("a modified die counts at 6 or more, not only at exactly 6", () => {
  assert.equal(countsTowardCritical(5, 7, true), true);
  assert.equal(countsTowardCritical(5, 7, false), false);
});

test("isFullBlastCritical across every setting combination", () => {
  // [faces, expected per COMBOS order: off/off, aboveSix, countModified, both]
  const cases = [
    [
      [6, 6],
      [true, true, true, true],
    ],
    [
      [6, 5],
      [false, false, true, true],
    ],
    [
      [5, 5],
      [false, false, true, true],
    ],
    [
      [6, 4],
      [false, false, false, false],
    ],
    [
      [5, 4],
      [false, false, false, false],
    ],
    [
      [4, 4],
      [false, false, false, false],
    ],
  ];
  for (const [faces, expected] of cases) {
    COMBOS.forEach(([aboveSix, countModified], i) => {
      assert.equal(
        isFullBlastCritical(faces, aboveSix, countModified),
        expected[i],
        `faces=${faces} aboveSix=${aboveSix} countModified=${countModified}`,
      );
    });
  }
});

test("with both settings on, a 6 raised to 7 and a 5 raised to 6 both count", () => {
  assert.deepEqual(fullBlastFaces([6, 5], true), [7, 6]);
  assert.equal(countsTowardCritical(6, 7, true), true);
  assert.equal(countsTowardCritical(5, 6, true), true);
  assert.equal(isFullBlastCritical([6, 5], true, true), true);
});

test("Full Blast damage per setting combination", () => {
  // The crit setting never changes damage; only aboveSix does.
  for (const [aboveSix, countModified] of COMBOS) {
    const label = `aboveSix=${aboveSix} countModified=${countModified}`;
    const total = (faces, m) =>
      sum(faces) * m + fullBlastBonus(faces, m, aboveSix);
    assert.equal(total([6, 5], 2), aboveSix ? 26 : 24, label);
    assert.equal(total([6, 6], 3), aboveSix ? 42 : 36, label);
    assert.equal(total([5, 4], 2), 22, label);
  }
});
