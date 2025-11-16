

const cameraId = "Fluidy-camera";
const camera = document.getElementById(cameraId);

// Vérifier si la camera existe
if (camera) {
    console.log("Camera trouvé : ", camera);
} else {
    const cameraElement = document.createElement('div');
    cameraElement.id = cameraId;
    cameraElement.setAttribute('style',
        `position : fixed;
        width : 200px;
        hight : 200px;
        border-radius : 100px;
        background : black;
        z-index : 9999999;
        `
    );
    document.body.appendChild(cameraElement);
}

