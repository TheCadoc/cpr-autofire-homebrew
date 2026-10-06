// Rules for matching Pneuma's Combat Tools exchanges. No Foundry globals, so Node can unit-test them.

/** A class attribute value, double- or single-quoted. The leading space excludes `data-class`. */
const CLASS_ATTRIBUTE = /\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

/**
 * Whether an HTML string has an element whose class list contains `token` exactly.
 *
 * @param {string|undefined} html
 * @param {string} token
 * @returns {boolean}
 */
export function hasClassToken(html, token) {
  if (typeof html !== "string") return false;
  for (const match of html.matchAll(CLASS_ATTRIBUTE)) {
    if ((match[1] ?? match[2]).split(/\s+/).includes(token)) return true;
  }
  return false;
}

/**
 * Whether a pending click on Pneuma's damage button flags this damage roll as Full Blast.
 *
 * @param {object} args
 * @param {{messageId: string, expiresAt: number}|null} args.pending
 * @param {number} args.now - milliseconds since the epoch
 * @param {object|undefined} args.exchange - Pneuma's stored exchange for `pending.messageId`
 * @param {string} args.itemId - the item creating the damage roll
 * @param {string|undefined} args.actorUuid - the actor passed to `createRoll`
 * @param {string|undefined} args.attackerActorUuid - the actor of the token at `exchange.attacker`
 * @param {string} args.markerClass
 * @returns {boolean}
 */
export function isPneumaFullBlast({
  pending,
  now,
  exchange,
  itemId,
  actorUuid,
  attackerActorUuid,
  markerClass,
}) {
  return (
    !!pending &&
    now <= pending.expiresAt &&
    hasClassToken(exchange?.html, markerClass) &&
    exchange.weaponId === itemId &&
    typeof actorUuid === "string" &&
    actorUuid !== "" &&
    attackerActorUuid === actorUuid
  );
}

/**
 * Whether to warn the GM that the installed Pneuma version was not verified.
 *
 * @param {string|undefined} version - the installed Pneuma version
 * @param {string} verified - the version this module was verified with
 * @param {string} lastWarned - the version the GM was last warned about
 * @returns {boolean}
 */
export function shouldWarnPneuma(version, verified, lastWarned) {
  return (
    typeof version === "string" &&
    version !== verified &&
    version !== lastWarned
  );
}
