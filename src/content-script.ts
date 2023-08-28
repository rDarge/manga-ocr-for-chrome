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
            const output = newResults.filter(idx => idx > 14).map(idx => vocab[Number(idx)]).join(' ');
            console.log(output);
            return output;
        }
    }
    return await runDecoder(decoderSession, nextInput);
}

doExampleOCR();

const controlDiv = document.createElement('div')
controlDiv.setAttribute("style", "position:absolute; left: 50%; right:50%, top: 10px; width: 200px; border: 0.5rem solid; border-radius 1rem ")
document.body.append(controlDiv);
controlDiv.innerText = "MangaOCR ready!"
