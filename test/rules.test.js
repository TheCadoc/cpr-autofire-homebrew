import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canFullBlast,
  fullBlastBonus,
  fullBlastRounds,
} from "../scripts/rules.js";

test("fullBlastRounds doubles the native Autofire cost", () => {
  assert.equal(fullBlastRounds(10), 20);
});

test("canFullBlast needs the whole Full Blast cost loaded", () => {
  assert.equal(canFullBlast(19, 10), false);
  assert.equal(canFullBlast(20, 10), true);
  assert.equal(canFullBlast(0, 10), false);
});

test("fullBlastBonus is one per die, multiplied", () => {
  assert.deepEqual(
    [1, 2, 3, 4].map((m) => fullBlastBonus(2, m)),
    [2, 4, 6, 8],
  );
  assert.equal(fullBlastBonus(0, 3), 0);
});

test("one bonus modifier equals +1 per die before multiplying", () => {
  for (let d1 = 1; d1 <= 6; d1 += 1) {
    for (let d2 = 1; d2 <= 6; d2 += 1) {
      for (let m = 1; m <= 4; m += 1) {
        assert.equal(
          (d1 + 1 + d2 + 1) * m,
          (d1 + d2) * m + fullBlastBonus(2, m),
          `d1=${d1} d2=${d2} m=${m}`,
        );
      }
    }
  }
});
