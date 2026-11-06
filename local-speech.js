// Listening with the model on this computer: microphone -> pieces of speech
// (speech-segmenter.js) -> model (local-speech-worker.js) -> text.

function createLocalListener({ onText, onStatus, onFatal }) {
  const MAX_WAITING = 2; // if the model falls behind, skip older speech to stay current

  let worker = null;
  let loading = null;
  let resolveLoad = null;
  let rejectLoad = null;
  let session = 0;
  let waiting = [];
  let busy = false;
  let nextId = 1;
  let stopMic = null;

  function handleWorkerMessage({ data }) {
    if (data.type === "progress" && loading && resolveLoad) {
      onStatus(`Loading the speech model: ${Math.round(data.percent)}%`);
    } else if (data.type === "ready") {
      resolveLoad();
      resolveLoad = null;
    } else if (data.type === "result") {
      busy = false;
      if (data.session === session && data.text.trim()) onText(data.text);
      sendNext();
    } else if (data.type === "error") {
      if (resolveLoad) {
        const reject = rejectLoad;
        resolveLoad = null;
        loading = null;
        worker.terminate();
        worker = null;
        reject(new Error(data.message));
      } else {
        busy = false;
        onFatal(`The speech model stopped working: ${data.message}`);
      }
    }
  }

  function load() {
    if (loading) return loading;
    if (!navigator.gpu) {
      return Promise.reject(new Error("This browser can't run the local model. Use Google Chrome, or switch Speech to Chrome."));
    }
    loading = new Promise((resolve, reject) => {
      resolveLoad = resolve;
      rejectLoad = reject;
      worker = new Worker("local-speech-worker.js", { type: "module" });
      worker.onmessage = handleWorkerMessage;
      worker.postMessage({ type: "load", device: "webgpu" });
    });
    return loading;
  }

  function sendNext() {
    if (busy || !waiting.length) return;
    const audio = waiting.shift();
    busy = true;
    worker.postMessage({ type: "transcribe", id: nextId++, session, audio }, [audio.buffer]);
  }

  const segmenter = createSegmenter((audio) => {
    waiting.push(audio);
    if (waiting.length > MAX_WAITING) {
      waiting.shift();
      onStatus("Listening on this computer. Falling behind, so some speech was skipped.");
    }
    sendNext();
  });

  async function startMic(thisSession) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, noiseSuppression: true, echoCancellation: true, autoGainControl: true },
    });
    const context = new AudioContext({ sampleRate: 16000 });
    await context.audioWorklet.addModule("mic-capture-worklet.js");
    const source = context.createMediaStreamSource(stream);
    const capture = new AudioWorkletNode(context, "mic-capture");
    const muted = context.createGain();
    muted.gain.value = 0; // the audio must flow somewhere, but you shouldn't hear yourself
    capture.port.onmessage = ({ data }) => segmenter.feed(data);
    source.connect(capture).connect(muted).connect(context.destination);
    await context.resume();

    stopMic = () => {
      stream.getTracks().forEach((track) => track.stop());
      context.close();
      stopMic = null;
    };
    if (thisSession !== session) stopMic();
  }

  function friendlyError(error) {
    if (error.name === "NotAllowedError") return "Microphone blocked. Click the icon left of the address bar and allow the microphone.";
    if (error.name === "NotFoundError") return "No microphone found. Plug one in and press Start listening.";
    return error.message;
  }

  async function start() {
    const thisSession = ++session;
    try {
      onStatus("Loading the speech model. This takes about 30 seconds…");
      await load();
      if (thisSession !== session) return;
      onStatus("Starting the microphone…");
      await startMic(thisSession);
      if (thisSession === session) onStatus("Listening on this computer");
    } catch (error) {
      if (thisSession === session) onFatal(friendlyError(error));
    }
  }

  function stop() {
    session++;
    waiting = [];
    if (stopMic) stopMic();
  }

  return { start, stop, load, feed: (samples) => segmenter.feed(samples) };
}
