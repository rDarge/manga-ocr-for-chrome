import { OCRConfig, OCRModel } from "./ocr";

//Delete any pre-existing control elements...
const pluginId = "translation-control-window";
const existingControl = document.getElementById(pluginId);
if(existingControl) {
    existingControl.remove();
}

//Set up OCR model
const config: OCRConfig = {
    vocabURL: chrome.runtime.getURL('vocab.txt'),
    encoderModelURL: chrome.runtime.getURL('encoder_model.onnx'),
    decoderModelURL: chrome.runtime.getURL('decoder_model.onnx'),
    startupSampleURL: chrome.runtime.getURL('sample.csv'),
    startupSampleExpectation: "いつも何かに追われていて"
};
const ocr = new OCRModel(config);

//Constants
const canvasColor = 'rgba(163, 163, 194, 0.4)';
const excludedColor = 'rgba(194, 163, 163, 0.4)';

const pluginDiv = document.createElement('div');
pluginDiv.setAttribute("id", pluginId)
pluginDiv.setAttribute("style", "position:absolute; left: 0; right: 0; top: 0; bottom: 0; pointer-events: none");
document.body.append(pluginDiv);

const debugDiv = document.createElement('div');
const debugStyleShown = "position: absolute; left: 50%; top: 10%; border: 0.1rem solid; opacity: 75%; background-color: rgb(255, 255, 255)";
debugDiv.setAttribute("style", debugStyleShown);
debugDiv.innerText = "Debug contents go here";
pluginDiv.append(debugDiv);

//When a request has completed, it will route here.
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    console.log("Received message back from ", sender, request);

    const response = request as Message;
    if(response.type === 'OCRComplete') {

        //Process OCR
        const payload = response.payload as BackendResponse;
        const imageData = new Float32Array(payload.imageData);
        const result = await ocr.ocr(imageData);
        console.log("Final result is ", result);

        //Debugging image translation issues
        debugDiv.innerHTML = "";
        const ocrResult = document.createElement('p');
        ocrResult.innerText = result;
        debugDiv.append(ocrResult);

        const debugImage = document.createElement('img');
        debugImage.src = response.debug.cropped224URL;
        debugDiv.append(debugImage);
        
        sendResponse("thanks");
    }
});

const startCapture = async (x1: number, x2: number, y1: number, y2: number) => {
    const viewport_w = window.innerWidth;
    const viewport_h = window.innerHeight;
    const x = x1 < x2 ? x1 : x2;
    const y = y1 < y2 ? y1: y2;
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    const message: Message = {
        type: 'OCRStart',
        payload: {x,y,w,h,viewport_w,viewport_h}
    }
    console.log("Beginning new capture", message); 
    chrome.runtime.sendMessage(message);
}

const addUiButtons = () => {
    const controlDiv = document.createElement('div')
    controlDiv.setAttribute("style", "pointer-events: auto; position:absolute; left: 50%; right:50%; top: 10px; width: 200px; border: 0.1rem solid; border-radius: 0.05rem; padding: 1rem;");
    controlDiv.innerText = "OCR Model is loading..."
    pluginDiv.append(controlDiv);
    
    //Clear contents
    controlDiv.innerHTML = '';

    //Add button to initiate OCR capture and processing
    const startOCRButton = document.createElement('button');
    startOCRButton.innerText = "Start Capture";

    //TODO add pop-up elements containing cached translations anchored to the top right of the original capture area

    //TODO move to it's own function... 
    startOCRButton.onclick = ((ev: MouseEvent) => {

        //Remove control div during screenshot
        controlDiv.remove();
        debugDiv.setAttribute('style', 'display: none');

        //Insert Canvas overlay
        const canvas = document.createElement('canvas');
        pluginDiv.append(canvas);
        canvas.setAttribute("style", "pointer-events: auto; position: absolute; height: 100%; width: 100%; top: 0; left: 0")
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const doneWithCanvas = () => {
            //Remove canvas and replace UI buttons
            canvas.remove();
            addUiButtons();
            //TODO just make debug div opaque and add dismiss button
            debugDiv.setAttribute('style', debugStyleShown);
        }

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = canvasColor;
        ctx.fillRect(0,0, canvas.width, canvas.height);

        let x1: number, y1: number, x2: number, y2: number = 0;

        //Watch for mouseclicks
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
                ctx.fillStyle = excludedColor;
                ctx.fillRect(x, y, w, h);
                if(w > 10 && h > 10) {
                    //Window probably too small for meaningful OCR otherwise
                    //a margin of about 12% will be cut off from the sample
                    const margin_w = w * .0625;
                    const margin_h = h * .0625;
                    ctx.clearRect(x + margin_w, y + margin_h, w - 2*margin_w, h - 2*margin_h);    
                }
                
            }

            //Finalize selection when they mouseup
            canvas.onmouseup = (lastClick: MouseEvent) => {
                if(firstClick.button !== 0) {
                    return;
                }

                const lastRect = canvas.getBoundingClientRect();
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
    });
    controlDiv.append(startOCRButton);
}

//Final initialization; prepare OCR engine and add UI buttons
ocr.init();
addUiButtons();
