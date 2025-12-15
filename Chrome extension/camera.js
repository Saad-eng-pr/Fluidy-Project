const runCode = async () => {
    const cameraElement = document.querySelector('#camera');
    
    console.log('cameraElement : ', cameraElement);

    // first request permission to use camera and microphone
    const permissions = await navigator.permissions.query({
        name: "camera",
    });
    
    //prompt user to enable camera and microphone
    if(permissions.state === 'prompt') {
        await navigator.mediaDevices.getUserMedia({audio: true, video: true});
        return;
    }

    if(permissions.state === 'denied') {
        alert("Camera permissions denied")
        return
    }

    console.log(permissions);

    const startCamera = async() => {
        const videoElement = document.createElement('video');
        videoElement.setAttribute('style', `
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
            transform: scaleX(-1);
        `);
        videoElement.setAttribute('autoplay', true);
        videoElement.setAttribute('muted', true);

        const cameraStream = await navigator.mediaDevices.getUserMedia({ audio : false, video: true});

        videoElement.srcObject = cameraStream;
        
        cameraElement.appendChild(videoElement);
    }

    startCamera();
}

runCode()