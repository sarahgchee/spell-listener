# Spell Listener

Listens through your microphone during D&D and shows the rules for any spell you mention.

## Use it

1. Double-click `start.bat`. Chrome opens the page. Keep the black window open while you play.
2. Press **Start listening** and allow the microphone. The speech model takes about 40 seconds to load, so start before the game begins.
3. Say something like "I cast Fireball." The card appears a couple of seconds after you pause.

Close the black window when you're done.

## Casting at a higher level

Say the level along with the spell, and the card shows what to roll:

- "I cast Sleep at level 2"
- "I cast a third level Fireball"
- "Burning Hands using a level 4 slot"
- "I upcast Cure Wounds to level 4"

Cards with level-based dice also show a table of the dice at every level. A few things to know:

- **Cantrips** grow with your character level, so "Fire Bolt at level 5" means a level 5 character.
- **The two rule sets differ.** Sleep has no dice in the 2024 rules, for example, and the card says so.
- **Spells without level-based dice**, like Hold Person, show how many levels up you are and point to their "At higher levels" rule.
- **Spell dice only.** The dice cover what the spell's rules say. Other bonuses from your character aren't included.

## Your spellcasting modifier

Say it once, for example "I have a spellcasting ability modifier of 2", or type it into the box at the top. Cards then add it automatically, so Spiritual Weapon shows `1d8 + 2` instead of `1d8 + your modifier`, even if you don't say a level. The page remembers it for next time.

It only listens for your *spellcasting* modifier, so "my strength modifier is 2" won't change it. If it hears the wrong number, correct it in the box.

## Combat rules and conditions

Say a rule during combat and its card appears, with a teal top edge so you can tell it apart from a spell. The cards follow your 2014 or 2024 switch.

- **Said any time:** jump, dash, disengage, dodge, grapple, shove, opportunity attack, difficult terrain, two-weapon fighting (2014), and conditions like prone, stunned and poisoned.
- **Need the word "action":** attack, help, hide, ready, search, plus influence, magic, study and utilize (2024). For example "I take the Help action" or "I use my action to hide". This stops "are you ready?" from bringing up a card.
- **Jump the rule or Jump the spell:** "I jump" shows the rule. "I cast Jump" shows the spell.

To change which words trigger a card, edit `RULE_WORDS` and `RULE_WORDS_NEEDING_ACTION` in `matcher.js`. The box at the top of the page can also find any rule by name.

## Adding your own spells

Spells from books outside the free rules go in `my-spells.js`, which already has Silvery Barbs as an example. Copy its block, change the details and refresh the page. They appear under both the 2014 and 2024 switches.

Git ignores this file so that text from paid books stays on your computer. That also means Git won't back it up, so keep your own copy if you add a lot.

## Two ways to listen

Use the switch at the top of the page:

| | On this computer (default) | Chrome (online) |
| --- | --- | --- |
| Speech model | Cohere Transcribe, Q4 version | Whatever Google provides |
| Your audio | Stays on this computer | Sent to Google |
| Internet | Not needed | Needed |
| Speed | Card appears after you pause | Card appears as you speak |
| Startup | About 40 seconds | Instant |

If the local model has a problem, the page tells you instead of switching to Chrome by itself, so audio never goes to Google unless you choose that.

## Good to know

- **Use Google Chrome** for both modes.
- **Memory:** the local model uses about 2 GB of memory or more. Close other big apps if your laptop slows down.
- **Long speech:** on this laptop the model only just keeps up with non-stop talking. If it falls behind, it skips older speech and the status line says so.
- **Misheard names:** add them under `ALIASES` in `matcher.js`. Shillelagh is unreliable in local mode, so use the type box for that one.
- **Everyday-word spells need a casting word.** Say "I cast Shield" or "the Light spell". The list is at the top of `matcher.js`.
- **Only free rules spells are included.** The 2014 and 2024 data come from the free System Reference Documents, so some Player's Handbook spells are missing.
- **Double-check big rulings in your book.** The data is a community copy of the rules, and a few 2024 cards had scanning errors. Cards with known gaps show a warning.

## Using the online link

From an online link, the page starts in **Chrome (online)** mode, which works right away but sends audio to Google. Choosing **On this computer** downloads the speech model (about 2 GB, roughly 4 minutes in testing) from Hugging Face. The browser may refuse to store the largest file, so this download can repeat on every visit. Your own `my-spells.js` spells aren't included online.

## Credits and licenses

- Spell, action and condition rules: System Reference Documents 5.1 and 5.2.1 by Wizards of the Coast LLC, CC-BY-4.0
- Spell and rule data: [5e-database](https://github.com/5e-bits/5e-database), MIT
- Speech model: [Cohere Transcribe](https://huggingface.co/CohereLabs/cohere-transcribe-03-2026), Apache 2.0, through the [onnx-community conversion](https://huggingface.co/onnx-community/cohere-transcribe-03-2026-ONNX)
- [Transformers.js](https://github.com/huggingface/transformers.js) (Apache 2.0) and [ONNX Runtime](https://github.com/microsoft/onnxruntime) (MIT): license files are in `vendor/`

## Getting the model

The speech model is not stored in Git because of its size. If `models/` is missing, for example after a fresh clone, local listening won't load until you download it.

Download these files from the [Q4 model repo](https://huggingface.co/onnx-community/cohere-transcribe-03-2026-ONNX/tree/31b1c6211c9000d76b077ddd23b74c9090badeba) into `models/onnx-community/cohere-transcribe-03-2026-ONNX/`, keeping the same folder layout:

- `config.json`, `generation_config.json`, `preprocessor_config.json`, `processor_config.json`, `tokenizer.json`, `tokenizer_config.json`
- `onnx/encoder_model_q4.onnx`, `onnx/encoder_model_q4.onnx_data`
- `onnx/decoder_model_merged_q4.onnx`, `onnx/decoder_model_merged_q4.onnx_data`

## What each file does

| File | What it does |
| --- | --- |
| `index.html` | The page: layout, spell cards and Chrome listening |
| `local-speech.js` | Local listening: connects the microphone to the model |
| `speech-segmenter.js` | Cuts speech into short pieces at pauses. Edit this if it cuts you off |
| `local-speech-worker.js` | Runs the model in the background |
| `mic-capture-worklet.js` | Passes microphone audio to the page |
| `models/`, `vendor/` | The model (about 2 GB) and the software that runs it |
| `speed-test.html` | Measures model speed at `http://localhost:8765/speed-test.html` |
| `test-audio/` | Computer-voice test clips for the speed test |
| `test-segmenter.js` | Checks the audio cutting: `node test-segmenter.js` |
| `matcher.js` | Decides which words count as a spell. Edit this to tune it |
| `spell-levels.js` | Works out what to roll at each casting level |
| `spells-data.js` | The spell rules used by the page. Generated, so don't edit it by hand |
| `build_spells.py` | Creates `spells-data.js` from `raw_data/` and holds the data repairs |
| `spell_scaling.py` | How each spell's dice grow, including hand-written entries for tricky spells |
| `rules-data.js` | The combat rules used by the page. Generated, so don't edit it by hand |
| `build_rules.py` | Creates `rules-data.js` from `raw_data/` |
| `test-matcher.js` | Checks the matching still works: `node test-matcher.js` |
| `start.bat` | Starts the page on your computer |
