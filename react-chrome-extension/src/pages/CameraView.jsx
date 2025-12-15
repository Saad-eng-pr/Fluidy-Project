import React, { useEffect } from "react";

export default function CameraView() {
  useEffect(() => {
    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.width = "200px";
    video.style.height = "200px";
    video.style.objectFit = "cover";
    document.body.appendChild(video);
    navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(s => {
      video.srcObject = s;
      window._cameraStream = s;
    }).catch(()=>{});
    return () => {
      if (window._cameraStream) window._cameraStream.getTracks().forEach(t=>t.stop());
      video.remove();
    }
  }, []);

  return <div style={{padding:20}}>Camera window</div>;
}
