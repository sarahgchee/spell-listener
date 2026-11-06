"""Turns the rule downloads in raw_data/ into rules-data.js for the page.

You only need to run this again if the files in raw_data/ change:
    python build_rules.py

2014 text comes from the 5e-database project. 2024 actions come from the
official SRD 5.2.1 PDF, cleaned once into raw_data/rules-2024.json.
"""
import json
import re
from pathlib import Path

HERE = Path(__file__).parent

# Card name, what kind of rule it is, which chapter it's in, and its heading there.
RULES_2014 = [
    ("Attack", "Action", "Actions in Combat", "### Attack"),
    ("Dash", "Action", "Actions in Combat", "### Dash"),
    ("Disengage", "Action", "Actions in Combat", "### Disengage"),
    ("Dodge", "Action", "Actions in Combat", "### Dodge"),
    ("Help", "Action", "Actions in Combat", "### Help"),
    ("Hide", "Action", "Actions in Combat", "### Hide"),
    ("Ready", "Action", "Actions in Combat", "### Ready"),
    ("Search", "Action", "Actions in Combat", "### Search"),
    ("Use an Object", "Action", "Actions in Combat", "### Use an Object"),
    ("Jump", "Movement", "Movement", "#### Jumping"),
    ("Difficult Terrain", "Movement", "Movement and Position", "### Difficult Terrain"),
    ("Opportunity Attack", "Combat rule", "Making an Attack", "#### Opportunity Attacks"),
    ("Two-Weapon Fighting", "Combat rule", "Making an Attack", "#### Two-Weapon Fighting"),
    ("Grapple", "Combat rule", "Making an Attack", "#### Grappling"),
    ("Shove", "Combat rule", "Making an Attack", "#### Shoving a Creature"),
]


def lines_of(text):
    lines = []
    for line in (raw.strip() for raw in text.split("\n")):
        if not line:
            continue
        # The source sometimes breaks a sentence across two lines.
        if lines and (line[0] == "(" or line[0].islower()):
            lines[-1] += f" {line}"
        else:
            lines.append(line)
    return lines


def read_json(name):
    return json.loads((HERE / "raw_data" / name).read_text("utf-8"))


def section(chapter, heading):
    """Returns the text under a heading, up to the next heading of the same size or larger."""
    start = chapter.index(heading + "\n") + len(heading) + 1
    level = len(heading.split(" ")[0])
    following = re.compile(r"^#{1,%d} " % level, re.M).search(chapter, start)
    return chapter[start:following.start() if following else len(chapter)]


def repair_stray_markers(lines):
    """Rejoins a sentence the source split with an unclosed "**", as in 2024 Unconscious."""
    repaired = []
    for line in lines:
        if line.startswith("**") and line.count("**") == 1 and repaired:
            repaired[-1] += " " + line[2:]
        else:
            repaired.append(line)
    return repaired


def conditions(name):
    result = []
    for condition in read_json(name):
        text = condition.get("desc") or condition.get("description")
        desc = text if isinstance(text, list) else lines_of(text)
        desc = repair_stray_markers(desc)
        result.append({"name": condition["name"], "kind": "Condition", "desc": desc})
    return result


def build_2014():
    chapters = {s["name"]: s["desc"] for s in read_json("rule-sections-2014.json")}
    rules = [
        {"name": name, "kind": kind, "desc": lines_of(section(chapters[chapter], heading))}
        for name, kind, chapter, heading in RULES_2014
    ]
    return rules + conditions("conditions-2014.json")


def build_2024():
    return read_json("rules-2024.json") + conditions("conditions-2024.json")


def main():
    data = {"2014": build_2014(), "2024": build_2024()}
    for edition, rules in data.items():
        print(f"{edition}: {len(rules)} rules")
        for rule in rules:
            if not rule["desc"]:
                raise ValueError(f"{rule['name']} has no text")
    text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    (HERE / "rules-data.js").write_text(f"window.RULE_DATA = {text};\n", "utf-8")


if __name__ == "__main__":
    main()
