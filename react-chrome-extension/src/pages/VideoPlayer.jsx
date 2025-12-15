import React, { useEffect } from "react";

export default function VideoPlayer() {
  useEffect(() => {
    chrome.runtime.onMessage.addListener(handle);
    return () => chrome.runtime.onMessage.removeListener(handle);
  }, []);

  function handle(msg) {
    if (msg?.type === "play-video") {
      const vid = document.getElementById("recorded-video");
      if (msg.videoUrl) vid.src = msg.videoUrl;
      if (msg.base64) vid.src = "data:video/webm;base64," + msg.base64;
      vid.play().catch(()=>{});
    }
  }

  return (
    <div style={{padding:20}}>
      <h2>Recorded video</h2>
      <video id="recorded-video" controls style={{width:"100%"}}></video>
    </div>
  );
}
