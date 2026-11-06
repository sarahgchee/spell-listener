// Checks how microphone audio gets cut into pieces. Run with: node test-segmenter.js
const { createSegmenter, SAMPLE_RATE } = require("./speech-segmenter.js");

const quiet = (seconds) => new Float32Array(seconds * SAMPLE_RATE).map(() => (Math.random() - 0.5) * 0.002);
const speech = (seconds) => new Float32Array(seconds * SAMPLE_RATE).map((_, i) => 0.1 * Math.sin(i / 8));

function pieces(...parts) {
  const lengths = [];
  const segmenter = createSegmenter((audio) => lengths.push(+(audio.length / SAMPLE_RATE).toFixed(1)));
  // Feed in small chunks, the way the microphone delivers audio.
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 128) segmenter.feed(part.subarray(i, i + 128));
  }
  return lengths;
}

let failures = 0;
function check(label, actual, passes) {
  const passed = passes(actual);
  if (!passed) failures++;
  console.log(`${passed ? "ok  " : "FAIL"} ${label} -> ${JSON.stringify(actual)}`);
}

check("silence makes no pieces", pieces(quiet(5)), (r) => r.length === 0);
check("a tiny noise is ignored", pieces(quiet(1), speech(0.15), quiet(2)), (r) => r.length === 0);
check("one sentence makes one piece", pieces(quiet(1), speech(2), quiet(2)), (r) => r.length === 1 && r[0] >= 2 && r[0] <= 3.2);
check("a pause splits two sentences", pieces(quiet(1), speech(2), quiet(1), speech(2), quiet(1)), (r) => r.length === 2);
check("a short breath doesn't split", pieces(quiet(1), speech(2), quiet(0.2), speech(2), quiet(1)), (r) => r.length === 1);
check("long speech is cut with no piece over 8 seconds", pieces(quiet(1), speech(20), quiet(1)), (r) => r.length === 3 && r.every((s) => s <= 8.01));
check("still-open speech isn't sent early", pieces(quiet(1), speech(2)), (r) => r.length === 0);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
