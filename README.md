# Spell Listener

Listens through your microphone during D&D and shows the rules for any spell you mention.

## Use it

1. Double-click `start.bat`. Chrome opens the page. Keep the black window open while you play.
2. Press **Start listening** and allow the microphone. The speech model takes about 40 seconds to load, so start before the game begins.
3. Say something like "I cast Fireball." The card appears a couple of seconds after you pause.

Close the black window when you're done.

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
| `spells-data.js` | The spell rules used by the page. Generated, so don't edit it by hand |
| `build_spells.py` | Creates `spells-data.js` from `raw_data/` and holds the data repairs |
| `test-matcher.js` | Checks the matching still works: `node test-matcher.js` |
| `start.bat` | Starts the page on your computer |
