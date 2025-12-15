chrome.runtime.onMessage.addListener(async (message) => {
  if (message?.type === "start-recording" && message?.data) {
    startRecording(message.data);
  } else if (message?.type === "stop-recording") {
    stopRecording();
  }
});

let recorder = null;
let recordedChunks = [];
let currentStreams = [];

async function startRecording(streamId) {
  try {
    if (recorder && recorder.state === "recording") return;

    const media = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId
        }
      },
      video: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId
        }
      }
    });

    // optional: capture microphone and mix
    let microphone;
    try {
      microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      microphone = null;
    }

    // combine tracks
    const tracks = [];
    if (media.getVideoTracks().length) tracks.push(media.getVideoTracks()[0]);
    if (microphone && microphone.getAudioTracks().length) {
      tracks.push(microphone.getAudioTracks()[0]);
    } else if (media.getAudioTracks().length) {
      tracks.push(media.getAudioTracks()[0]);
    }

    const combined = new MediaStream(tracks);

    currentStreams.push(media);
    if (microphone) currentStreams.push(microphone);

    recorder = new MediaRecorder(combined, { mimeType: "video/webm" });
    recordedChunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) recordedChunks.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      // send back to service worker to open video tab
      chrome.runtime.sendMessage({ type: "recorded", url });
      // cleanup
      recordedChunks = [];
    };

    recorder.start(1000);
  } catch (err) {
    console.error("offscreen startRecording error", err);
  }
}

function stopRecording() {
  try {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
    currentStreams.forEach((s) => {
      s.getTracks().forEach((t) => t.stop());
    });
    currentStreams = [];
  } catch (e) {
    console.warn("offscreen stop error", e);
  }
}
