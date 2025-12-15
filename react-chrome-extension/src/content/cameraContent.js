(function () {
  const cameraId = "Fluidy-camera";
  if (document.getElementById(cameraId)) {
    // already injected
    console.log("camera exists");
    return;
  }

  const container = document.createElement("div");
  container.id = cameraId;
  Object.assign(container.style, {
    position: "fixed",
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    right: "10px",
    top: "10px",
    zIndex: "2147483647",
    overflow: "hidden",
    background: "black"
  });

  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  Object.assign(video.style, {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)"
  });

  container.appendChild(video);
  document.documentElement.appendChild(container);

  // Ask background/service for camera stream (if you designed it like that)
  // Or just start camera here:
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then((s) => {
      video.srcObject = s;
      // store reference for removal
      container.dataset._streamActive = "1";
    })
    .catch((e) => console.warn("camera access failed", e));

  // listen to messages to remove/stop
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action === "remove-camera") {
      const el = document.getElementById(cameraId);
      if (!el) return;
      const vid = el.querySelector("video");
      if (vid && vid.srcObject) {
        vid.srcObject.getTracks().forEach((t) => t.stop());
      }
      el.remove();
    }
  });
})();
