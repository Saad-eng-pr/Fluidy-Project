import React, { useEffect } from "react";

function DesktopRecordApp() {
  useEffect(() => {
    chrome.runtime.onMessage.addListener(handleMsg);
    return () => chrome.runtime.onMessage.removeListener(handleMsg);
  }, []);

  function handleMsg(message) {
    if (message?.type === "start-recording") {
      startRecording(message.focusedTabId);
    } else if (message?.type === "play-video") {
      // ignore
    }
  }

  async function startRecording(focusedTabId) {
    chrome.desktopCapture.chooseDesktopMedia(["screen", "window"], async function (streamId) {
      if (!streamId) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: streamId } },
          video: { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: streamId } }
        });

        const microphone = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(()=>null);

        const tracks = [];
        if (stream.getVideoTracks().length) tracks.push(stream.getVideoTracks()[0]);
        if (microphone && microphone.getAudioTracks().length) tracks.push(microphone.getAudioTracks()[0]);
        else if (stream.getAudioTracks().length) tracks.push(stream.getAudioTracks()[0]);

        const combined = new MediaStream(tracks);
        const recorder = new MediaRecorder(combined, { mimeType: "video/webm" });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          chrome.runtime.sendMessage({ type: "recorded", url });
        };
        recorder.start();
        // store on window to stop later
        window._fluidy_recorder = recorder;
        window._fluidy_streams = [stream, microphone].filter(Boolean);
        // focus back
        if (focusedTabId) chrome.tabs.update(focusedTabId, { active: true });
      } catch (err) {
        console.error(err);
      }
    });
  }

  // UI: minimal page telling user to wait
  return (
    <div style={{padding:20}}>
      <h2>Recording (desktop)...</h2>
      <p>This tab manages screen recording. Close to stop.</p>
      <button onClick={() => {
        if (window._fluidy_recorder?.state === 'recording') window._fluidy_recorder.stop();
        (window._fluidy_streams||[]).forEach(s=>s.getTracks().forEach(t=>t.stop()))
      }}>Stop</button>
    </div>
  );
}

export default DesktopRecordApp;
