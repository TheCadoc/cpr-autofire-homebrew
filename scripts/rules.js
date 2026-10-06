// Full Blast rule math. No Foundry globals, so Node can unit-test it.

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
 * Damage Full Blast adds: +1 per die, multiplied. CPR multiplies the dice and
 * adds other modifiers afterward, so this equals raising each die by 1 first.
 *
 * @param {number} diceCount
 * @param {number} multiplier - CPR's capped Autofire multiplier
 * @returns {number}
 */
export function fullBlastBonus(diceCount, multiplier) {
  return diceCount * multiplier;
}

/**
 * Die values Full Blast counts: each natural face plus 1. For display only;
 * crits and die images keep the natural faces.
 *
 * @param {number[]} faces - natural d6 results
 * @returns {number[]}
 */
export function fullBlastFaces(faces) {
  return faces.map((face) => face + 1);
}
