// background/service-worker.js (module)
const ensureOffscreen = async () => {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL("offscreen.html"),
      reasons: ["USER_MEDIA", "DISPLAY_MEDIA"],
      justification: "Record tab media"
    });
  }
};

chrome.runtime.onMessage.addListener(async (message, sender) => {
  console.log("bg message", message);
  if (message?.type === "start-recording") {
    const type = message.recordingType;
    await chrome.storage.local.set({ recording: true, type });
    chrome.action.setIcon({ path: "icons/recording.png" });
    if (type === "tab") {
      await ensureOffscreen();
      // get stream id for active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;
      chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (streamId) => {
        if (chrome.runtime.lastError) {
          console.error("tabCapture error", chrome.runtime.lastError);
          return;
        }
        chrome.runtime.sendMessage({ type: "start-recording", data: streamId });
      });
    } else if (type === "screen") {
      // open desktop record page and message it
      const currentTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
      const url = chrome.runtime.getURL("desktopRecord.html");
      const newTab = await chrome.tabs.create({ url, active: true, pinned: true, index: 0 });
      // wait and retry sendMessage until content is ready
      const sendMsg = (tries = 10) => {
        chrome.tabs.sendMessage(newTab.id, { type: "start-recording", focusedTabId: currentTab?.id }, (resp) => {
          if (chrome.runtime.lastError && tries > 0) {
            setTimeout(() => sendMsg(tries - 1), 300);
          }
        });
      };
      setTimeout(() => sendMsg(), 500);
    }
  } else if (message?.type === "stop-recording") {
    await chrome.storage.local.set({ recording: false, type: "" });
    chrome.action.setIcon({ path: "icons/not-recording.png" });
    // forward stop to offscreen or desktop tab
    chrome.runtime.sendMessage({ type: "stop-recording" });
    // also ask visible tabs to remove camera
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          const el = document.getElementById("Fluidy-camera");
          if (el) {
            const v = el.querySelector("video");
            if (v && v.srcObject) v.srcObject.getTracks().forEach(t => t.stop());
            el.remove();
          }
        }
      }).catch(() => {});
    }
  } else if (message?.type === "recorded" && message.url) {
    // open video.html to play result
    const url = chrome.runtime.getURL("video.html");
    const newTab = await chrome.tabs.create({ url });
    const sendMsg = (tries = 10) => {
      chrome.tabs.sendMessage(newTab.id, { type: "play-video", videoUrl: message.url }, (resp) => {
        if (chrome.runtime.lastError && tries > 0) {
          setTimeout(() => sendMsg(tries - 1), 300);
        }
      });
    };
    setTimeout(() => sendMsg(), 500);
  }
});
