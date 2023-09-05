import { OCRControlElement } from "./elements/ocr-control-element";
import { OCRDebugElement } from "./elements/ocr-debug-window";
import { movableElement } from "./util";

//Constants
const canvasColor = 'rgba(163, 163, 194, 0.4)';
const guidelineColor = 'rgba(124, 124, 163, 0.4)';
const excludedColor = 'rgba(194, 163, 163, 0.4)';


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
    }
});

//Called when a new area has been selected for OCR
const startCapture = async (x1: number, x2: number, y1: number, y2: number) => {
    const viewport_w = window.innerWidth;
    const viewport_h = window.innerHeight;
    const pixel_ratio = window.devicePixelRatio;
    const x = x1 < x2 ? x1 : x2;
    const y = y1 < y2 ? y1: y2;
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    // Select a larger region to account for the center-crop operation in the image preprocessing
    const margin_w = w * .0625;
    const margin_h = h * .0625;
    const message: Message = {
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

    //Insert Canvas overlay
    const canvas = document.createElement('canvas');
    pluginDiv.append(canvas);
    canvas.classList.add("selection-canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    //Canvas cleanup
    const doneWithCanvas = () => {
        canvas.remove();
    }

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = canvasColor;
    ctx.fillRect(0,0, canvas.width, canvas.height);

    let x1: number = 0;
    let y1: number = 0;
    let x2: number = 0;
    let y2: number = 0;

    //Until they click, we'll draw guidelines at the mouse position
    canvas.onmousemove = (move: MouseEvent) => {
        const moveRect = canvas.getBoundingClientRect();
        const x = move.clientX - moveRect.left; 
        const y = move.clientY - moveRect.top;

        //Draw guidelines
        ctx.clearRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = canvasColor;
        ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = guidelineColor;
        ctx.fillRect(0,y,canvas.width, 1); //Horizontal Guideline
        ctx.fillRect(x,0,1,canvas.height); //Vertical Guideline 
    }

    //When the user clicks, we note the coordinates and prepare to capture a region
    canvas.onmousedown = ((firstClick: MouseEvent) => {
        if(firstClick.button !== 0) {
            return;
        }

        const firstRect = canvas.getBoundingClientRect();
        x1 = firstClick.clientX - firstRect.left; 
        y1 = firstClick.clientY - firstRect.top;

        //Draw clear capture box around selected area
        canvas.onmousemove = (move: MouseEvent) => {
            const moveRect = canvas.getBoundingClientRect();
            x2 = move.clientX - moveRect.left; 
            y2 = move.clientY - moveRect.top;

            //Update canvas overlay to show target selection
            ctx.clearRect(0,0, canvas.width, canvas.height);
            ctx.fillStyle = canvasColor;
            ctx.fillRect(0,0, canvas.width, canvas.height);
            const x = x1 < x2 ? x1 : x2;
            const y = y1 < y2 ? y1 : y2;
            const w = Math.abs(x2 - x1);
            const h = Math.abs(y2 - y1);
            const margin_w = w * .0625;
            const margin_h = h * .0625;
            ctx.fillStyle = excludedColor;
            ctx.fillRect(x - margin_w, y - margin_h, w + 2*margin_w, h + 2*margin_h);
            if(w > 10 && h > 10) {
                //Window probably too small for meaningful OCR otherwise
                //a margin of about 12% will be cut off from the sample
                ctx.clearRect(x, y, w, h);    
            }
        }

        //Finalize selection when they mouseup
        canvas.onmouseup = (lastClick: MouseEvent) => {
            if(firstClick.button !== 0) {
                return;
            }

            const lastRect = canvas.getBoundingClientRect();
            console.debug("full canvas size is: ",lastRect);
            
            console.debug("Window screen parameters", {
                screenWidth: window.screen.width,
                screenHeight: window.screen.height, 
                screenTop: window.screenTop,
                screenLeft: window.screenLeft,
                screenX: window.screenX,
                screenY: window.screenY,
                lastRect,
                canvasClientTop: canvas.clientTop,
                canvasClientLeft: canvas.clientLeft,
                canvasClientHeight: canvas.clientHeight,
                canvasClientWidth: canvas.clientWidth
            });
            x2 = lastClick.clientX - lastRect.left;
            y2 = lastClick.clientY - lastRect.top;

            startCapture(x1, x2, y1, y2);
            
            doneWithCanvas();
        };

        //Or let them cancel with keydown
        canvas.onkeydown = (ev: KeyboardEvent) => {
            if(ev.key === 'Escape') {
                doneWithCanvas();
            }
        }; 
    })
}

// Plugin Div
const pluginDiv = document.createElement('div');
pluginDiv.classList.add("ocr-extension-root");
document.body.append(pluginDiv);

// Add UI elements
const controller = new OCRControlElement(pluginDiv, newCapture);
const debugWindow = new OCRDebugElement(pluginDiv);

