// Cuts microphone audio into short pieces of speech at natural pauses, because
// the local model works on finished clips rather than a live stream. It also
// skips silence, which the model can otherwise "hear" as made-up words.

(function () {
  const SAMPLE_RATE = 16000;
  const FRAME_SIZE = 480; // 30 milliseconds of audio
  const frames = (seconds) => Math.round((seconds * SAMPLE_RATE) / FRAME_SIZE);

  const MIN_LEVEL = 0.008; // anything quieter never counts as speech
  const LOUDER_THAN_ROOM = 3; // speech must be this many times the room's noise
  const FRAMES_TO_START = 3; // loud frames in a row before speech begins
  const LEAD_IN = frames(0.3); // audio kept from just before speech begins
  const PAUSE_TO_END = frames(0.6); // silence that ends a piece
  const MIN_SPEECH = frames(0.3); // shorter sounds are treated as noise
  const MAX_LENGTH = frames(8); // long speech is cut here to keep up
  const OVERLAP = frames(0.5); // repeated after a cut, so a spell name isn't split

  function joinFrames(list) {
    const audio = new Float32Array(list.length * FRAME_SIZE);
    list.forEach((frame, i) => audio.set(frame, i * FRAME_SIZE));
    return audio;
  }

  function level(frame) {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
    return Math.sqrt(sum / frame.length);
  }

  function createSegmenter(onSegment) {
    let partial = new Float32Array(FRAME_SIZE);
    let partialLength = 0;
    let lead = [];
    let piece = null;
    let loudInARow = 0;
    let quietInARow = 0;
    let loudFrames = 0;
    let roomLevel = 0.002;

    function finishPiece() {
      if (loudFrames >= MIN_SPEECH) onSegment(joinFrames(piece));
      piece = null;
      lead = [];
      loudInARow = 0;
    }

    function handleFrame(frame) {
      const current = level(frame);
      const isLoud = current > Math.max(MIN_LEVEL, roomLevel * LOUDER_THAN_ROOM);

      if (!piece) {
        if (!isLoud) roomLevel = roomLevel * 0.995 + current * 0.005;
        lead.push(frame);
        if (lead.length > LEAD_IN) lead.shift();
        loudInARow = isLoud ? loudInARow + 1 : 0;
        if (loudInARow >= FRAMES_TO_START) {
          piece = lead;
          lead = [];
          quietInARow = 0;
          loudFrames = loudInARow;
        }
        return;
      }

      piece.push(frame);
      if (isLoud) {
        loudFrames++;
        quietInARow = 0;
      } else {
        quietInARow++;
      }

      if (quietInARow >= PAUSE_TO_END) {
        finishPiece();
      } else if (piece.length >= MAX_LENGTH) {
        const overlap = piece.slice(-OVERLAP);
        onSegment(joinFrames(piece));
        piece = overlap;
        loudFrames = 0;
        quietInARow = 0;
      }
    }

    function feed(samples) {
      let offset = 0;
      while (offset < samples.length) {
        const count = Math.min(FRAME_SIZE - partialLength, samples.length - offset);
        partial.set(samples.subarray(offset, offset + count), partialLength);
        partialLength += count;
        offset += count;
        if (partialLength === FRAME_SIZE) {
          handleFrame(partial);
          partial = new Float32Array(FRAME_SIZE);
          partialLength = 0;
        }
      }
    }

    return { feed };
  }

  if (typeof module !== "undefined") module.exports = { createSegmenter, SAMPLE_RATE };
  else window.createSegmenter = createSegmenter;
})();
