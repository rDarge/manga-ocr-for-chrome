const ort = require('onnxruntime-web');

const vocabURL = chrome.runtime.getURL('vocab.txt');
const sampleURL = chrome.runtime.getURL('sample.csv');
const encoderModelURL = chrome.runtime.getURL('encoder_model.onnx');
const decoderModelURL = chrome.runtime.getURL('decoder_model.onnx');


async function doExampleOCR() {
    //Get vocab
    const vocabResource = await fetch(vocabURL);
    if(!vocabResource.ok) {
        console.error("Vocabulary is not okay", vocabResource);
        return;
    }
    const vocab = (await vocabResource.text()).split("\r\n");

    //Get sample image
    const sampleResource = await fetch(sampleURL);
    if(!sampleResource.ok) {
        console.error("Sample image is not okay", sampleResource);
        return;
    }
    const input = await sampleResource.text();
    const array = new Float32Array(input.split(',').map(v => parseFloat(v)));
    
    //Run encoder
    const encoderRequest = await fetch (encoderModelURL);
    const encoderModel = await encoderRequest.arrayBuffer();
    const encoder = await ort.InferenceSession.create(encoderModel);
    const input_data = new ort.Tensor("float32", array, [1,3,224,224]);
    const feeds = { pixel_values: input_data}
    const encoder_results = await encoder.run(feeds);
    console.log(encoder_results);

    //Run decoder
    const decoderRequest = await fetch (decoderModelURL);
    const decoderModel = await decoderRequest.arrayBuffer();
    const decoderSession = await ort.InferenceSession.create(decoderModel);
    const inputIds = new ort.Tensor("int64", new BigInt64Array([2n]), [1,1]);
    const nextInput = {input_ids:inputIds, encoder_hidden_states: encoder_results.last_hidden_state};

    const softmax = (logits: any) => {
        //SOFTMAX RESULTS
        const softmax = [];
        let currentIndex = 0
        let currentValue = logits[0];
        for(let i = 1; i < logits.length; i += 1) {
        if(i % 6144 == 0) {
            softmax.push(currentIndex % 6144);
            currentIndex = i;
            currentValue = logits[i];
        } else if(currentValue < logits[i]) {
            currentIndex = i;
            currentValue = logits[i];
        }
        }
        softmax.push(currentIndex % 6144);
        return softmax;
    }

    const runDecoder = async (decoderSession: any, inputFeed: any) => {
        const results = await decoderSession.run(inputFeed);
        const newResults = [2n,...softmax(results.logits.data).map(v => BigInt(v))];
        const nextToken = newResults[newResults.length-1];

        if(nextToken !== 3n && newResults.length < 300) {
            const newIds = new BigInt64Array(newResults);
            const newInput = {
                input_ids: new ort.Tensor("int64", newIds, [1,newResults.length]),
                encoder_hidden_states: inputFeed.encoder_hidden_states
            }
            return await runDecoder(decoderSession, newInput);
        } else {
            const output = newResults.filter(idx => idx > 14).map(idx => vocab[Number(idx)]).join('');
            console.log(output);
            return output;
        }
    }
    return runDecoder(decoderSession, nextInput);
}

//Delete any pre-existing control windows...
const pluginId = "translation-control-window";
const existingControl = document.getElementById(pluginId);
if(existingControl) {
    existingControl.remove();
}

//Constants
const canvasColor = 'rgba(163, 163, 194, 0.4)';
const clearColor = 'rgba(255, 255, 255, 0.0)';

const pluginDiv = document.createElement('div');
pluginDiv.setAttribute("id", pluginId)
pluginDiv.setAttribute("stlye", "position:absolute; left: 0, right: 0, top: 0, bottom: 0");
document.body.append(pluginDiv);

const startCapture = async (x1: number, x2: number, y1: number, y2: number) => {
    console.log("Beginning new capture at ", [x1, x2, y1, y2]); 
    const result = await chrome.runtime.sendMessage({x1, x2, y1, y2});
    console.log("Response from sw: ", result);
}

const addUiButtons = () => {
    const controlDiv = document.createElement('div')
    controlDiv.setAttribute("style", "position:absolute; left: 50%; right:50%; top: 10px; width: 200px; border: 0.1rem solid; border-radius: 0.05rem; padding: 1rem;");
    controlDiv.innerText = "MangaOCR is loading..."
    pluginDiv.append(controlDiv);
    
    
    //Clear contents
    controlDiv.innerHTML = '';
    //Add button to initiate OCR capture and processing
    const startOCRButton = document.createElement('button');
    startOCRButton.innerText = "Start Capture";
    startOCRButton.onclick = ((ev: MouseEvent) => {

        //Remove control div during screenshot
        controlDiv.remove();

        //Insert Canvas overlay
        const canvas = document.createElement('canvas');
        pluginDiv.append(canvas);
        canvas.setAttribute("style", "position: absolute; height: 100%; width: 100%; top: 0; left: 0")
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = canvasColor;
        ctx.fillRect(0,0, canvas.width, canvas.height);

        let x1: number, y1: number, x2: number, y2: number = 0;

        //Watch for mouseclicks
        canvas.onmousedown = ((firstClick: MouseEvent) => {
            const firstRect = canvas.getBoundingClientRect();
            x1 = firstClick.clientX - firstRect.left; 
            y1 = firstClick.clientY - firstRect.top;

            //Draw clear capture box around selected area
            canvas.onmousemove = (move: MouseEvent) => {
                const moveRect = canvas.getBoundingClientRect();
                x2 = move.clientX - moveRect.left; 
                y2 = move.clientY - moveRect.top;
                
                //Update canvas
                ctx.clearRect(0,0, canvas.width, canvas.height);
                ctx.fillStyle = canvasColor;
                ctx.fillRect(0,0, canvas.width, canvas.height);
                ctx.clearRect(x1 < x2 ? x1 : x2, y1 < y2 ? y1: y2, Math.abs(x2 - x1), Math.abs(y2 - y1));
            }

            //Finalize selection when they mouseup
            canvas.onmouseup = ((lastClick: MouseEvent) => {
                const lastRect = canvas.getBoundingClientRect();
                x2 = lastClick.clientX - lastRect.left;
                y2 = lastClick.clientY - lastRect.top;

                startCapture(x1, x2, y1, y2);
                
                //Remove canvas and replace UI buttons
                canvas.remove();
                addUiButtons();
            })
        })
        //Capture region
    });
    controlDiv.append(startOCRButton);
}

doExampleOCR().then((ocr) => {
    addUiButtons();
}, (error) => {
    console.log(error);
});


