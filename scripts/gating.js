// Rules for gating Full Blast behind the Adjustable Gas Piston. No Foundry globals, so Node can unit-test them.
import { GAS_PISTON_FLAG, MODULE_ID } from "./constants.js";

/**
 * Whether a weapon may Full Blast.
 *
 * @param {boolean} gatingOn - the "Require the Adjustable Gas Piston" setting
 * @param {boolean} hasPiston - whether the weapon has the piston installed
 * @returns {boolean}
 */
export function allowsFullBlast(gatingOn, hasPiston) {
  return !gatingOn || hasPiston;
}

/**
 * Whether any installed upgrade is the Adjustable Gas Piston. Matches this module's flag, never the
 * name, so a renamed or translated copy still counts.
 *
 * @param {Array<{flags?: object}|null|undefined>|undefined} upgrades
 * @returns {boolean}
 */
export function hasGasPiston(upgrades) {
  return (
    Array.isArray(upgrades) &&
    upgrades.some(
      (upgrade) => upgrade?.flags?.[MODULE_ID]?.[GAS_PISTON_FLAG] === true,
    )
  );
}
