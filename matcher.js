// Finds spell names inside a sentence of spoken text.
// This is the file to edit when you want to tune what triggers a spell card.

(function () {
  // Spells that are also everyday words. These only count when you say a
  // casting word nearby ("I cast shield", "the light spell"), so "I raise my
  // shield" doesn't pop up a card. Add a spell here if it triggers too often.
  const EVERYDAY_WORDS = [
    "aid", "alarm", "awaken", "bane", "blight", "blink", "blur", "bless", "clone",
    "command", "commune", "compulsion", "confusion", "contagion", "contingency",
    "creation", "darkness", "daylight", "divination", "dream", "earthquake",
    "entangle", "fabricate", "fear", "find traps", "fly", "gate", "grease",
    "guidance", "hallow", "harm", "haste", "heal", "hex", "identify",
    "imprisonment", "invisibility", "jump", "knock", "levitate", "light",
    "magic circle", "magic weapon", "major image", "maze", "mending", "message",
    "mislead", "reduce", "regenerate", "resistance", "resurrection", "sanctuary",
    "scrying", "seeming", "sending", "shatter", "shield", "silence", "sleep", "slow",
    "suggestion", "sympathy", "symbol", "teleport", "tongues", "tsunami", "web",
    "weird", "wish",
  ];

  // Words that show someone is talking about casting a spell.
  const CASTING_WORDS = new Set(["cast", "casts", "casting", "casted", "spell", "spells", "cantrip"]);

  // Other things people say for a spell, including common mishearings.
  // Format: "what is heard": "Spell name in the rules".
  const ALIASES = {
    "eldridge blast": "Eldritch Blast",
    "aldrich blast": "Eldritch Blast",
    "bigbys hand": "Arcane Hand",
    "mordenkainens sword": "Arcane Sword",
    "nystuls magic aura": "Arcanist's Magic Aura",
    "magic aura": "Arcanist's Magic Aura",
    "enlarge": "Enlarge/Reduce",
    "reduce": "Enlarge/Reduce",
    "enlarge or reduce": "Enlarge/Reduce",
    "blindness": "Blindness/Deafness",
    "deafness": "Blindness/Deafness",
    "antipathy": "Antipathy/Sympathy",
    "sympathy": "Antipathy/Sympathy",
    "shillelah": "Shillelagh",
    "chillelagy": "Shillelagh",
    "miss d step": "Misty Step",
  };

  // Close-but-not-exact matching only applies to names at least this long.
  // Shorter names are too easy to confuse ("crying" vs "scrying").
  const MIN_FUZZY_LENGTH = 8;
  const MAX_WORDS_IN_NAME = 7;

  function normalize(text) {
    return text
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function collapse(text) {
    return text.replace(/ /g, "");
  }

  // Counts the single-letter edits needed to turn one word into another.
  function editDistance(a, b) {
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const current = [i];
      for (let j = 1; j <= b.length; j++) {
        const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
        current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
      }
      previous = current;
    }
    return previous[b.length];
  }

  function createMatcher(spells) {
    const byName = new Map(spells.map((spell) => [spell.name, spell]));
    const everyday = new Set(EVERYDAY_WORDS.map(collapse));
    const entries = new Map(); // squashed phrase -> entry

    function addEntry(phrase, spell) {
      const key = collapse(normalize(phrase));
      entries.set(key, {
        key,
        spell,
        wordCount: normalize(phrase).split(" ").length,
        needsCastingWord: everyday.has(key),
      });
    }

    spells.forEach((spell) => addEntry(spell.name, spell));
    Object.entries(ALIASES).forEach(([phrase, name]) => {
      if (byName.has(name)) addEntry(phrase, byName.get(name));
    });
    const entryList = [...entries.values()];

    function hasCastingWordNearby(words, start, size) {
      const before = words.slice(Math.max(0, start - 4), start);
      const after = words.slice(start + size, start + size + 2);
      return [...before, ...after].some((word) => CASTING_WORDS.has(word));
    }

    function closestEntry(key, size, typed) {
      let best = null;
      let bestDistance = Infinity;
      for (const entry of entryList) {
        if (entry.key.length < MIN_FUZZY_LENGTH) continue;
        if (entry.needsCastingWord && !typed) continue;
        if (Math.abs(entry.wordCount - size) > 1) continue;
        const allowed = entry.key.length >= 12 ? 2 : 1;
        if (Math.abs(entry.key.length - key.length) > allowed) continue;
        const distance = editDistance(key, entry.key);
        if (distance <= allowed && distance < bestDistance) {
          best = entry;
          bestDistance = distance;
        }
      }
      return best;
    }

    // Returns the spells mentioned in the text, in the order they were said.
    // typed: true means the words were typed, so everyday words count as-is.
    function find(text, { typed = false } = {}) {
      const words = normalize(text).split(" ").filter(Boolean);
      const used = new Array(words.length).fill(false);
      const found = [];

      function scan(lookup) {
        // Longest phrases first, so "delayed blast fireball" beats "fireball".
        for (let size = Math.min(MAX_WORDS_IN_NAME, words.length); size >= 1; size--) {
          for (let start = 0; start + size <= words.length; start++) {
            if (used.slice(start, start + size).some(Boolean)) continue;
            const key = words.slice(start, start + size).join("");
            const entry = lookup(key, size);
            if (!entry) continue;
            if (entry.needsCastingWord && !typed && !hasCastingWordNearby(words, start, size)) continue;
            used.fill(true, start, start + size);
            found.push({ start, spell: entry.spell });
          }
        }
      }

      scan((key) => entries.get(key)); // exact matches get first pick
      scan((key, size) => closestEntry(key, size, typed)); // then near misses

      const unique = [...new Set(found.sort((a, b) => a.start - b.start).map((hit) => hit.spell))];

      // Typing part of a name ("mage") lists the spells that contain it.
      if (typed && unique.length === 0 && words.length > 0) {
        const typedText = words.join(" ");
        return spells.filter((spell) => ` ${normalize(spell.name)}`.includes(` ${typedText}`)).slice(0, 6);
      }
      return unique;
    }

    return { find };
  }

  if (typeof module !== "undefined") module.exports = { createMatcher };
  else window.createMatcher = createMatcher;
})();
