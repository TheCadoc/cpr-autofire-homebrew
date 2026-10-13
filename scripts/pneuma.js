import { MARKER_CLASS, MODULE_ID, t } from "./constants.js";
import {
  fullBlastDamageTitle,
  hasClassToken,
  isPneumaFullBlast,
  shouldWarnPneuma,
} from "./pneuma-match.js";

const PNEUMA_ID = "pneuma-combattools";
const PNEUMA_VERIFIED = "0.9.16";
/** Pneuma's own GM reply timeout, so its damage claim has finished or failed by then. */
const PENDING_MS = 15000;
const WARNED_SETTING = "pneumaWarnedVersion";
const DAMAGE_BUTTON = '[data-action="pneumaRollDamage"]';
const TITLED = `data-${MODULE_ID}-titled`;

/** The last click on a Full Blast exchange's damage button, until a damage roll takes it. */
let pending = null;

/** Wires the Pneuma's Combat Tools integration when Pneuma is active. Must run in the init hook. */
export function registerPneuma() {
  if (!game.modules.get(PNEUMA_ID)?.active) return;
  game.settings.register(MODULE_ID, WARNED_SETTING, {
    scope: "world",
    config: false,
    type: String,
    default: "",
  });
  Hooks.on("renderChatMessage", decorateExchange);
  Hooks.once("ready", warnUnverifiedPneuma);
}

/** Pneuma's stored exchange. getProperty, because getFlag throws for an inactive scope. */
function exchangeOf(message) {
  return foundry.utils.getProperty(
    message ?? {},
    `flags.${PNEUMA_ID}.exchange`,
  );
}

/** Render-time only: the title, the damage tooltip, and the click capture on Full Blast exchanges. */
function decorateExchange(message, html) {
  const root = html[0];
  if (!root || !hasClassToken(exchangeOf(message)?.html, MARKER_CLASS)) return;
  for (const name of root.querySelectorAll(
    `.pneuma-attack-name:not([${TITLED}])`,
  )) {
    const title = t("FullBlast.Title", { name: name.textContent.trim() });
    name.textContent = title;
    name.title = title;
    name.setAttribute(TITLED, "");
  }
  const button = root.querySelector(DAMAGE_BUTTON);
  if (button) {
    button.title = fullBlastDamageTitle(
      button.title,
      t("FullBlast.DamageTooltip"),
    );
  }
  // Capture runs before Pneuma's own click handler on the button.
  root.addEventListener(
    "click",
    (event) => {
      const target = event.target.closest?.(DAMAGE_BUTTON);
      if (target && !target.disabled) {
        pending = { messageId: message.id, expiresAt: Date.now() + PENDING_MS };
      }
    },
    { capture: true },
  );
}

/**
 * Takes the pending click and reports whether it makes this damage roll Full Blast.
 * Every damage roll calls this, so a stale click never carries over.
 *
 * @param {Item} item - the item creating the damage roll
 * @param {Actor} actor - the actor passed to createRoll
 * @returns {boolean}
 */
export function takePneumaFullBlast(item, actor) {
  const current = pending;
  pending = null;
  if (!current) return false;
  const exchange = exchangeOf(game.messages.get(current.messageId));
  return isPneumaFullBlast({
    pending: current,
    now: Date.now(),
    exchange,
    itemId: item.id,
    actorUuid: actor?.uuid,
    attackerActorUuid: attackerActorUuid(exchange),
    markerClass: MARKER_CLASS,
  });
}

/** The actor of the exchange's attacker token, or undefined when it cannot be resolved. */
function attackerActorUuid(exchange) {
  try {
    return fromUuidSync(exchange?.attacker)?.actor?.uuid;
  } catch {
    return undefined;
  }
}

/** One permanent warning per Pneuma version this module was not verified with. */
async function warnUnverifiedPneuma() {
  if (!game.user.isGM) return;
  const version = game.modules.get(PNEUMA_ID)?.version;
  const lastWarned = game.settings.get(MODULE_ID, WARNED_SETTING);
  if (!shouldWarnPneuma(version, PNEUMA_VERIFIED, lastWarned)) return;
  ui.notifications.warn(
    t("Errors.PneumaUnverified", { version, verified: PNEUMA_VERIFIED }),
    { permanent: true },
  );
  await game.settings.set(MODULE_ID, WARNED_SETTING, version);
}
