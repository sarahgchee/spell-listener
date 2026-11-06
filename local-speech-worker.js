// Runs Cohere Transcribe (Q4 version) in the background, so the page stays
// responsive. Everything loads from this computer; nothing goes online.
import { pipeline, env } from "./vendor/transformers.min.js";

const MODEL = "onnx-community/cohere-transcribe-03-2026-ONNX";

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = "/models/";
env.useBrowserCache = false; // the files are already on disk; don't store a second copy
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
