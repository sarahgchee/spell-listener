// Works out what to roll when a spell is cast at a given level.

(function () {
  const MAX_SLOT = 9;
  const MAX_CHARACTER_LEVEL = 20;
  const DIE_NAMES = { 4: "four", 6: "six", 8: "eight", 10: "ten", 12: "twelve", 20: "twenty", 100: "hundred" };
  const CANTRIP_RANGES = { 1: "1-4", 5: "5-10", 11: "11-16", 17: "17-20" };
  const MODIFIER = "your modifier";

  function addDice(base, step, times) {
    const [count, size] = base.split("d").map(Number);
    return `${count + step.split("d").map(Number)[0] * times}d${size}`;
  }

  // The modifier isn't known until you say it, so it can be null.
  function bonusValue(roll, modifier) {
    if (roll.bonus !== MODIFIER) return roll.bonus ? Number(roll.bonus) : 0;
    return modifier === null || modifier === undefined ? null : modifier;
  }

  function withBonus(dice, roll, modifier) {
    if (!roll.bonus) return dice;
    const value = bonusValue(roll, modifier);
    if (value === null) return `${dice} + ${MODIFIER}`;
    if (value === 0) return dice;
    return value > 0 ? `${dice} + ${value}` : `${dice} - ${-value}`;
  }

  function bonusDetail(roll, modifier) {
    if (!roll.bonus) return "";
    const value = bonusValue(roll, modifier);
    if (value === null) return `, then add ${MODIFIER}`;
    if (value === 0) return "";
    const name = roll.bonus === MODIFIER ? " (your modifier)" : "";
    return value > 0 ? `, then add ${value}${name}` : `, then subtract ${-value}${name}`;
  }

  function usesModifier(spell) {
    return Boolean(spell.scaling && spell.scaling.rolls && spell.scaling.rolls.some((roll) => roll.bonus === MODIFIER));
  }

  function diceAt(roll, stepsUp) {
    return addDice(roll.base, roll.step || "0d0", roll.step ? Math.floor(stepsUp / (roll.per || 1)) : 0);
  }

  function rollText(roll, stepsUp, modifier) {
    if (roll.count) return `${roll.count + stepsUp} × ${roll.each}`;
    return withBonus(diceAt(roll, stepsUp), roll, modifier);
  }

  // "7d8" becomes "7 eight-sided dice", for anyone still learning dice names.
  function plainDice(text) {
    const match = /^(\d+)d(\d+)/.exec(text);
    if (!match) return "";
    const noun = match[1] === "1" ? "die" : "dice";
    return `${match[1]} ${DIE_NAMES[match[2]] || match[2]}-sided ${noun}`;
  }

  function levelsUp(count) {
    return count === 1 ? "1 level up" : `${count} levels up`;
  }

  function rollLine(roll, stepsUp, modifier) {
    if (roll.count) {
      const total = roll.count + stepsUp;
      return {
        label: roll.label,
        dice: `${total} ${roll.noun}s`,
        detail: `Roll ${roll.each} for each one`,
      };
    }
    const dice = rollText(roll, stepsUp, modifier);
    const times = roll.step ? Math.floor(stepsUp / (roll.per || 1)) : 0;
    let detail = `Roll ${plainDice(dice)}${bonusDetail(roll, modifier)}`;
    if (!roll.step && stepsUp > 0) detail += ". This part doesn't change";
    if (times > 0) detail += `: ${roll.base} base + ${addDice(roll.step, roll.step, times - 1)} for ${levelsUp(stepsUp)}`;
    else if (roll.step && stepsUp > 0) detail += `. It grows every ${roll.per} levels, so nothing changes yet`;
    return { label: roll.label, dice, detail };
  }

  // A table of the dice at every level, or null if the spell has no such dice.
  function levelTable(spell, modifier) {
    const scaling = spell.scaling;
    if (!scaling) return null;
    if (scaling.type === "cantrip") {
      return {
        heading: "Character level",
        columns: [scaling.label],
        rows: Object.entries(scaling.tiers)
          .map(([level, value]) => ({ level: Number(level), name: CANTRIP_RANGES[level], cells: [value] }))
          .sort((a, b) => a.level - b.level),
      };
    }
    const rows = [];
    for (let level = spell.level; level <= MAX_SLOT; level++) {
      rows.push({
        level,
        name: String(level),
        cells: scaling.rolls.map((roll) => rollText(roll, level - spell.level, modifier)),
      });
    }
    return { heading: "Slot level", columns: scaling.rolls.map((roll) => roll.label), rows };
  }

  // Which row of the table a cast level belongs to.
  function activeRow(table, level) {
    return table.rows.reduce((active, row) => (row.level <= level ? row.level : active), null);
  }

  // Everything the card needs to say about casting at this level.
  function castInfo(spell, level, modifier) {
    if (spell.level === 0) {
      if (level > MAX_CHARACTER_LEVEL) {
        return { kind: "problem", message: `Character levels only go up to ${MAX_CHARACTER_LEVEL}.` };
      }
      const tiers = spell.scaling && spell.scaling.tiers;
      if (!tiers) {
        return { kind: "note", title: `At character level ${level}`, message: "This cantrip's dice don't change as you level up." };
      }
      const tier = Object.keys(tiers).map(Number).filter((t) => t <= level).pop();
      const value = tiers[tier];
      return {
        kind: "dice",
        title: `At character level ${level}`,
        note: "Cantrips grow with your character level, not a spell slot.",
        lines: [{ label: spell.scaling.label, dice: value, detail: plainDice(value) ? `Roll ${plainDice(value)}` : "" }],
      };
    }

    if (level > MAX_SLOT) return { kind: "problem", message: `Spell slots only go up to level ${MAX_SLOT}.` };
    if (level < spell.level) {
      return { kind: "problem", message: `${spell.name} is a level ${spell.level} spell, so it needs a slot of level ${spell.level} or higher.` };
    }

    const stepsUp = level - spell.level;
    const title = `Cast at level ${level}`;
    if (spell.scaling) {
      return { kind: "dice", title, lines: spell.scaling.rolls.map((roll) => rollLine(roll, stepsUp, modifier)) };
    }
    if (spell.higherLevel.length) {
      const message = stepsUp === 0
        ? "This is its base level, so nothing extra applies."
        : `That's ${levelsUp(stepsUp)} from its base level. See “At higher levels” below for what changes.`;
      return { kind: "note", title, message };
    }
    return { kind: "note", title, message: "Casting this spell at a higher level doesn't change it." };
  }

  const api = { levelTable, activeRow, castInfo, usesModifier };
  if (typeof module !== "undefined") module.exports = api;
  else window.SpellLevels = api;
})();
