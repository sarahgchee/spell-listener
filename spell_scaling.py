"""Works out how each spell's dice change with its casting level.

Used by build_spells.py. Simple spells are read from their rules text. Spells
with more than one kind of dice are written out by hand in HAND_WRITTEN, because
reading those automatically could pick the wrong dice. If a spell can't be read
safely, the build stops and asks for an entry rather than guessing.
"""
import re

DICE = r"\d+d\d+"
MODIFIER = "your modifier"

# "*" applies to both editions. A roll with no "step" stays the same at every level.
ACID_ARROW = [
    {"label": "On a hit", "base": "4d4", "step": "1d4"},
    {"label": "End of its next turn", "base": "2d4", "step": "1d4"},
]
WALL_OF_ICE = [
    {"label": "When it appears", "base": "10d6", "step": "2d6"},
    {"label": "Passing through the air", "base": "5d6", "step": "1d6"},
]
HAND_WRITTEN = {
    ("*", "Acid Arrow"): ACID_ARROW,
    ("*", "Wall of Ice"): WALL_OF_ICE,
    ("*", "Call Lightning"): [{"label": "Damage", "base": "3d10", "step": "1d10"}],
    ("*", "Delayed Blast Fireball"): [{"label": "Base damage", "base": "12d6", "step": "1d6"}],
    ("*", "Magic Missile"): [{"label": "Darts", "count": 3, "noun": "dart", "each": "1d4 + 1"}],
    ("*", "Scorching Ray"): [{"label": "Rays", "count": 3, "noun": "ray", "each": "2d6"}],
    ("*", "Glyph of Warding"): [{"label": "Explosive runes", "base": "5d8", "step": "1d8"}],
    ("2014", "Sleep"): [{"label": "Hit points affected", "base": "5d8", "step": "2d8"}],
    ("2014", "Color Spray"): [{"label": "Hit points affected", "base": "6d10", "step": "2d10"}],
    ("2014", "Arcane Hand"): [
        {"label": "Clenched Fist", "base": "4d8", "step": "2d8"},
        {"label": "Grasping Hand", "base": "2d6", "bonus": MODIFIER, "step": "2d6"},
    ],
    ("2024", "Arcane Hand"): [
        {"label": "Clenched Fist", "base": "5d8", "step": "2d8"},
        {"label": "Grasping Hand", "base": "4d6", "bonus": MODIFIER, "step": "2d6"},
    ],
    ("2014", "Flame Strike"): [
        {"label": "Fire or radiant (your choice)", "base": "4d6", "step": "1d6"},
        {"label": "The other type", "base": "4d6"},
    ],
    ("2024", "Flame Strike"): [
        {"label": "Fire", "base": "5d6", "step": "1d6"},
        {"label": "Radiant", "base": "5d6", "step": "1d6"},
    ],
    ("2014", "Ice Storm"): [
        {"label": "Bludgeoning", "base": "2d8", "step": "1d8"},
        {"label": "Cold", "base": "4d6"},
    ],
    ("2024", "Ice Storm"): [
        {"label": "Bludgeoning", "base": "2d10", "step": "1d10"},
        {"label": "Cold", "base": "4d6"},
    ],
    ("2024", "Ice Knife"): [
        {"label": "Piercing", "base": "1d10"},
        {"label": "Cold", "base": "2d6", "step": "1d6"},
    ],
    ("2024", "Conjure Celestial"): [
        {"label": "Healing", "base": "4d12", "bonus": MODIFIER, "step": "1d12"},
        {"label": "Damage", "base": "6d12", "step": "1d12"},
    ],
    ("2024", "Conjure Elemental"): [
        {"label": "On a failed save", "base": "8d8", "step": "1d8"},
        {"label": "On later failed saves", "base": "4d8", "step": "1d8"},
    ],
    ("2024", "Arcane Sword"): [{"label": "Force damage", "base": "4d12", "bonus": MODIFIER}],
    ("2024", "Divine Smite"): [{"label": "Radiant damage", "base": "2d8", "step": "1d8"}],
    ("2024", "Vitriolic Sphere"): [
        {"label": "Initial", "base": "10d4", "step": "2d4"},
        {"label": "End of its next turn", "base": "5d4"},
    ],
}

# Cantrips grow with character level, and these don't follow the usual pattern.
HAND_WRITTEN_CANTRIPS = {
    ("*", "Eldritch Blast"): {
        "label": "Beams",
        "tiers": {"1": "1 beam, 1d10", "5": "2 beams, each 1d10", "11": "3 beams, each 1d10", "17": "4 beams, each 1d10"},
    },
    ("2024", "True Strike"): {
        "label": "Extra radiant damage",
        "tiers": {"1": "None", "5": "1d6", "11": "2d6", "17": "3d6"},
    },
    ("2024", "Shillelagh"): {
        "label": "Damage die",
        "tiers": {"1": "1d8", "5": "1d10", "11": "1d12", "17": "2d6"},
    },
}

CANTRIP_TIERS = re.compile(
    r"(?:5th level|levels 5) \((\d+d\d+)\), (?:11th level|11) \((\d+d\d+)\),? and (?:17th level|17) \((\d+d\d+)\)"
)


def hand_written(table, edition, name):
    return table.get((edition, name)) or table.get(("*", name))


def die_size(dice):
    return dice.split("d")[1]


def bonus_after(text, base):
    match = re.search(re.escape(base) + r"\s*(?:\+\s*(\d+)|(?:\+|plus) your spellcasting(?: ability)? modifier)", text)
    if not match:
        return ""
    return match.group(1) or MODIFIER


def read_rolls(name, rules, higher):
    """Reads one kind of dice. Returns None if the spell's dice aren't scaling dice."""
    steps = re.findall(DICE, higher)
    if not steps:
        return None
    sizes = {die_size(step) for step in steps}
    bases = sorted({d for d in re.findall(DICE, rules) if die_size(d) in sizes})
    if not bases:
        return None  # e.g. summon spells, whose dice are in a stat block
    if len(bases) > 1 or len(set(steps)) > 1:
        raise ValueError(f"{name} has several dice ({bases}, {steps}); add it to HAND_WRITTEN")
    lowered = higher.lower()
    label = "Healing" if "healing" in lowered else "Damage"
    roll = {"label": label, "base": bases[0], "step": steps[0]}
    if "every two" in lowered:
        roll["per"] = 2
    bonus = bonus_after(rules, bases[0])
    if bonus:
        roll["bonus"] = bonus
    return [roll]


def scaling_for(edition, name, level, rules, higher):
    """Returns how the spell's dice grow, or None if they don't."""
    if level == 0:
        cantrip = hand_written(HAND_WRITTEN_CANTRIPS, edition, name)
        if cantrip:
            return {"type": "cantrip", **cantrip}
        match = CANTRIP_TIERS.search(rules)
        if not match:
            return None
        base = next(d for d in re.findall(DICE, rules) if die_size(d) == die_size(match.group(1)))
        return {
            "type": "cantrip",
            "label": "Damage",
            "tiers": {"1": base, "5": match.group(1), "11": match.group(2), "17": match.group(3)},
        }
    rolls = hand_written(HAND_WRITTEN, edition, name)
    if rolls is None:
        rolls = read_rolls(name, rules, higher)
    if rolls is None:
        return None
    return {"type": "slot", "rolls": rolls}


def add_dice(base, step, times):
    count, size = base.split("d")
    step_count, step_size = step.split("d")
    if size != step_size:
        raise ValueError(f"Can't add {step} to {base}")
    return f"{int(count) + int(step_count) * times}d{size}"


def roll_at(roll, spell_level, cast_level):
    above = cast_level - spell_level
    if "count" in roll:
        return f"{roll['count'] + above} × {roll['each']}"
    dice = roll["base"]
    if "step" in roll:
        dice = add_dice(dice, roll["step"], above // roll.get("per", 1))
    return f"{dice} + {roll['bonus']}" if roll.get("bonus") else dice


def flatten(text):
    return re.sub(r"\s", "", text).lower()


def check_against_tables(name, spell, scaling):
    """Compares our dice with the tables in the source file, where it has them."""
    problems = []
    level = spell["level"]
    tables = []
    damage = spell.get("damage")
    for entry in damage if isinstance(damage, list) else [damage] if damage else []:
        if entry.get("damage_at_slot_level"):
            tables.append(entry["damage_at_slot_level"])
    if spell.get("heal_at_slot_level"):
        tables.append(spell["heal_at_slot_level"])
    if not scaling or scaling["type"] != "slot" or not tables:
        return problems
    for table in tables:
        for cast_level, expected in table.items():
            ours = []
            for roll in scaling["rolls"]:
                text = roll_at(roll, level, int(cast_level)).replace(MODIFIER, "mod")
                if "count" in roll:
                    darts = roll["count"] + int(cast_level) - level
                    each = roll["each"].split(" + ")
                    text = f"{darts}d{each[0].split('d')[1]}" + (f"+{darts * int(each[1])}" if len(each) > 1 else "")
                ours.append(flatten(text))
                if "count" in roll:
                    ours.append(flatten(roll["each"]))  # some tables list dice per dart or ray
            # A table entry can offer a choice, like "4d6 OR 5d6".
            if not all(flatten(option) in ours for option in expected.split(" OR ")):
                problems.append(f"{name} at level {cast_level}: file says {expected}, we say {ours}")
    return problems
