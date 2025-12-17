// // injecter le content script dans la page 

// const recordTab = document.querySelector('#tab');
// const recordScreen = document.querySelector('#screen');

// const injectCamera = async () => {
//     const tab = await chrome.tabs.query({active: true, currentWindow: true});
    
//     if (!tab || tab.length === 0) {
//         console.log("No active tab found");
//         return;
//     }

//     const tabId = tab[0].id;
//     console.log("inject into tab: ", tabId);

//     await chrome.scripting.executeScript({
//         target: { tabId },
//         files: ["content.js"],
//     });    
// }


// // Check chrome storage if recording is on
// const checkRecording = async () => {
//     const recording = await chrome.storage.local.get('recording');
//     const recordingStatus = recording.recording || false;
//     const recordingType = recording.type || '';
//     console.log("recording status: ", recordingStatus, recordingType);
//     return [recordingStatus, recordingType];
// }

// const init = async () => {
//     const recordingState = await checkRecording();

//     console.log('recording state: ', recordingState);

//     if (recordingState[0] === true) {
//         if(recordingState[1] === 'screen') {
//             recordTab.innerText = 'Stop recording';
//         } else {
//             recordScreen.innerText = 'Stop recording';
//         }
//     } 
    
//     const updateRecording = async (type) => {
//         console.log("Start recording : ", type);

//         const recordingState = await checkRecording();

//         if (recordingState[0] === true ) {
//             // we need to stop recording
//             chrome.runtime.sendMessage({type : 'stop-recording'});

//         } else {

//             // send a message to our service worker to start working
//             chrome.runtime.sendMessage({ type: 'start-recording', recordingType: type });
            
//             await injectCamera(); // sense we know we are going to start recording we need to inject the camera

//         }

//         window.close();
//     }
    
//     // const updateRecording = async (type) => {
//     //     console.log("Start recording : ", type);

//     //     const [isRecording] = await checkRecording();

//     //     if (isRecording) {
//     //         // STOP
//     //         chrome.runtime.sendMessage({ type: 'stop-recording' }).catch(() => {});
//     //     } else {
//     //         // FIRST inject camera
//     //         await injectCamera();
            
//     //         // THEN start recording
//     //         chrome.runtime.sendMessage({ type: 'start-recording', recordingType: type }).catch(() => {});
//     //     }

//     //     setTimeout(() => window.close(), 200);
//     // }


//     recordTab.addEventListener('click', async () => {
//         console.log("record tab clicked");
//         updateRecording('tab');
//     })
    
//     recordScreen.addEventListener('click', async () => {
//         console.log("record screen clicked");
//         updateRecording('screen');
//     })

// }
// // Listen for when either record tab or record screen is clicked

// init()

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

const init = async () => {
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

init();