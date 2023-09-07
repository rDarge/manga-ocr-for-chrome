import OpenAI from 'openai';
import { openai_api_key } from './dev-secrets';

const openai = new OpenAI({
    apiKey: openai_api_key
});

//TODO: Parameterize this and builld interface for user to tinker and provide additional context
const prompt_prefix = `You are a professional translation engine for translating Japanese to English.
Your task is to translate the following excerpts from a Manga.
If you are ever unsure of how to translate something, leave it as Japanese.

# Manga Text #
`

const prompt_suffix = `

# Translated Text #
`

const DEFAULT_CONFIG: OCRConfig = {
    vocabURL: chrome.runtime.getURL('vocab.txt'),
    encoderModelURL: chrome.runtime.getURL('encoder_model.onnx'),
    decoderModelURL: chrome.runtime.getURL('decoder_model.onnx'),
    startupSampleURL: chrome.runtime.getURL('sample.csv'),
    startupSampleExpectation: "いつも何かに追われていて",
    skipStartupSample: true
};


chrome.action.onClicked.addListener(function (tab) {
    const tabId = tab.id;
    if (!tab.url.includes('chrome://')) {
        chrome.scripting.executeScript({
            target: { tabId },
            files: ['content-script.js']
        });
        chrome.scripting.insertCSS({
            target: { tabId },
            files: ['style.css']
        });
    }
});

async function initializeOffscreen(): Promise<string> {
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: [chrome.offscreen.Reason.USER_MEDIA],
        justification: 'Background processing of OCR requests'
    })

    //Send initialization request
    const request: Message = {
        type: 'InitializeOCR',
        payload: DEFAULT_CONFIG
    };
    const result = await chrome.runtime.sendMessage(request);
    return result;
}


chrome.runtime.onMessage.addListener(
    async function (request, sender) {
        console.debug("Received message in service-worker from: ", sender, request);
        const message = request as Message;
        if (message.type === 'OCRStart') {
            //A user has selected a region on the screen to perform OCR on
            const imagePoints = message.payload as CropArea;
            const image = await chrome.tabs.captureVisibleTab(sender.tab.windowId, {
                format: 'png'
            });

            //@ts-ignore chrome types out of date 
            const existingContexts = await chrome.runtime.getContexts({});
            const offscreenDocument = existingContexts.find(c => c.contextType === 'OFFSCREEN_DOCUMENT');

            if (!offscreenDocument) {
                const result = await initializeOffscreen();
                if (result === "NOT OK") {
                    console.warn("OCR model may have failed to load, check logs for further details");
                }
            }

            const request: Message = {
                type: 'ProcessBackend',
                payload: {
                    image: image,
                    tabId: sender.tab.id,
                    points: imagePoints
                }
            }
            chrome.runtime.sendMessage(request);
        } else if (message.type === 'OCRComplete') {
            //This request must be forwarded to the tab, since the offscreen worker does not have access to that resource
            const payload = message.payload as BackendResponse;
            const tabId = payload.tabId;
            chrome.tabs.sendMessage(tabId, message);
        } else if (message.type === 'TranslationRequest') {
            console.log("attempting to query openai for translation");
            const messages = message.payload.messages as string[];
            const content = prompt_prefix + messages.join('\n') + prompt_suffix;

            const completion = await openai.chat.completions.create({
                messages: [{ role: 'user', content }],
                model: 'gpt-3.5-turbo',
            });
            console.log("Full prompt and response: ", content, completion);
            const result = completion.choices[0].message.content;
            console.log("First choice: ", result);
            
            //Send translation response back
            const response : TranslationResponse = {
                type: 'TranslationResponse',
                payload: {
                    messages: result.split('\n')
                }
            }
            chrome.tabs.sendMessage(sender.tab.id, response);
        }
    }
)