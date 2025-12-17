// ===== VIDEO RECORDING SECTION =====
const recordTab = document.querySelector("#tab");
const recordScreen = document.querySelector("#screen");

const injectCamera = async () => {
  // inject the content script into the current page
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const tabId = tab[0].id;
  console.log("inject into tab", tabId);
  await chrome.scripting.executeScript({
    // content.js is the file that will be injected
    files: ["content.js"],
    target: { tabId },
  });
};

const removeCamera = async () => {
  // inject the content script into the current page
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const tabId = tab[0].id;
  console.log("inject into tab", tabId);
  await chrome.scripting.executeScript({
    // content.js is the file that will be injected
    func: () => {
      const camera = document.querySelector("#Fluidy-camera");
      if (!camera) return;
      document.querySelector("#Fluidy-camera").style.display = "none";
    },
    target: { tabId },
  });
};

// check chrome storage if recording is on
const checkRecording = async () => {
  const recording = await chrome.storage.local.get(["recording", "type"]);
  const recordingStatus = recording.recording || false;
  const recordingType = recording.type || "";
  console.log("recording status", recordingStatus, recordingType);
  return [recordingStatus, recordingType];
};

const initVideoRecording = async () => {
  const recordingState = await checkRecording();

  console.log("recording state", recordingState);

  if (recordingState[0] === true) {
    if (recordingState[1] === "tab") {
      recordTab.innerText = "Stop Recording ...";
      recordTab.style.background = "#ff4d4d";     
      recordTab.style.color = "white";
    } else {
      recordScreen.innerText = "Stop Recording ...";
      recordScreen.style.background = "#ff4d4d";     
      recordScreen.style.color = "white";
    }
  }

  const updateRecording = async (type) => {
    console.log("start recording", type);

    const recordingState = await checkRecording();

    if (recordingState[0] === true) {
      // stop recording
      chrome.runtime.sendMessage({ type: "stop-recording" });
      removeCamera();
    } else {
      // send message to service worker to start recording
      chrome.runtime.sendMessage({
        type: "start-recording",
        recordingType: type,
      });
      injectCamera();
    }

    // close popup
    window.close();
  };

  recordTab.addEventListener("click", async () => {
    console.log("updateRecording tab clicked");
    updateRecording("tab");
  });

  recordScreen.addEventListener("click", async () => {
    console.log("updateRecording screen clicked");
    updateRecording("screen");
  });
};

// ===== AUDIO RECORDING SECTION =====
async function initAudioRecording() {
  const recordBtn = document.getElementById('audio-record-btn');
  const fileUpload = document.getElementById('audio-file-upload');
  const uploadStatus = document.getElementById('audio-upload-status');
  
  if (recordBtn) {
    recordBtn.addEventListener('click', async () => {
      // Open audio recording in a new tab (like desktopRecord.html does for screen recording)
      const audioRecordPath = chrome.runtime.getURL("audioRecord.html");
      await chrome.tabs.create({
        url: audioRecordPath,
        active: true
      });
      window.close();
    });
  }

  if (fileUpload) {
    fileUpload.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      uploadStatus.textContent = `Selected: ${file.name}`;
      
      // Open audio recording page with file parameter
      const audioRecordPath = chrome.runtime.getURL("audioRecord.html");
      const tab = await chrome.tabs.create({
        url: audioRecordPath,
        active: true
      });

      // Wait a bit for the page to load, then send the file
      setTimeout(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'process-audio-file',
            audioData: e.target.result,
            fileName: file.name,
            fileType: file.type
          });
        };
        reader.readAsDataURL(file);
      }, 1000);

      window.close();
    });
  }
}

// ===== TAB SWITCHING =====
function initTabSwitching() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      button.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

// ===== INITIALIZATION =====
const init = async () => {
  initVideoRecording();
  initTabSwitching();
  initAudioRecording();
};

init();
