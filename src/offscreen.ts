chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    console.log("Received message ", request, sender);
    const message = request as Message;
    if (message.type == 'ProcessBackend') {
        const payload = message.payload as CaptureRequest;
        const result = await takeCapture(payload);
        const response: Message = {
            type: 'OCRComplete',
            payload: { ...payload, imageData: result.preprocessed },
            debug: result.debug
        };
        console.log("Response is", response);
        chrome.runtime.sendMessage(response);
    }
});

async function takeCapture(payload: CaptureRequest) {
    const points = payload.points;

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
    track.stop();

    //Calculate difference between viewport and imagebitmap, 
    //This will be used to properly offset the crop window
    const diff_w = imageBitmap.width - points.viewport_w;
    const diff_h = imageBitmap.height - points.viewport_h;
    const offset_x = points.x + diff_w / 2;
    const offset_y = points.y + diff_h / 2;
    console.log("Image differeces: ", diff_w, diff_h);
    
    //Create canvas for image manipulation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });

    // Draw original image to canvas 
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    ctx.drawImage(imageBitmap, 0, 0, imageBitmap.width, imageBitmap.height);
    ctx.fillStyle ='rgba(163, 194, 163, 0.4)';
    ctx.fillRect(offset_x, offset_y, points.w, points.h);
    const canvasRedrawnURL = canvas.toDataURL();

    
    // const croppedImage = ctx.getImageData(points.x, points.y, points.w, points.h);

    // Draw cropped image scaled back onto canvas
    canvas.width = 256;
    canvas.height = 256;
    ctx.drawImage(imageBitmap, offset_x, offset_y, points.w, points.h, 0, 0, 256, 256);
    const cropped256URL = canvas.toDataURL();
    console.log("The resized image is ", cropped256URL);

    // Center-crop image at 224 x 224
    const croppedData = ctx.getImageData(16, 16, 224, 224);

    // // Extract from resized canvas
    canvas.height = 224;
    canvas.width = 224;
    ctx.putImageData(croppedData, 0, 0);
    const cropped224URL = canvas.toDataURL();
    console.log("The cropped image is ", cropped224URL);


    //Remove alpha channel
    const filteredData = croppedData.data.filter((_, index) => (index + 1) % 4);

    //TODO proper Normalization from Transformer: image = (image - image_mean) / image_std, where image_mean is 0.5, image_std is 0.5
    const normalize = (v: number) => ((v / 255) * 2) - 1;

    const r = [];
    const g = [];
    const b = [];
    for (let i = 0; i < filteredData.length; i += 3) {
        r.push(normalize(filteredData[i]));
        g.push(normalize(filteredData[i + 1]));
        b.push(normalize(filteredData[i + 2]));
    }
    const normalizedData = [...r, ...g, ...b];

    return {
        preprocessed: normalizedData, 
        debug: { cropped224URL, cropped256URL, canvasRedrawnURL}
    };
    // console.log("The cropped data is ", tensorData);


    // chrome.tabs.sendMessage(payload.tabId, );
}