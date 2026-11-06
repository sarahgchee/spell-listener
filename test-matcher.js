// Checks that sentences trigger the right spells. Run with: node test-matcher.js
const fs = require("fs");
const path = require("path");
const { createMatcher, createRuleMatcher, findSpellcastingModifier } = require("./matcher.js");
const { castInfo, levelTable } = require("./spell-levels.js");

const source = fs.readFileSync(path.join(__dirname, "spells-data.js"), "utf8");
const data = JSON.parse(source.replace(/^window\.SPELL_DATA = /, "").replace(/;\s*$/, ""));

// [edition, what was heard, spells that should appear]
const heard = [
  ["2014", "I cast fireball at the goblins", ["Fireball"]],
  ["2014", "okay I'm going to use a fire ball", ["Fireball"]],
  ["2014", "can I use magic missile and then misty step", ["Magic Missile", "Misty Step"]],
  ["2014", "delayed blast fireball goes off", ["Delayed Blast Fireball"]],
  ["2014", "I use firebolt", ["Fire Bolt"]],
  ["2014", "fire bolt", ["Fire Bolt"]],
  ["2014", "Tasha's hideous laughter on the ogre", ["Hideous Laughter"]],
  ["2014", "Bigby's hand grabs him", ["Arcane Hand"]],
  ["2014", "eldridge blast", ["Eldritch Blast"]],
  ["2014", "Can I use magic missile and then miss D-step?", ["Magic Missile", "Misty Step"]],
  ["2014", "I cast chillelagy on my staff, and then thaumaturgy.", ["Shillelagh", "Thaumaturgy"]],
  ["2014", "I put on my mage armour", ["Mage Armor"]],
  ["2014", "wind walk not wind wall", ["Wind Walk", "Wind Wall"]],
  ["2014", "I cast shield", ["Shield"]],
  ["2014", "I'll cast a light on my staff", ["Light"]],
  ["2014", "what does the sleep spell do", ["Sleep"]],
  ["2014", "shield of faith on the cleric", ["Shield of Faith"]],
  ["2014", "I'm casting enlarge on the fighter", ["Enlarge/Reduce"]],
  ["2024", "I cast hex on him", ["Hex"]],
  ["2024", "does chromatic orb need a concentration check", ["Chromatic Orb"]],
  // Everyday table talk that should NOT trigger anything.
  ["2014", "I raise my shield and walk into the light", []],
  ["2014", "we should get some sleep and then fly out in the morning", []],
  ["2014", "she's crying because the door won't budge", []],
  ["2014", "I knock on the door and send a message", []],
  ["2014", "can you pass the chips and the dice", []],
  ["2014", "I have no fear of the dark", []],
  ["2014", "my character has a magic weapon", []],
  ["2014", "I attack the goblin with my sword", []],
  // Not in the 2014 free rules, so nothing should show.
  ["2014", "I cast hex on him", []],
];

// [edition, what was typed, spells that should appear]
const typed = [
  ["2014", "shield", ["Shield"]],
  ["2014", "firebal", ["Fireball"]],
  ["2014", "mage", ["Mage Armor", "Mage Hand"]],
  ["2014", "zzzz", []],
];

let failures = 0;
function check(label, list, options) {
  for (const [edition, text, expected] of list) {
    const actual = createMatcher(data[edition]).find(text, options).map((s) => s.name);
    const passed = JSON.stringify(actual) === JSON.stringify(expected);
    if (!passed) failures++;
    console.log(`${passed ? "ok  " : "FAIL"} [${label} ${edition}] "${text}" -> ${JSON.stringify(actual)}`
      + (passed ? "" : `, expected ${JSON.stringify(expected)}`));
  }
}

check("heard", heard, {});
check("typed", typed, { typed: true });

// [edition, what was heard, spells with the level each was cast at]
const castLevels = [
  ["2014", "I cast sleep at level 2", [["Sleep", 2]]],
  ["2014", "I cast sleep at level two", [["Sleep", 2]]],
  ["2014", "I cast sleep at level to", [["Sleep", 2]]],
  ["2014", "I cast sleep at 2nd level", [["Sleep", 2]]],
  ["2014", "I cast sleep at second-level", [["Sleep", 2]]],
  ["2014", "I cast a third level fireball", [["Fireball", 3]]],
  ["2014", "I cast a level 4 fireball", [["Fireball", 4]]],
  ["2014", "fireball using a 5th level spell slot", [["Fireball", 5]]],
  ["2014", "I upcast magic missile to 4", [["Magic Missile", 4]]],
  ["2014", "I cast sleep at level 2 and then fireball at level 4", [["Sleep", 2], ["Fireball", 4]]],
  ["2014", "I cast sleep and then fireball at level 4", [["Sleep", null], ["Fireball", 4]]],
  ["2014", "I cast fireball", [["Fireball", null]]],
  ["2014", "I'm level 3 and I cast fireball", [["Fireball", null]]],
  ["2014", "I cast fireball, I'm level 5", [["Fireball", null]]],
  ["2014", "I'm level 5, fireball", [["Fireball", null]]],
  ["2014", "my character level 7 fireball", [["Fireball", null]]],
  ["2014", "I cast fire bolt at level 11", [["Fire Bolt", 11]]],
];
for (const [edition, text, expected] of castLevels) {
  const actual = createMatcher(data[edition]).mentions(text).map((m) => [m.spell.name, m.level]);
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  if (!passed) failures++;
  console.log(`${passed ? "ok  " : "FAIL"} [level] "${text}" -> ${JSON.stringify(actual)}`
    + (passed ? "" : `, expected ${JSON.stringify(expected)}`));
}

// [edition, spell, cast level, the dice that should show on the card]
const dice = [
  ["2014", "Sleep", 1, ["5d8"]],
  ["2014", "Sleep", 2, ["7d8"]],
  ["2014", "Sleep", 9, ["21d8"]],
  ["2014", "Fireball", 3, ["8d6"]],
  ["2014", "Fireball", 5, ["10d6"]],
  ["2014", "Cure Wounds", 3, ["3d8 + your modifier"]],
  ["2024", "Cure Wounds", 3, ["6d8 + your modifier"]],
  ["2014", "Magic Missile", 1, ["3 darts"]],
  ["2014", "Magic Missile", 3, ["5 darts"]],
  ["2014", "Scorching Ray", 4, ["5 rays"]],
  ["2014", "Flame Blade", 3, ["3d6"]],
  ["2014", "Flame Blade", 4, ["4d6"]],
  ["2024", "Flame Blade", 3, ["4d6 + your modifier"]],
  ["2014", "Ice Storm", 6, ["4d8", "4d6"]],
  ["2014", "Acid Arrow", 4, ["6d4", "4d4"]],
  ["2014", "Disintegrate", 8, ["16d6 + 40"]],
  ["2014", "Fire Bolt", 4, ["1d10"]],
  ["2014", "Fire Bolt", 5, ["2d10"]],
  ["2014", "Fire Bolt", 20, ["4d10"]],
  ["2024", "Eldritch Blast", 11, ["3 beams, each 1d10"]],
];
for (const [edition, name, level, expected] of dice) {
  const spell = data[edition].find((s) => s.name === name);
  const info = castInfo(spell, level);
  const actual = (info.lines || []).map((line) => line.dice);
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  if (!passed) failures++;
  console.log(`${passed ? "ok  " : "FAIL"} [dice ${edition}] ${name} at ${level} -> ${JSON.stringify(actual)}`
    + (passed ? "" : `, expected ${JSON.stringify(expected)}`));
}

// [edition, spell, cast level, the kind of message, words it must contain]
const messages = [
  ["2024", "Sleep", 2, "note", "doesn't change"],
  ["2014", "Fireball", 2, "problem", "level 3 or higher"],
  ["2014", "Fireball", 10, "problem", "up to level 9"],
  ["2014", "Hold Person", 4, "note", "2 levels up"],
  ["2014", "Hold Person", 2, "note", "base level"],
  ["2014", "Finger of Death", 8, "note", "doesn't change"],
  ["2014", "Light", 5, "note", "don't change"],
  ["2014", "Fire Bolt", 21, "problem", "up to 20"],
];
for (const [edition, name, level, kind, words] of messages) {
  const info = castInfo(data[edition].find((s) => s.name === name), level);
  const passed = info.kind === kind && info.message.includes(words);
  if (!passed) failures++;
  console.log(`${passed ? "ok  " : "FAIL"} [message ${edition}] ${name} at ${level} -> ${info.kind}: ${info.message}`);
}

const rulesSource = fs.readFileSync(path.join(__dirname, "rules-data.js"), "utf8");
const ruleData = JSON.parse(rulesSource.replace(/^window\.RULE_DATA = /, "").replace(/;\s*$/, ""));

// [edition, what was heard, rule cards that should appear]
const heardRules = [
  ["2014", "I jump over the pit", ["Jump"]],
  ["2024", "can I jump across the gap", ["Jump"]],
  ["2014", "I'm jumping onto the table", ["Jump"]],
  ["2014", "I dash to the door", ["Dash"]],
  ["2014", "I want to disengage and then dodge", ["Disengage", "Dodge"]],
  ["2014", "I grapple the goblin", ["Grapple"]],
  ["2024", "I shove him off the ledge", ["Shove"]],
  ["2014", "does that provoke an opportunity attack", ["Opportunity Attack"]],
  ["2014", "he gets an attack of opportunity", ["Opportunity Attack"]],
  ["2014", "that's difficult terrain", ["Difficult Terrain"]],
  ["2014", "we're fighting in darkness", ["Darkness"]],
  ["2024", "what does darkness do", ["Darkness"]],
  ["2014", "it's a bit dark in here", []],
  ["2014", "I take the help action", ["Help"]],
  ["2014", "I use my action to hide", ["Hide"]],
  ["2024", "I take the search action", ["Search"]],
  ["2014", "I ready an action", ["Ready"]],
  ["2024", "I take the magic action", ["Magic"]],
  ["2024", "I take the study action", ["Study"]],
  ["2014", "I take the attack action and then dash", ["Attack", "Dash"]],
  ["2014", "the goblin is now prone", ["Prone"]],
  ["2024", "am I still poisoned", ["Poisoned"]],
  ["2014", "the ogre is grappled and frightened", ["Grappled", "Frightened"]],
  // Everyday table talk that should NOT bring up a card.
  ["2014", "are you ready", []],
  ["2014", "can you help me with this", []],
  ["2014", "I want to search the room and hide behind the door", []],
  ["2014", "I attack the goblin with my sword", []],
  ["2014", "that's a magic sword", []],
  ["2014", "we should study the map", []],
  ["2014", "I'm so tired today", []],
  // Rules that only exist in one rule set.
  ["2014", "I take the study action", []],
  ["2024", "I use an object", []],
];
for (const [edition, text, expected] of heardRules) {
  const actual = createRuleMatcher(ruleData[edition]).find(text).map((r) => r.name);
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  if (!passed) failures++;
  console.log(`${passed ? "ok  " : "FAIL"} [rule ${edition}] "${text}" -> ${JSON.stringify(actual)}`
    + (passed ? "" : `, expected ${JSON.stringify(expected)}`));
}

// Typing a word finds its rule, without needing the word "action".
for (const [text, expected] of [["help", "Help"], ["jump", "Jump"], ["prone", "Prone"], ["Two-Weapon Fighting", "Two-Weapon Fighting"]]) {
  const actual = createRuleMatcher(ruleData["2014"]).find(text, { typed: true }).map((r) => r.name);
  if (actual[0] !== expected) {
    failures++;
    console.log(`FAIL [typed rule] "${text}" -> ${JSON.stringify(actual)}`);
  }
}

// The Jump rule and the Jump spell are told apart by a casting word.
const spells2014 = createMatcher(data["2014"]);
for (const [text, wantsSpell] of [["I cast jump on the fighter", true], ["the jump spell", true], ["I jump over the pit", false]]) {
  const hasSpell = spells2014.find(text).some((s) => s.name === "Jump");
  if (hasSpell !== wantsSpell) {
    failures++;
    console.log(`FAIL [jump spell] "${text}" -> spell found: ${hasSpell}`);
  }
}

// The Darkness rule and the Darkness spell are told apart the same way.
for (const [text, wantsSpell] of [["I cast darkness", true], ["the darkness spell", true], ["we're fighting in darkness", false]]) {
  const hasSpell = spells2014.find(text).some((s) => s.name === "Darkness");
  if (hasSpell !== wantsSpell) {
    failures++;
    console.log(`FAIL [darkness spell] "${text}" -> spell found: ${hasSpell}`);
  }
}
for (const edition of ["2014", "2024"]) {
  const card = ruleData[edition].find((r) => r.name === "Darkness").desc.join(" ");
  if (!/blinded/i.test(card) || !/heavily obscured/i.test(card)) {
    failures++;
    console.log(`FAIL [darkness card ${edition}] is missing its effect`);
  }
}

// Each rule set has the rules it should, and every card has real text.
const expectedRules = {
  "2014": ["Attack", "Dash", "Disengage", "Dodge", "Help", "Hide", "Ready", "Search", "Use an Object", "Jump", "Difficult Terrain", "Opportunity Attack", "Two-Weapon Fighting", "Grapple", "Shove", "Prone", "Exhaustion"],
  "2024": ["Attack", "Dash", "Disengage", "Dodge", "Help", "Hide", "Influence", "Magic", "Ready", "Search", "Study", "Utilize", "Jump", "Difficult Terrain", "Opportunity Attack", "Grapple", "Shove", "Prone", "Exhaustion"],
};
for (const edition of ["2014", "2024"]) {
  for (const name of expectedRules[edition]) {
    const rule = ruleData[edition].find((r) => r.name === name);
    if (!rule || rule.desc.join(" ").length < 20) {
      failures++;
      console.log(`FAIL [rule text ${edition}] ${name} is missing or too short`);
    }
  }
}

// [what was said, the spellcasting modifier it gives, or null for none]
const modifierSentences = [
  ["I have a spell casting ability modifier of two. Add that to my spiritual weapon for the damage. What's my damage?", 2],
  ["I have a spellcasting ability modifier of 2.", 2],
  ["My spell-casting modifier is three", 3],
  ["my spellcasting modifier is +4", 4],
  ["I have a +3 spellcasting modifier", 3],
  ["a 2 spell casting modifier", 2],
  ["my spell mod is 5", 5],
  ["my modifier is 2", 2],
  ["my spellcasting modifier is minus one", -1],
  ["my spellcasting modifier is -1", -1],
  ["spell casting ability modifier of zero", 0],
  ["my spellcasting modifier is to.", 2],
  ["my spellcasting modifier is for", 4],
  // These must not change the modifier.
  ["Add my spellcasting modifier to my spiritual weapon", null],
  ["Add my spellcasting modifier for the damage", null],
  ["my spellcasting modifier is for healing", null],
  ["what's my spellcasting modifier", null],
  ["my strength modifier is 2", null],
  ["my dexterity modifier is 4", null],
  ["my spell attack modifier is 5", null],
  ["my spell save DC is 13", null],
  ["my spellcasting modifier is 99", null],
  ["my spellcasting modifier is 2d6", null],
  ["I cast fireball at level 2", null],
];
for (const [text, expected] of modifierSentences) {
  const actual = findSpellcastingModifier(text);
  const passed = actual === expected;
  if (!passed) failures++;
  console.log(`${passed ? "ok  " : "FAIL"} [modifier] "${text}" -> ${actual}` + (passed ? "" : `, expected ${expected}`));
}

// [edition, spell, cast level, modifier, dice, words in the explanation]
const withModifier = [
  ["2014", "Spiritual Weapon", 2, 2, "1d8 + 2", "then add 2 (your modifier)"],
  ["2024", "Spiritual Weapon", 3, 2, "2d8 + 2", "then add 2 (your modifier)"],
  ["2014", "Spiritual Weapon", 4, 3, "2d8 + 3", "1d8 base"],
  ["2014", "Cure Wounds", 3, -1, "3d8 - 1", "then subtract 1 (your modifier)"],
  ["2014", "Cure Wounds", 3, 0, "3d8", "Roll 3 eight-sided dice"],
  ["2014", "Cure Wounds", 1, null, "1d8 + your modifier", "then add your modifier"],
  ["2014", "Disintegrate", 6, 2, "10d6 + 40", "then add 40"],
  ["2014", "Fireball", 3, 2, "8d6", "Roll 8 six-sided dice"],
];
for (const [edition, name, level, modifier, expectedDice, words] of withModifier) {
  const line = castInfo(data[edition].find((s) => s.name === name), level, modifier).lines[0];
  const passed = line.dice === expectedDice && line.detail.includes(words);
  if (!passed) failures++;
  console.log(`${passed ? "ok  " : "FAIL"} [with modifier ${edition}] ${name} at ${level}, modifier ${modifier} -> ${line.dice} | ${line.detail}`);
}
const weaponTable = levelTable(data["2014"].find((s) => s.name === "Spiritual Weapon"), 2);
if (weaponTable.rows[0].cells[0] !== "1d8 + 2") {
  failures++;
  console.log(`FAIL [table] ${weaponTable.rows[0].cells[0]}`);
}

// Every spell at every level must give a real answer, with no broken dice.
for (const edition of ["2014", "2024"]) {
  for (const spell of data[edition]) {
    for (let level = 1; level <= 20; level++) {
      const info = castInfo(spell, level);
      const text = JSON.stringify(info);
      if (/NaN|undefined|null/.test(text) || !["dice", "note", "problem"].includes(info.kind)) {
        failures++;
        console.log(`FAIL [every level ${edition}] ${spell.name} at ${level}: ${text}`);
      }
    }
  }
}

// Every spell name must be findable when said with a casting word.
for (const edition of ["2014", "2024"]) {
  const matcher = createMatcher(data[edition]);
  for (const spell of data[edition]) {
    const result = matcher.find(`I cast ${spell.name}`);
    if (!result.includes(spell)) {
      failures++;
      console.log(`FAIL [every name ${edition}] ${spell.name} -> ${JSON.stringify(result.map((s) => s.name))}`);
    }
  }
}

// Your own spells, if my-spells.js exists. It isn't in Git, so it may not.
const mySpellsPath = path.join(__dirname, "my-spells.js");
if (fs.existsSync(mySpellsPath)) {
  const sandbox = { window: {} };
  require("vm").runInNewContext(fs.readFileSync(mySpellsPath, "utf8"), sandbox);
  const mySpells = sandbox.window.MY_SPELLS;
  const matcher = createMatcher([...data["2014"], ...mySpells]);
  const heardMine = [
    ["I cast silvery barbs on the ogre", "Silvery Barbs"],
    ["silvery bars", "Silvery Barbs"],
    ["silver barbs", "Silvery Barbs"],
    ["silvery barb", "Silvery Barbs"],
  ];
  for (const [text, expected] of heardMine) {
    const actual = matcher.find(text).map((s) => s.name);
    const passed = actual.length === 1 && actual[0] === expected;
    if (!passed) failures++;
    console.log(`${passed ? "ok  " : "FAIL"} [my spells] "${text}" -> ${JSON.stringify(actual)}`);
  }
  for (const spell of mySpells) {
    const info = castInfo(spell, 3);
    if (!info.message || !spell.desc.length) {
      failures++;
      console.log(`FAIL [my spells] ${spell.name} is missing details`);
    }
  }
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
