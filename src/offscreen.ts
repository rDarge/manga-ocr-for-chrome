chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log("Received message ", message, sender);
    if (message.target === 'offscreen' && message.type === 'take-capture') {
        const payload = message.data as CaptureRequest;
        const result = await takeCapture(payload);
        const response = {...payload, imageData: result};
        sendResponse(response);
    } else {
        throw new Error('Unsupported message', message);
    }
});

interface CaptureRequest {
    tabId: number,
    streamId: string,
    points: {
        x1: number,
        x2: number,
        y1: number,
        y2: number
    }
}

async function takeCapture(payload: CaptureRequest) {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            //@ts-ignore 
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: payload.streamId
            }
        }
    });
    const track = mediaStream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    const imageBitmap = await imageCapture.grabFrame();


    // Resize image to 256x256
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false});
    canvas.width = 256;
    canvas.height = 256;
    ctx.drawImage(imageBitmap, 0, 0, 256, 256);
    const dataUrl = canvas.toDataURL();
    console.log("The resized image is ", dataUrl);

    // Center-crop image at 224 x 224
    const croppedData = ctx.getImageData(16,16,224,224);

    // // Extract from resized canvas
    // canvas.height = 224;
    // canvas.width = 224;
    // ctx.putImageData(croppedData, 0, 0);
    // const croppedUrl = canvas.toDataURL();
    // console.log("The cropped image is ", croppedUrl);
    
    
    //Remove alpha channel
    const filteredData = croppedData.data.filter((_, index) => (index + 1) % 4);

    //TODO proper Normalization from Transformer: image = (image - image_mean) / image_std, where image_mean is 0.5, image_std is 0.5
    const normalize = (v: number) => ((v / 255) * 2) - 1;

    const r = [];
    const g = [];
    const b = [];
    for(let i = 0; i < filteredData.length; i+=3) {
      r.push(normalize(filteredData[i]));
      g.push(normalize(filteredData[i+1]));
      b.push(normalize(filteredData[i+2]));
    }
    const normalizedData = [...r, ...g, ...b];
    
    
    return new Float32Array(normalizedData);
    // console.log("The cropped data is ", tensorData);

    
    // chrome.tabs.sendMessage(payload.tabId, );
}