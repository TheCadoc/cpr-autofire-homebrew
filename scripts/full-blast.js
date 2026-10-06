import {
  canFullBlast,
  fullBlastBonus,
  fullBlastFaces,
  fullBlastRounds,
} from "./rules.js";

const MODULE_ID = "cpr-autofire-homebrew";
const MOD_ID = `${MODULE_ID}-full-blast`;
const CARD_TEMPLATE = `modules/${MODULE_ID}/templates/full-blast-attack-card.hbs`;
const DAMAGE_CARD_TEMPLATE = `modules/${MODULE_ID}/templates/full-blast-damage-card.hbs`;
const LINE_HELPER = "cprAutofireHomebrewDamageLine";
const MARKER_CLASS = `${MODULE_ID}-full-blast`;
const LINE_CLASS = `${MARKER_CLASS}-line`;
const PROMPT_CLASS = `${MODULE_ID}-prompt`;
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
  Handlebars.registerHelper(LINE_HELPER, insertDamageLine);
  Hooks.on("renderCPRRollDialog", addDamageCheckbox);
  Hooks.on("renderChatMessage", retargetDamageButton);
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
  if (type === "damage") decorateDamage(roll, fullBlast);
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
  // CPR's chat-card block and text classes, so the prompt matches the attack card.
  let content = `<div class="text-center text-normal text-semi">${t("FullBlast.PromptLoaded", { loaded })}</div>`;
  if (!allowed) {
    content += `<div class="text-center text-small">${t("FullBlast.PromptShort", { required })}</div>`;
  }
  return foundry.applications.api.DialogV2.wait({
    classes: [PROMPT_CLASS],
    window: { title: t("FullBlast.PromptTitle", { weapon }) },
    content: `<div class="cpr-block">${content}</div>`,
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

/** Adds the Full Blast bonus as one modifier when CPR computes damage, and shows it on the card. */
function decorateDamage(roll, fullBlast) {
  const baseTitle = roll.rollTitle;
  const baseCard = roll.rollCard;
  const fullBlastTitle = t("FullBlast.Title", { name: baseTitle });
  roll.isFullBlast = fullBlast;
  roll._computeBase = function _computeBase() {
    // CPR's removeMod splices the last mod when the id is absent, so remove by index.
    const index = this.mods.findIndex((mod) => mod.id === MOD_ID);
    if (index !== -1) this.mods.splice(index, 1);
    if (this.rollCard === DAMAGE_CARD_TEMPLATE) this.rollCard = baseCard;
    const base = Object.getPrototypeOf(this)._computeBase.call(this); // caps the multiplier
    if (!(this.isAutofire && this.isFullBlast)) {
      if (this.rollTitle === fullBlastTitle) this.rollTitle = baseTitle;
      return base;
    }
    const bonus = fullBlastBonus(this.faces.length, this.autofireMultiplier);
    if (bonus !== 0) {
      this.mods.push({
        id: MOD_ID,
        value: bonus,
        source: t("FullBlast.ModSource"),
      });
      showDamageLine(this, baseCard, bonus);
    }
    this.rollTitle = fullBlastTitle;
    return base + bonus;
  };
  damageRolls.add(roll);
}

/** Renders the card through the wrapper. Without CPR's card as a partial, keeps the native card. */
function showDamageLine(roll, baseCard, bonus) {
  if (!(baseCard in Handlebars.partials)) return;
  roll.fullBlastBaseCard = baseCard;
  roll.fullBlastLine = t("FullBlast.DamageLine", {
    dice: fullBlastFaces(roll.faces).join(" + "),
    bonus,
  });
  roll.rollCard = DAMAGE_CARD_TEMPLATE;
}

/** Block helper: puts the line first in CPR's dice column, or after the card if the column is gone. */
function insertDamageLine(line, options) {
  const card = document.createElement("template");
  card.innerHTML = options.fn(this);
  const row = document.createElement("div");
  row.className = `text-normal text-semi ${LINE_CLASS}`;
  row.textContent = line;
  const column = card.content.querySelector(".d6-data-div");
  if (column) column.prepend(row);
  else card.content.append(row);
  return new Handlebars.SafeString(card.innerHTML);
}

/** "Full Blast?" after CPR's multiplier row. CPR's submitOnChange saves it onto the roll. */
function addDamageCheckbox(app, html) {
  const roll = app.rollData;
  if (!damageRolls.has(roll) || !roll.isAutofire) return;
  const anchor = html
    .find('input[name="autofireMultiplier"]')
    .closest("li.dialog-item");
  if (!anchor.length) return;
  anchor.after(`<li class="dialog-item flexrow ${MODULE_ID}-row">
    <div class="dialog-item-name text-nowrap">${t("FullBlast.DamageCheckbox")}</div>
    <div class="dialog-item-input text-nowrap">
      <input type="checkbox" name="isFullBlast" data-dtype="Boolean"${roll.isFullBlast ? " checked" : ""} />
    </div>
  </li>`);
}

/** Render-time only: the stored card keeps "autofire", so it rolls Autofire damage if this module is off. */
function retargetDamageButton(message, html) {
  html
    .find(
      `.${MARKER_CLASS} [data-action="rollDamage"][data-attack-type="autofire"]`,
    )
    .attr("data-attack-type", DAMAGE_TYPE)
    .find("[data-tooltip]")
    .attr("data-tooltip", t("FullBlast.DamageTooltip"));
}
