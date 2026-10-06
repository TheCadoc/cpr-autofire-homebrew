import { canFullBlast, fullBlastBonus, fullBlastRounds } from "./rules.js";

const MODULE_ID = "cpr-autofire-homebrew";
const MOD_ID = `${MODULE_ID}-full-blast`;
const CARD_TEMPLATE = `modules/${MODULE_ID}/templates/full-blast-attack-card.hbs`;
const MARKER_CLASS = `${MODULE_ID}-full-blast`;
const DAMAGE_TYPE = "fullblast";
const ITEM = "CONFIG.Item.documentClass.prototype";

/** Damage rolls this module decorated. Only these get the dialog checkbox. */
const damageRolls = new WeakSet();
/** Our bulletConsumption replacements, so none is ever wrapped twice. */
const doubled = new WeakSet();

const t = (key, data) => game.i18n.format(`CPR_AUTOFIRE_HOMEBREW.${key}`, data);

/** Wires Full Blast into Cyberpunk RED. Must run in the init hook. */
export function register() {
  if (
    !globalThis.libWrapper ||
    typeof CONFIG.Item.documentClass?.prototype?.createRoll !== "function"
  ) {
    console.error(
      `${MODULE_ID} | libWrapper or the Cyberpunk RED item class is missing`,
    );
    Hooks.once("ready", () => ui.notifications.error(t("Errors.Unavailable")));
    return;
  }
  libWrapper.register(
    MODULE_ID,
    `${ITEM}.createRoll`,
    wrapCreateRoll,
    "WRAPPER",
  );
  libWrapper.register(
    MODULE_ID,
    `${ITEM}.loadMixins`,
    wrapLoadMixins,
    "WRAPPER",
  );
}

function wrapCreateRoll(wrapped, type, actor, extraData, ...rest) {
  const fullBlast = type === "damage" && extraData?.damageType === DAMAGE_TYPE;
  if (fullBlast) extraData = { ...extraData, damageType: "autofire" };
  const roll = wrapped(type, actor, extraData, ...rest);
  if (
    type === "autofire" &&
    this.system.isRanged &&
    typeof this.bulletConsumption === "function"
  ) {
    decorateAttack(roll, this);
  }
  return roll;
}

/** Puts the Full Blast prompt in front of CPR's attack dialog for this roll only. */
function decorateAttack(roll, item) {
  roll.handleRollDialog = async function handleRollDialog(event, ...args) {
    // Ammo math uses the item that created the roll, whatever a caller passes.
    const standard = item.bulletConsumption(this);
    const loaded = Number(item.system.magazine?.value) || 0;
    const choice = await promptFullBlast(item.name, loaded, standard);
    if (!choice) return false;
    if (choice === "fullBlast") {
      this.isFullBlast = true;
      this.fullBlastBaseCard = this.rollCard;
      await getTemplate(this.fullBlastBaseCard); // registers it as a partial
      this.rollCard = CARD_TEMPLATE;
      this.rollTitle = t("FullBlast.Title", { name: this.rollTitle });
    }
    // Resolved at call time so other modules' prototype wrappers still run.
    return Object.getPrototypeOf(this).handleRollDialog.call(
      this,
      event,
      ...args,
    );
  };
}

/** @returns {Promise<"fullBlast"|"standard"|null>} null when closed */
function promptFullBlast(weapon, loaded, standard) {
  const required = fullBlastRounds(standard);
  const allowed = canFullBlast(loaded, standard);
  const lines = [t("FullBlast.PromptLoaded", { loaded })];
  if (!allowed) lines.push(t("FullBlast.PromptShort", { required }));
  return foundry.applications.api.DialogV2.wait({
    window: { title: t("FullBlast.PromptTitle", { weapon }) },
    content: lines.map((line) => `<p>${line}</p>`).join(""),
    buttons: [
      {
        action: "fullBlast",
        label: t("FullBlast.ButtonFullBlast", { rounds: required }),
      },
      {
        action: "standard",
        label: t("FullBlast.ButtonStandard", { rounds: standard }),
        default: true,
      },
    ],
    rejectClose: false,
    render: (event, element) => {
      if (!allowed) {
        element.querySelector('[data-action="fullBlast"]').disabled = true;
      }
    },
  });
}

/** CPR recreates bulletConsumption on every loadMixins, so re-double it after each call. */
function wrapLoadMixins(wrapped, ...args) {
  const result = wrapped(...args);
  const native = this.bulletConsumption;
  if (typeof native === "function" && !doubled.has(native)) {
    const bulletConsumption = function bulletConsumption(roll) {
      const rounds = native.call(this, roll);
      return roll?.isFullBlast ? fullBlastRounds(rounds) : rounds;
    };
    doubled.add(bulletConsumption);
    this.bulletConsumption = bulletConsumption;
  }
  return result;
}
