import { createCaptureCanvas } from "./elements/ocr-capture-canvas";
import { OCRControlElement } from "./elements/ocr-control-element";
import { OCRDebugElement } from "./elements/ocr-debug-window";


//When a request has completed, it will route here.
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    console.log("Received message back from ", sender, request);

    const response = request as Message;
    if(response.type === 'OCRComplete') {

        //Process OCR
        const payload = response.payload as BackendResponse;
        controller.addCaptureResult(payload.text);
        controller.enableOCRButton();

        //Debugging image translation issues
        debugWindow.present(response.debug.cropped224URL);
        sendResponse("thanks");
    } else if (response.type === 'TranslationResponse') {
        //Display translated results 
        controller.addTranslationResult(response.payload.messages);
    }
});

//Called when a new area has been selected for OCR
const startCapture = async (points: OCRCaptureParameters) => {
    const viewport_w = window.innerWidth;
    const viewport_h = window.innerHeight;
    const pixel_ratio = window.devicePixelRatio;
    const x = points.x1 < points.x2 ? points.x1 : points.x2;
    const y = points.y1 < points.y2 ? points.y1: points.y2;
    const w = Math.abs(points.x2 - points.x1);
    const h = Math.abs(points.y2 - points.y1);
    // Select a larger region to account for the center-crop operation in the image preprocessing
    const margin_w = w * .0625;
    const margin_h = h * .0625;
    const message: OCRStartRequest = {
        type: 'OCRStart',
        payload: {
            x: x - margin_w,
            y: y - margin_h,
            w: w + 2 * margin_w,
            h: h + 2 * margin_h,
            viewport_w,
            viewport_h,
            pixel_ratio
        }
    }
    console.debug("Beginning new capture", message); 
    chrome.runtime.sendMessage(message);
    setTimeout(() => {
        controller.show();
        controller.disableOCRButton("Image is processing");
    }, 100);
}

//Called to create a new area for OCR
const newCapture = (ev: MouseEvent) => {
    //Remove control and debug elements during screenshot
    controller.hide();
    debugWindow.hide();
    createCaptureCanvas(pluginDiv, (parameters) => {
        startCapture(parameters);
    })
}

const newTranslation = (messages: string[]) => {
    //Pass request to service-worker for processing
    const message: TranslationRequest = {
        type: 'TranslationRequest',
        payload: { messages }
    };
    chrome.runtime.sendMessage(message);
}

// Plugin Div
const pluginDiv = document.createElement('div');
pluginDiv.classList.add("ocr-extension-root");
document.body.append(pluginDiv);

// Add UI elements
const controller = new OCRControlElement(pluginDiv, newCapture, newTranslation);
const debugWindow = new OCRDebugElement(pluginDiv);

