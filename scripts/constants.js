// Identifiers and strings shared by the Full Blast and Pneuma integration scripts.

export const MODULE_ID = "cpr-autofire-homebrew";

/** Class on the wrapper of every Full Blast chat card this module renders. */
export const MARKER_CLASS = `${MODULE_ID}-full-blast`;

/** Localizes `CPR_AUTOFIRE_HOMEBREW.<key>` with `data` formatted in. */
export const t = (key, data) =>
  game.i18n.format(`CPR_AUTOFIRE_HOMEBREW.${key}`, data);
