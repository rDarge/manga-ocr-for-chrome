const ort = require('onnxruntime-web');

export interface OCRConfig {
    vocabURL: string,
    encoderModelURL: string,
    decoderModelURL: string,
    startupSampleURL: string,
    startupSampleExpectation: string
    skipStartupSample?: boolean;
}

export class OCRModel {

    private config: OCRConfig;
    private vocab: string[];
    private encoder: any;
    private decoder: any;

    //TODO parameterize the following to be supplied/inferred from model and validated on init
    private vocabLength: number = 6144; 
    private inputFormat: number[] = [1,3,224,224];
    private decoderInitSize: number[] = [1,1];
    private maxReturnLength: number = 100; //300;
    //Reduced max return length; there are certain situations where it will be stuck parsing a non-end character indefinitely

    constructor(config: OCRConfig){
        this.config = config;  
    }

    public async init() {
        console.log("Loading OCR model...");
        const vocab = await this.getVocab();
        console.log(`${vocab.length} vocabulary loaded`);
        console.log(`Loading encoder from ${this.config.encoderModelURL}`);
        await this.getEncoder();
        console.log(`Loading decoder from ${this.config.decoderModelURL}`);
        await this.getDecoder();
        console.log(`Performing startup OCR operation`);
        if(!this.config.skipStartupSample) {
            const startupSample = await this.doExampleOCR();
            if(startupSample === this.config.startupSampleExpectation) {
                console.log("Example OCR sample parsed correctly. Model ready!");
            } else {
                console.warn("Example OCR did not match expected result. Model may behave improperly");
            }
        } else {
            console.log("Startup example skipped per configuration. Model ready!")
        }
        return true;        
    }

    private async getVocab(): Promise<string[]> {
        if (this.vocab) {
            return Promise.resolve(this.vocab);
        } else {
            //Get vocab
            const vocabResource = await fetch(this.config.vocabURL);
            if(!vocabResource.ok) {
                console.error("Vocabulary is not okay", vocabResource);
                return;
            }
            this.vocab = (await vocabResource.text()).split("\r\n");
            return Promise.resolve(this.vocab);
        }
    }

    private async getEncoder() {
        if (this.encoder) {
            return this.encoder;
        }

        const encoderRequest = await fetch (this.config.encoderModelURL);
        const encoderModel = await encoderRequest.arrayBuffer();
        this.encoder = await ort.InferenceSession.create(encoderModel);
        return this.encoder;
    }

    private async getDecoder() {
        if (this.decoder) {
            return this.decoder;
        }

        const decoderRequest = await fetch (this.config.decoderModelURL);
        const decoderModel = await decoderRequest.arrayBuffer();
        this.decoder = await ort.InferenceSession.create(decoderModel);
        return this.decoder;
    }

    private softmax(logits: any) {
        //SOFTMAX RESULTS
        const softmax = [];
        let currentIndex = 0
        let currentValue = logits[0];
        for(let i = 1; i < logits.length; i += 1) {
        if(i % this.vocabLength == 0) {
            softmax.push(currentIndex % this.vocabLength);
            currentIndex = i;
            currentValue = logits[i];
        } else if(currentValue < logits[i]) {
            currentIndex = i;
            currentValue = logits[i];
        }
        }
        softmax.push(currentIndex % this.vocabLength);
        return softmax;
    }

    private async runDecoder(decoder: any, inputFeed: any) {
        const results = await decoder.run(inputFeed);
        const newResults = [2n,...this.softmax(results.logits.data).map(v => BigInt(v))];
        const nextToken = newResults[newResults.length-1];

        if(nextToken !== 3n && newResults.length < this.maxReturnLength) {
            const newIds = new BigInt64Array(newResults);
            const newInput = {
                input_ids: new ort.Tensor("int64", newIds, [1,newResults.length]),
                encoder_hidden_states: inputFeed.encoder_hidden_states
            }
            console.log("newResults are" , newResults);
            return await this.runDecoder(decoder, newInput);
        } else {
            const vocab = await this.getVocab();
            const output = newResults.filter(idx => idx > 14).map(idx => vocab[Number(idx)]).join('');
            console.log(output);
            return output;
        }
    }

    private async doExampleOCR() {
        // Get sample image
        const sampleResource = await fetch(this.config.startupSampleURL);
        if(!sampleResource.ok) {
            console.error("Sample image is not okay", sampleResource);
            return;
        }
        const input = await sampleResource.text();
        const array = new Float32Array(input.split(',').map(v => parseFloat(v)));

        // Process sample image
        const sample_result = await this.ocr(array);
        return sample_result;
    }

    /**
     * Performs OCR and returns the corresponding result parsed from the vocab. Only one beam, stops on first stop signal
     * @param array Preprocessed Float32Array representing a center-cropped 224x224 image normalized along three color channels
     * @returns the detokenized results of the first beam processed through the model
     */
    public async ocr(array: Float32Array) : Promise<string> {
        
        //Run encoder
        const encoder = await this.getEncoder();
        const input_data = new ort.Tensor("float32", array, this.inputFormat);
        const feeds = { pixel_values: input_data}
        const encoder_results = await encoder.run(feeds);
        console.log("encoder complete...  running decoder")

        //Run decoder
        const decoder = await this.getDecoder();
        const inputIds = new ort.Tensor("int64", new BigInt64Array([2n]), this.decoderInitSize);
        const nextInput = {
            input_ids:inputIds, 
            encoder_hidden_states: encoder_results.last_hidden_state
        };

        return this.runDecoder(decoder, nextInput);
    }
}