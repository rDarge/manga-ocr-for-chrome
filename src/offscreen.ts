import { OCRConfig, OCRModel } from "./ocr";

//Set up OCR model
const config: OCRConfig = {
    vocabURL: chrome.runtime.getURL('vocab.txt'),
    encoderModelURL: chrome.runtime.getURL('encoder_model.onnx'),
    decoderModelURL: chrome.runtime.getURL('decoder_model.onnx'),
    startupSampleURL: chrome.runtime.getURL('sample.csv'),
    startupSampleExpectation: "いつも何かに追われていて",
    skipStartupSample: true
};
const ocr = new OCRModel(config);

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    console.log("Received message ", request, sender);
    const message = request as Message;
    if (message.type == 'ProcessBackend') {
        const payload = message.payload as CaptureRequest;
        const result = await takeCapture(payload);
        const response: Message = {
            type: 'OCRComplete',
            payload: { ...payload, text: result.text },
            debug: result.debug
        };
        console.log("Response is", response);
        chrome.runtime.sendMessage(response);
    }
});

async function takeCapture(payload: CaptureRequest) {

    
    // const imageBitmap = await createImageBitmap(image);4

    //Calculate difference between viewport and imagebitmap, 
    //This will be used to properly offset the crop window
    //TODO calculate offsets precisely using canvas... the top/bottom bars may have different heights
    // const diff_w = imageBitmap.width - points.viewport_w;
    // const diff_h = imageBitmap.height - points.viewport_h;
    // const offset_x = points.x + diff_w / 2;
    // const offset_y = points.y + diff_h / 2;
    // console.log("Image differeces: ", diff_w, diff_h);
    
    //Create canvas for image manipulation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });

    // Draw original image to canvas 
    const points = payload.points;
    canvas.width = points.viewport_w;
    canvas.height = points.viewport_h;

    //Convert base64 image to bitmap
    console.log("loading image");
    const loadImage = (src: string) => new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (err) => reject(err));
        img.src = src;
    });
    const image = await loadImage(payload.image) as HTMLImageElement;

    //Wait for image to load
    console.log("image loaded;");
    ctx.drawImage(image, 0, 0, points.viewport_w, points.viewport_h);
    ctx.fillStyle ='rgba(163, 163, 194, 0.4)';
    ctx.fillRect(points.x, points.y, points.w, points.h);
    ctx.fillStyle ='rgba(163, 194, 163, 0.4)';
    // ctx.fillRect(offset_x, offset_y, points.w, points.h);
    const canvasRedrawnURL = canvas.toDataURL();

    // Draw cropped image scaled back onto canvas
    canvas.width = 256;
    canvas.height = 256;
    const scale = (original: number) => original * points.pixel_ratio;
    ctx.drawImage(image, scale(points.x), scale(points.y), scale(points.w), scale(points.h), 0, 0, 256, 256);
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

    // const payload = response.payload as BackendResponse;
    const imageData = new Float32Array(normalizedData);
    const result = await ocr.ocr(imageData);

    return {
        text: result,
        debug: { cropped224URL, cropped256URL, canvasRedrawnURL, originalURL: payload.image}
    };
}

ocr.init();