

window.cameraId = "Fluidy-camera";
window.camera = document.getElementById(cameraId);

// Vérifier si la camera existe
if (camera) {
    console.log("Camera trouvé : ", camera);

    // make sure it is visible
    document.querySelector('#Fluidy-camera').style.display='block';
} else {
    const cameraElement = document.createElement('iframe');
    cameraElement.id = cameraId;
    cameraElement.setAttribute('style',
        `
        all: initial;
        position : fixed;
        width : 200px;
        height : 200px;
        border-radius : 100px;
        background : black;
        z-index : 9999999;
        top: 10px;
        right: 10px;
        border: none;
        `
    );

    // set permessions for iframe - access camera andd microphone
    cameraElement.setAttribute('allow', 'camera; microphone');
    cameraElement.src = chrome.runtime.getURL('camera.html');
    document.body.appendChild(cameraElement);

    document.querySelector('#Fluidy-camera').style.display='block';
}

