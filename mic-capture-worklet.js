// Passes raw microphone audio from the browser's audio system to the page.
class MicCapture extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0][0];
    if (channel) this.port.postMessage(channel.slice());
    return true;
  }
}

registerProcessor("mic-capture", MicCapture);
