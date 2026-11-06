"""Turns the raw spell downloads in raw_data/ into spells-data.js for the page.

You only need to run this again if the files in raw_data/ change:
    python build_spells.py
"""
import json
import sys
from pathlib import Path

from spell_scaling import check_against_tables, scaling_for

HERE = Path(__file__).parent
HIGHER_LEVEL_MARKER = "Using a Higher-Level Spell Slot."


def as_list(value):
    """The 2014 file stores text as a list, the 2024 file as one string."""
    if not value:
        return []
    if isinstance(value, str):
        return [line.strip() for line in value.split("\n") if line.strip()]
    return [line.strip() for line in value if line.strip()]


def cut(text, start_marker, end_marker):
    """Returns (text with the section removed, the removed section)."""
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    return text[:start] + text[end:], text[start:end]


def repair_2024(spells):
    """Fixes scanning errors in the 2024 file, using only that file's own text."""
    by_name = {s["name"]: s for s in spells}

    # Some spells keep their higher-level rule in the main text.
    for spell in spells:
        if HIGHER_LEVEL_MARKER in spell["description"] and not spell.get("higher_level"):
            rules, _, higher = spell["description"].partition(HIGHER_LEVEL_MARKER)
            spell["description"] = rules.rstrip()
            spell["higher_level"] = higher.strip()

    # Part of Control Weather's text and tables landed inside Control Water.
    water = by_name["Control Water"]["description"]
    water, weather_rules = cut(water, " conditions to take effect.", "\n  Redirect Flow.")
    water, _ = cut(water, " Temperature Stage | Condition", "square and 25 feet deep")
    water = water.replace("at least 50 feet.square", "at least 50 feet square")
    by_name["Control Water"]["description"] = water.replace("whirl- pool", "whirlpool")

    weather_rules = weather_rules[:weather_rules.index(" Precipitation Stage")]
    by_name["Control Weather"]["description"] = (
        by_name["Control Weather"]["description"].rstrip() + weather_rules + "\n"
        "# Precipitation\nStage | Condition\n1 | Clear\n2 | Light clouds\n"
        "3 | Overcast or ground fog\n4 | Rain, hail, or snow\n"
        "5 | Torrential rain, driving hail, or blizzard\n"
        "# Temperature\nStage | Condition\n1 | Heat wave\n2 | Hot\n3 | Warm\n4 | Cool\n5 | Cold\n6 | Freezing\n"
        "# Wind\nStage | Condition\n1 | Calm\n2 | Moderate wind\n3 | Strong wind\n4 | Gale\n5 | Storm"
    )

    # The species table was flattened into one sentence.
    reincarnate = by_name["Reincarnate"]["description"]
    reincarnate, _ = cut(reincarnate, " 1d10 Species", "\n  The reincarnated")
    by_name["Reincarnate"]["description"] = reincarnate.replace(
        "\n  The reincarnated",
        "\n1d10 | Species\n1 | Roll again\n2 | Dragonborn\n3 | Dwarf\n4 | Elf\n5 | Gnome\n"
        "6 | Goliath\n7 | Halfling\n8 | Human\n9 | Orc\n10 | Tiefling\nThe reincarnated",
    ).replace("re- calls", "recalls")

    # The table title was stuck onto its header row.
    word = by_name["Divine Word"]["description"]
    by_name["Divine Word"]["description"] = word.replace(
        "Divine Word Effects | Hit Points Effect", "# Divine Word Effects\nHit Points | Effect"
    )


# Text missing from the source file. We don't guess at rules, so the card says so.
DATA_WARNINGS = {
    "2024": {
        "Divine Word": "The source data has no row for 31-40 Hit Points. Check your book for that result.",
        "Telekinesis": "The source data cuts off at the end of this spell. Check your book for the rest.",
    },
}


def repair_2014(spells):
    """Fixes a scanning error in the 2014 file."""
    moonbeam = next(s for s in spells if s["name"] == "Moonbeam")
    moonbeam["higher_level"] = [line.replace("1dl0", "1d10") for line in moonbeam["higher_level"]]


def scaling_of(spell, edition):
    rules = " ".join(as_list(spell.get("desc") or spell.get("description")))
    higher = " ".join(as_list(spell.get("higher_level")))
    return scaling_for(edition, spell["name"], spell["level"], rules, higher)


def tidy(spell, edition):
    return {
        "warning": DATA_WARNINGS.get(edition, {}).get(spell["name"], ""),
        "scaling": scaling_of(spell, edition),
        "name": spell["name"],
        "level": spell["level"],
        "school": spell["school"]["name"],
        "castingTime": spell["casting_time"],
        "range": spell["range"],
        "components": spell.get("components", []),
        "material": spell.get("material", ""),
        "duration": spell["duration"],
        "concentration": spell.get("concentration", False),
        "ritual": spell.get("ritual", False),
        "classes": [c["name"] for c in spell.get("classes", [])],
        "desc": as_list(spell.get("desc") or spell.get("description")),
        "higherLevel": as_list(spell.get("higher_level")),
    }


def main():
    data = {}
    for edition in ("2014", "2024"):
        raw = json.loads((HERE / "raw_data" / f"spells-{edition}.json").read_text("utf-8"))
        if edition == "2024":
            repair_2024(raw)
        else:
            repair_2014(raw)
        data[edition] = sorted((tidy(s, edition) for s in raw), key=lambda s: s["name"])
        with_dice = sum(1 for s in data[edition] if s["scaling"])
        print(f"{edition}: {len(data[edition])} spells, {with_dice} with level-based dice")
        for spell in raw:
            for problem in check_against_tables(spell["name"], spell, scaling_of(spell, edition)):
                print(f"  CHECK {problem}")
        if "--audit" in sys.argv:
            for spell in data[edition]:
                if spell["scaling"]:
                    print(f"  {spell['level']} {spell['name']}: {json.dumps(spell['scaling'], ensure_ascii=False)}")
    text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    (HERE / "spells-data.js").write_text(f"window.SPELL_DATA = {text};\n", "utf-8")


if __name__ == "__main__":
    main()
