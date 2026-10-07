// Full Blast rule math. No Foundry globals, so Node can unit-test it.

/** A d6's top face: the cap on modified results and the critical threshold. */
const SIX = 6;

/**
 * Rounds a Full Blast costs.
 *
 * @param {number} standardRounds - the native Autofire cost
 * @returns {number}
 */
export function fullBlastRounds(standardRounds) {
  return standardRounds * 2;
}

/**
 * Whether the loaded magazine covers a Full Blast.
 *
 * @param {number} loadedRounds
 * @param {number} standardRounds - the native Autofire cost
 * @returns {boolean}
 */
export function canFullBlast(loadedRounds, standardRounds) {
  return loadedRounds >= fullBlastRounds(standardRounds);
}

/**
 * Damage Full Blast adds: +1 per die it raises, multiplied. A natural 6 is not
 * raised unless `aboveSix`. CPR multiplies the dice and adds other modifiers
 * afterward, so this equals raising each die first.
 *
 * @param {number[]} faces - natural d6 results
 * @param {number} multiplier - CPR's capped Autofire multiplier
 * @param {boolean} aboveSix - whether a die may be raised above 6
 * @returns {number}
 */
export function fullBlastBonus(faces, multiplier, aboveSix) {
  const raised = aboveSix ? faces : faces.filter((face) => face < SIX);
  return raised.length * multiplier;
}

/**
 * Die values Full Blast counts: each natural face plus 1, capped at 6 unless
 * `aboveSix`. Die images keep the natural faces.
 *
 * @param {number[]} faces - natural d6 results
 * @param {boolean} aboveSix - whether a die may be raised above 6
 * @returns {number[]}
 */
export function fullBlastFaces(faces, aboveSix) {
  return faces.map((face) => (aboveSix ? face + 1 : Math.min(face + 1, SIX)));
}

/**
 * Whether one die counts toward a damage critical. A natural 6 always does; a
 * modified die does when `countModified` and its result is 6 or more.
 *
 * @param {number} natural - the die's natural face
 * @param {number} modified - the die's result after modifiers
 * @param {boolean} countModified - whether modified dice count
 * @returns {boolean}
 */
export function countsTowardCritical(natural, modified, countModified) {
  return natural === SIX || (countModified && modified >= SIX);
}

/**
 * CPR's damage critical for a Full Blast: two or more dice that count.
 *
 * @param {number[]} faces - natural d6 results
 * @param {boolean} aboveSix - whether a die may be raised above 6
 * @param {boolean} countModified - whether modified dice count
 * @returns {boolean}
 */
export function isFullBlastCritical(faces, aboveSix, countModified) {
  const raised = fullBlastFaces(faces, aboveSix);
  const counted = faces.filter((face, i) =>
    countsTowardCritical(face, raised[i], countModified),
  );
  return counted.length >= 2;
}
