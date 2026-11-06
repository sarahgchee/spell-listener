// Runs Cohere Transcribe (Q4 version) in the background, so the page stays
// responsive. Your speech never leaves the computer. On your own computer the
// model loads from the models/ folder. From an online link, the browser downloads
// the model from Hugging Face. It tries to keep a copy, but browsers can refuse to
// store the 1.9 GB encoder file, and then it downloads again on the next visit.
import { pipeline, env } from "./vendor/transformers.min.js";

const MODEL = "onnx-community/cohere-transcribe-03-2026-ONNX";
const MODEL_VERSION = "31b1c6211c9000d76b077ddd23b74c9090badeba";
const IS_LOCAL = ["localhost", "127.0.0.1"].includes(self.location.hostname);

env.allowRemoteModels = !IS_LOCAL;
env.allowLocalModels = IS_LOCAL;
env.localModelPath = "/models/";
env.useBrowserCache = !IS_LOCAL; // saves re-downloading when the browser allows it
env.useWasmCache = false;
env.backends.onnx.wasm.wasmPaths = {
  mjs: new URL("./vendor/ort-wasm-simd-threaded.asyncify.mjs", import.meta.url).href,
  wasm: new URL("./vendor/ort-wasm-simd-threaded.asyncify.wasm", import.meta.url).href,
};

let transcriber = null;

async function load(device) {
  const startedAt = performance.now();
  transcriber = await pipeline("automatic-speech-recognition", MODEL, {
    dtype: "q4",
    device,
    revision: MODEL_VERSION,
    progress_callback: (progress) => {
      if (progress.status === "progress") {
        postMessage({ type: "progress", file: progress.file, percent: progress.progress });
      }
    },
  });
  // The first run is much slower than the rest, so do it now with one second
  // of silence. Otherwise the first spell you say would take over 10 seconds.
  await transcriber(new Float32Array(16000), { language: "en", max_new_tokens: 16 });
  postMessage({ type: "ready", device, ms: performance.now() - startedAt });
}

async function transcribe(id, session, audio) {
  const startedAt = performance.now();
  const output = await transcriber(audio, { language: "en", max_new_tokens: 256 });
  postMessage({ type: "result", id, session, text: output.text, ms: performance.now() - startedAt });
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === "load") await load(data.device);
    if (data.type === "transcribe") await transcribe(data.id, data.session, data.audio);
  } catch (error) {
    postMessage({ type: "error", id: data.id, message: String((error && error.message) || error) });
  }
};
