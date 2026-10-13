# Autofire Compendium items design spec (follow-up)

- Date: 2026-10-11
- Status: draft; decisions open. Starts after the Gas Piston gating PR, which creates the compendium.
- Module: `cpr-autofire-homebrew` (this repo)
- Depends on: `2026-10-11-gas-piston-gating-design.md` (pack, build step, item flag convention)

## 1. Goal

Add the other items from _Heavy Armor Lizard's Autofire Compendium_ to the module's "Autofire Homebrew Items" pack, automating each one only where that is cheap and reliable. Descriptions are written in our words (go-public spec G2).

## 2. Credit

The source's byline is Heavy Armor Lizard (posted by u/Infernox-Ratchet, per Lukasz). It also credits Fershte and Corgopolis "for some items" without saying which. The README credits all three. Ask the author which items are whose, and whether shipping them is welcome.

## 3. Item inventory

Automation tiers:

- **Data**: the item and its description only; CPR's own fields or modifiers carry any number. Needs CPR's upgrade modifiers confirmed (**verify**).
- **Wrapper**: fits a wrapper this module already has.
- **Code**: needs new code.
- **Table**: description only; the table enforces it.

| #  | Item                     | Source section       | CPR item type (proposed)          | Effect, in our words                                                                                     | Tier              | Notes                                                                                           | Decision |
| -- | ------------------------ | -------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------- | -------- |
| I1 | Muzzle Brake             | Weapon Attachments   | `itemUpgrade` (weapon)            | +1 to Autofire checks. Conflicts with other muzzle attachments such as silencers. 500eb.                 | Data              | Needs a modifier limited to the Autofire skill (**verify**). Conflict is description-only.      |          |
| I2 | Smartlink Scope          | Weapon Attachments   | `itemUpgrade` (weapon)            | +1 to attacks while connected by Subdermal Grip or Interface Plug. One hour to fit. Conflicts with Smartgun Link. 1,000eb. | Data or Table     | Connection requirement is table-enforced.                                                       |          |
| I3 | Shotgun Rechamber        | Weapon Attachments   | `itemUpgrade` (weapon), 0 slots   | Shell damage +1d6, up to 5d6. Fitting is a DV17 Weaponstech check; permanent. 300eb.                     | Code              | Changes shell damage dice. Interacts with Pneuma's shell workflow (**verify**).                 |          |
| I4 | Militech Shock Absorber  | Cyberware            | `cyberware` option                | +1 to Autofire checks with a weapon in or held by that cyberarm. 1,000eb, Humanity Loss 7 (2d6).         | Data or Code      | "Held by this arm" is hard to automate; Table may be enough.                                    |          |
| I5 | Smartgun 2045            | Tech Inventions      | `itemUpgrade` (weapon)            | Raises weapon quality one step and adds a slotless Smartgun Link. Upgrade DV21, second cost 500eb.       | Code              | Changing quality is a data change on the weapon, not a modifier.                                |          |
| I6 | Optimized Autosear       | Tech Inventions      | `itemUpgrade` on a Pistol Autosear | Autofire and Suppressive Fire cost 6 rounds on Medium Pistols and 7 on Heavy or Very Heavy Pistols. Upgrade DV17, 500eb. | Wrapper           | Extends the `loadMixins` / `bulletConsumption` wrapper. Must compose with Full Blast's doubling (12 or 14). |          |
| I7 | Quick Draw Digits        | Tech Inventions      | `itemUpgrade` on Quick Digits     | +1 to Held Actions with a weapon in that hand. Upgrade DV21, 500eb.                                      | Table             | No Held Action hook to automate against.                                                        |          |
| I8 | Optimized Smartgun Link  | Tech Inventions      | `itemUpgrade` on Smartgun Link    | The link takes 1 slot instead of 2. Upgrade DV21, 500eb.                                                 | Code or Table     | Changes another upgrade's slot size.                                                            |          |
| I9 | Higher Capacity Drum     | Tech Inventions      | `itemUpgrade` on Drum Magazine    | +20 rounds on the drum, or on the weapon's own capacity when larger or a machine gun. Upgrade DV21, 500eb. | Code              | Changes magazine max. Pneuma reads magazine data (`weapon-ammo.ts`).                            |          |

House rule changes to official items (not new items):

| #   | Change                    | Effect, in our words                                                                                                     | Concern                                                                                  | Decision |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------- |
| H1  | Pistol Autosear change    | Slotless; grants Autofire 3 (4 on Excellent Quality or already-Autofire pistols) and Suppressive Fire; 6 or 7 rounds per Autofire by pistol size. | Modifies an official RTG item. Ship as behavior only, never a copy of the official item text. Overlaps I6. |          |
| H2  | Tsunami Arms Helix change | Autofire-only rifle with a 40-round magazine and Autofire maximum 5, using the Assault Rifle DV table.                   | Same RTG concern. Also interacts with the DV tables spec.                                | |

## 4. Decisions

| #  | Decision                     | Proposed                                                                                                                        | Status |
| -- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| C1 | First batch                  | Data and Table tier items only (I1, I2, I4, I7), plus I6 because it reuses an existing wrapper.                                 | Open   |
| C2 | Code-tier items              | One PR per item, each behind its own world setting, default off.                                                                | Open   |
| C3 | H1 and H2                    | Defer. Decide after reviewing RTG's Homebrew Content Policy for changes to official items.                                      | Open   |
| C4 | Invention DV and costs       | Stated in descriptions; not enforced.                                                                                           | Open   |
| C5 | Flag convention              | Every item gets `flags.cpr-autofire-homebrew.item = "<slug>"`, so code detects items by flag, as the Gas Piston does.            | Open   |

## 5. Outstanding questions

1. Can CPR v0.92.4 upgrade modifiers target a single skill such as Autofire (I1, I4)?
2. Should I6 and H1 both exist, or is one the alternative to the other, as the source suggests?
3. Author permission and per-item credit (section 2).
4. Is a pack of mostly description-only items useful to the table, or should the first batch wait for automation?

## 6. Out of scope

- Enforcing invention checks, costs, or Humanity Loss.
- Items from other sources.
