// Checks that sentences trigger the right spells. Run with: node test-matcher.js
const fs = require("fs");
const path = require("path");
const { createMatcher } = require("./matcher.js");

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

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
