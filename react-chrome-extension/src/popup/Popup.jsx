import React, { useEffect, useState } from "react";

const  Popup = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [type, setType] = useState("");

  useEffect(() => {
    // read state
    chrome.storage.local.get(["recording", "type"], (res) => {
      setIsRecording(!!res.recording);
      setType(res.type || "");
    });
  }, []);

  const start = async (t) => {
    // inject camera first if needed
    await chrome.scripting.executeScript({
      target: { tabId: (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id },
      files: ["/src/content/cameraContent.js"]
    }).catch(() => {});
    
    chrome.runtime.sendMessage({ type: "start-recording", recordingType: t });
    setIsRecording(true);
    setType(t);
    setTimeout(() => window.close(), 300);
  };

  const stop = () => {
    chrome.runtime.sendMessage({ type: "stop-recording" });
    setIsRecording(false);
    setType("");
    setTimeout(() => window.close(), 300);
  };

  return (
    <div className="w-[449px] h-[492px] bg-white rounded-xl shadow-2xl p-4">
      <header className="bg-[#004068] text-white p-4 rounded-lg mb-6">
        <h1 className="text-lg font-bold text-center">Fluidy Screen Recorder</h1>
      </header>

      <div className="flex flex-col gap-3 items-center">
        <button
          className="bg-[#004068] text-white px-4 py-2 rounded-lg"
          onClick={() => start("tab")}
        >
          {isRecording && type === "tab" ? "Stop recording" : "Record Tab"}
        </button>

        <button
          className="bg-[#004068] text-white px-4 py-2 rounded-lg"
          onClick={() => start("screen")}
        >
          {isRecording && type === "screen" ? "Stop recording" : "Record Screen"}
        </button>

        <button
          className="bg-red-500 text-white px-4 py-2 rounded-lg mt-4"
          onClick={stop}
        >
          Stop Recording
        </button>
      </div>
    </div>
  );
}

export default Popup;
