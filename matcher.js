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

  // Ways a level gets written down, including "level to" for "level two".
  const NUMBER_WORDS = {
    one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, five: 5, six: 6, seven: 7,
    eight: 8, ate: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
    fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  };
  const ORDINAL_WORDS = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9,
    tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15,
    sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20,
  };
  // "I'm level 3" describes a character, not how a spell is being cast.
  const NOT_A_CAST_LEVEL = new Set(["im", "am", "is", "was", "were", "hes", "shes", "theyre", "character"]);
  const WORDS_BEFORE_A_NAME = new Set(["a", "an", "the", "my", "spell", "slot"]);
  const WORDS_TO_SEARCH_AFTER_A_NAME = 7;

  function digits(word) {
    const match = /^(\d{1,2})(st|nd|rd|th)?$/.exec(word || "");
    return match ? Number(match[1]) : null;
  }

  function numberFrom(word) {
    return digits(word) || NUMBER_WORDS[word] || ORDINAL_WORDS[word] || null;
  }

  function ordinalFrom(word) {
    return /^\d/.test(word || "") ? digits(word) : ORDINAL_WORDS[word] || null;
  }

  // Reads a level phrase in which words[index] is "level" or "upcast".
  function levelPhraseAt(words, index, earliest) {
    if (words[index] === "upcast" || words[index] === "upcasting") {
      const next = words[index + 1] === "to" || words[index + 1] === "at" ? words[index + 2] : words[index + 1];
      return numberFrom(next);
    }
    if (words[index] !== "level") return null;
    const hasOrdinalBefore = index - 1 >= earliest && ordinalFrom(words[index - 1]);
    const owner = words[index - (hasOrdinalBefore ? 2 : 1)];
    if (NOT_A_CAST_LEVEL.has(owner)) return null;
    return hasOrdinalBefore || numberFrom(words[index + 1]);
  }

  // "sleep at level 2", "fireball using a 4th level slot"
  function levelAfterName(words, end, limit) {
    for (let i = end; i < Math.min(end + WORDS_TO_SEARCH_AFTER_A_NAME, limit); i++) {
      const level = levelPhraseAt(words, i, end);
      if (level) return { level, end: i + 2 };
    }
    return null;
  }

  // "a third level fireball", "a level 3 fireball"
  function levelBeforeName(words, start, earliest) {
    let i = start - 1;
    while (i >= earliest && WORDS_BEFORE_A_NAME.has(words[i])) i--;
    if (i < earliest) return null;
    const position = words[i] === "level" ? i : words[i - 1] === "level" && i - 1 >= earliest ? i - 1 : -1;
    return position >= 0 ? levelPhraseAt(words, position, earliest) : null;
  }

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

  // Rule cards. These words bring up a card whenever they're said.
  const RULE_WORDS = {
    Jump: ["jump", "jumps", "jumped", "jumping"],
    Dash: ["dash", "dashes", "dashed", "dashing"],
    Disengage: ["disengage", "disengages", "disengaged", "disengaging"],
    Dodge: ["dodge", "dodges", "dodged", "dodging"],
    Grapple: ["grapple", "grapples", "grappling"],
    Shove: ["shove", "shoves", "shoved", "shoving"],
    "Opportunity Attack": ["opportunity attack", "opportunity attacks", "attack of opportunity", "attacks of opportunity"],
    "Difficult Terrain": ["difficult terrain"],
    "Two-Weapon Fighting": ["two weapon fighting", "dual wield", "dual wielding"],
    "Use an Object": ["use an object"],
  };
  // These come up too often in conversation ("are you ready?"), so they need
  // the word "action": "the Help action", "use my action to hide".
  const RULE_WORDS_NEEDING_ACTION = {
    Attack: "attack", Help: "help", Hide: "hide", Ready: "ready", Search: "search",
    Influence: "influence", Magic: "magic", Study: "study", Utilize: "utilize",
  };
  const LONGEST_RULE_PHRASE = 4;

  function createRuleMatcher(rules) {
    const heard = new Map();
    const typed = new Map();

    rules.forEach((rule) => {
      const phrases = [...(RULE_WORDS[rule.name] || [])];
      if (rule.kind === "Condition") phrases.push(normalize(rule.name));
      const actionWord = RULE_WORDS_NEEDING_ACTION[rule.name];
      if (actionWord) {
        phrases.push(`${actionWord} action`, `action to ${actionWord}`);
        if (rule.name === "Ready") phrases.push("ready an action");
      }
      phrases.forEach((phrase) => {
        heard.set(phrase, rule);
        typed.set(phrase, rule);
      });
      typed.set(normalize(rule.name), rule);
      if (actionWord) typed.set(actionWord, rule);
    });

    // Returns the rules mentioned, in the order they were said.
    function find(text, options = {}) {
      const lookup = options.typed ? typed : heard;
      const words = normalize(text).split(" ").filter(Boolean);
      const used = new Array(words.length).fill(false);
      const found = [];
      for (let size = Math.min(LONGEST_RULE_PHRASE, words.length); size >= 1; size--) {
        for (let start = 0; start + size <= words.length; start++) {
          if (used.slice(start, start + size).some(Boolean)) continue;
          const rule = lookup.get(words.slice(start, start + size).join(" "));
          if (!rule) continue;
          used.fill(true, start, start + size);
          found.push({ start, rule });
        }
      }
      return [...new Set(found.sort((a, b) => a.start - b.start).map((hit) => hit.rule))];
    }

    return { find };
  }

  const MODIFIER_NAME = String.raw`(?:spell[\s-]*casting(?:\s+ability)?|spell|my)[\s-]+(?:modifier|mod)\b`;
  const MODIFIER_LINK = String.raw`\s*(?:(?:is|of|equals|at|as|now|be|=|:|a|an)\s+)*`;
  const MODIFIER_VALUE = String.raw`(\+|-|plus\s+|positive\s+|minus\s+|negative\s+)?(\d{1,2}|zero|one|two|three|four|five|six|seven|eight|nine|ten)\b`;
  const MODIFIER_AFTER_NAME = new RegExp(MODIFIER_NAME + MODIFIER_LINK + MODIFIER_VALUE, "i");
  const MODIFIER_BEFORE_NAME = new RegExp(String.raw`(?:^|\s)` + MODIFIER_VALUE + String.raw`\s+` + MODIFIER_NAME, "i");
  // "To", "too" and "for" only count when clearly a mishearing of a number, so
  // "add my spellcasting modifier to my weapon" doesn't mean a modifier of 2.
  const MODIFIER_MISHEARD = new RegExp(MODIFIER_NAME + String.raw`\s+(?:is|of|equals)\s+(?:plus\s+)?(to|too|for)\s*(?:[.,!?]|$)`, "i");
  const LOWEST_MODIFIER = -5;
  const HIGHEST_MODIFIER = 10;

  // Finds a spoken spellcasting modifier. Returns a number, or null if none was said.
  function findSpellcastingModifier(text) {
    const normalized = text.replace(/['’]/g, "");
    const misheard = MODIFIER_MISHEARD.exec(normalized);
    if (misheard) return NUMBER_WORDS[misheard[1].toLowerCase()];
    const match = MODIFIER_AFTER_NAME.exec(normalized) || MODIFIER_BEFORE_NAME.exec(normalized);
    if (!match) return null;
    const size = digits(match[2]) ?? NUMBER_WORDS[match[2].toLowerCase()] ?? (match[2].toLowerCase() === "zero" ? 0 : null);
    if (size === null) return null;
    const isNegative = /^(-|minus|negative)/i.test(match[1] || "");
    const value = isNegative ? -size : size;
    return value >= LOWEST_MODIFIER && value <= HIGHEST_MODIFIER ? value : null;
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

    // Returns the spells mentioned, in the order they were said, each with the
    // level it was cast at if one was said: [{ spell, level }].
    // typed: true means the words were typed, so everyday words count as-is.
    function mentions(text, { typed = false } = {}) {
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
            found.push({ start, end: start + size, spell: entry.spell });
          }
        }
      }

      scan((key) => entries.get(key)); // exact matches get first pick
      scan((key, size) => closestEntry(key, size, typed)); // then near misses

      found.sort((a, b) => a.start - b.start);
      const results = new Map();
      let earliest = 0;
      found.forEach((hit, i) => {
        const nextStart = i + 1 < found.length ? found[i + 1].start : words.length;
        let level = levelBeforeName(words, hit.start, earliest);
        // "upcast fireball to 5"
        if (!level && /^upcast/.test(words[hit.start - 1] || "") && /^(to|at)$/.test(words[hit.end] || "")) {
          level = numberFrom(words[hit.end + 1]);
        }
        earliest = hit.end;
        if (!level) {
          const after = levelAfterName(words, hit.end, nextStart);
          if (after) {
            level = after.level;
            earliest = after.end;
          }
        }
        const existing = results.get(hit.spell);
        if (!existing || level) results.set(hit.spell, { spell: hit.spell, level: level || null });
      });

      // Typing part of a name ("mage") lists the spells that contain it.
      if (typed && results.size === 0 && words.length > 0) {
        const typedText = words.join(" ");
        return spells
          .filter((spell) => ` ${normalize(spell.name)}`.includes(` ${typedText}`))
          .slice(0, 6)
          .map((spell) => ({ spell, level: null }));
      }
      return [...results.values()];
    }

    function find(text, options) {
      return mentions(text, options).map((mention) => mention.spell);
    }

    return { find, mentions };
  }

  if (typeof module !== "undefined") {
    module.exports = { createMatcher, createRuleMatcher, findSpellcastingModifier };
  } else {
    window.createMatcher = createMatcher;
    window.createRuleMatcher = createRuleMatcher;
    window.findSpellcastingModifier = findSpellcastingModifier;
  }
})();
