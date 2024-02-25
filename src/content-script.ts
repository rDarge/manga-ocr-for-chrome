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

        //Debugging image translation issues
        // debugWindow.present(response.debug.cropped224URL);
        sendResponse("thanks");
    } else if (response.type === 'TranslationResponse') {
        const translation = response as TranslationResponse
        //Display translated results 
        if(translation.error) {
            toast("Translation request failed. Check extension logs for additional details.")
            controller.resetTranslationButton()
        } else {
            controller.addTranslationResult(response.payload.messages);
        }
    } else if (response.type === 'VocabResponse') {
        console.log(response.payload.result)
        controller.addVocab(response.payload.result, response.payload.index);
    } else if (response.type === 'TranslateOneResponse') {
        console.log(response.payload.result)
        controller.addSingleTranslationResult(response.payload.result, response.payload.index);
    } else if (response.type ==='AnkiDeckNamesResponse') {
        console.log(response.payload);
        if(response.payload.error) {
            toast(`Could not connect to Anki: ${response.payload.error}`)
            controller.failedToConnectToAnki(response.payload.error);
        } else {
            controller.connectToAnki(response.payload.names)
        }
    } else if (response.type === 'EnableOCR') {
        controller.show();
    } else if (response.type === 'DisableOCR') {
        controller.hide();
        debugWindow.hide();
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
    if(w < 10 || h < 10) {
        console.debug("Capture area too small; ignoring.");
        toast("Capture area too small, try again!")
        // controller.cancelCaptureResult()
        return;
    }

    controller.noteCaptureStarted()
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
    toast("Starting new capture!")
    chrome.runtime.sendMessage(message);
}


const bridge: OCRBridge = {

    //Called to create a new area for OCR
    newCapture: (ev: MouseEvent) => {
        //Remove control and debug elements during screenshot
        controller.hide();
        debugWindow.hide();
        pluginDiv.classList.add("ocr-on-top")
        createCaptureCanvas(pluginDiv, (parameters) => {
            pluginDiv.classList.remove("ocr-on-top")
            startCapture(parameters);
        }, () => {
            pluginDiv.classList.remove("ocr-on-top")
            controller.cancelCaptureResult();
        })
    },

    newTranslation: (messages: string[]) => {
        //Pass request to service-worker for processing
        const message: TranslationRequest = {
            type: 'TranslationRequest',
            payload: { messages }
        };
        chrome.runtime.sendMessage(message);
    },

    translateOne: (message: string, context: string, index: number) => {
        //Pass request to service-worker for processing
        const request: TranslateOneRequest = {
            type: 'TranslateOneRequest',
            payload: { 
                text: message,
                context,
                index
             }
        };
        chrome.runtime.sendMessage(request);
    },

    getVocab: (text: string, index: number) => {
        const message: VocabRequest = {
            type: 'VocabRequest',
            payload: {
                text,
                index
            }
        }
        chrome.runtime.sendMessage(message);
    },

    connectToAnki: () => {
        const message: AnkiDeckNamesRequest = {
            type: 'AnkiDeckNamesRequest',
            payload: {}
        }
        chrome.runtime.sendMessage(message)
    },

    sendToAnki: (deck: string, front: string, back: string) => {
        const date = new Date()
        const dateTags = "date_added::" + date.getFullYear() + "::" + date.getMonth() + "::" + date.getDate()
        const backWithSrc = `${back}<hr><small><a href="${document.URL}">original source</a></small>`; 
        const message: AnkiNewCardRequest = {
            type: 'AnkiNewCardRequest',
            payload: {
                deck,
                front, 
                back: backWithSrc,
                tags: [
                    document.URL,
                    document.location.origin,
                    dateTags
                ]
            }
        }
        chrome.runtime.sendMessage(message);
    },
}



const toast = (message: string) => {
    const div = document.createElement("div");
    div.textContent = message
    div.classList.add("toast", "show");
    pluginDiv.appendChild(div)
    setTimeout(() => {
        div.remove()
    }, 1900)
}

// Plugin Div
const pluginDiv = document.createElement('div');
pluginDiv.classList.add("ocr-extension-root");
document.body.append(pluginDiv);

// Add UI elements
const controller = new OCRControlElement(pluginDiv, bridge);
const debugWindow = new OCRDebugElement(pluginDiv);

