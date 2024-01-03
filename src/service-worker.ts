import OpenAI from 'openai';
import { openai_api_key } from './dev-secrets';

const openai = new OpenAI({
    apiKey: openai_api_key
});

//TODO: Parameterize this and build interface for user to tinker and provide additional context
const prompt_prefix = `You are a professional translation engine for translating Japanese to English.
Your task is to translate the following excerpts from a Manga.
If you are ever unsure of how to translate something, leave it as Japanese.

# Manga Text #
`

const prompt_suffix = `

# Translated Text #
`

const vocab_prefix = `You are a professional japanese teacher fluent in Japanese and English.
Your task is to create a list of vocabulary for students based on the passages they provide you.
Your vocab list should have the original word accompanied by the kana decomposition and a definition in english.
If you are ever unsure of how to translate something, omit it.


# Passage #
`

const vocab_suffix = `

# Vocabulary #
`

const DEFAULT_CONFIG: OCRConfig = {
    vocabURL: chrome.runtime.getURL('vocab.txt'),
    detectorModelURL: chrome.runtime.getURL('comictextdetector.pt.onnx'),
    encoderModelURL: chrome.runtime.getURL('encoder_model.onnx'),
    decoderModelURL: chrome.runtime.getURL('decoder_model.onnx'),
    startupSampleURL: chrome.runtime.getURL('sample.csv'),
    startupSampleExpectation: "いつも何かに追われていて",
    skipStartupSample: true
};

//In case the service worker has inactivated due to inactivty, check to see what it last was
let activeTabs = [];
let disabledTabs = [];
const sessionState = await chrome.storage.session.get(["activeTabs", "disabledTabs"]);
if (sessionState.activeTabs) {
    activeTabs = sessionState.activeTabs;
}
if (sessionState.disabledTabs) {
    disabledTabs = sessionState.disabledTabs;
}

chrome.action.onClicked.addListener(function (tab) {
    const tabId = tab.id;
    if (!tab.url.includes('chrome://')) {
        toggleTab(tabId);
    }
});

function toggleTab(tabId: number) {
    if (disabledTabs.indexOf(tabId) >= 0) {
        //Un-disable message
        const message = { type: 'EnableOCR' } as EnableOCRRequest;
        chrome.tabs.sendMessage(tabId, message).then(() => {
            disabledTabs.splice(disabledTabs.indexOf(tabId), 1);
            activeTabs.push(tabId);
            chrome.storage.session.set({ activeTabs, disabledTabs });
        }, err => { 
            disabledTabs.splice(disabledTabs.indexOf(tabId), 1);
            toggleTab(tabId);
        });
    } else if (activeTabs.indexOf(tabId) >= 0) {
        //Disable script message
        const message = { type: 'DisableOCR' } as DisableOCRRequest;
        chrome.tabs.sendMessage(tabId, message).then(() => {
            activeTabs.splice(disabledTabs.indexOf(tabId), 1);
            disabledTabs.push(tabId);
            chrome.storage.session.set({ activeTabs, disabledTabs });
        }, err => {
            activeTabs.splice(disabledTabs.indexOf(tabId), 1);
            toggleTab(tabId);
        });
    } else if (activeTabs.indexOf(tabId) === -1) {
        chrome.scripting.executeScript({
            target: { tabId },
            files: ['content-script.js']
        });
        chrome.scripting.insertCSS({
            target: { tabId },
            files: ['style.css']
        });
        activeTabs.push(tabId);
        chrome.storage.session.set({ activeTabs });
    }
}

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
            const response: TranslationResponse = {
                type: 'TranslationResponse',
                payload: {
                    messages: result.split('\n')
                }
            }
            chrome.tabs.sendMessage(sender.tab.id, response);
        } else if (message.type === 'AnkiRequest') {
            const request = message as AnkiRequest
            const data = JSON.stringify({
                "action":"addNote",
                "version":23, 
                "params": { 
                    "note": { 
                        "deckName":"Default", 
                        "modelName":"Basic", 
                        "fields": {
                            "Front": request.payload.front,
                            "Back": request.payload.back
                        }
                    }
                }
            })
            fetch("http://localhost:8765",{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: data
            }).catch(error => {
                console.error(error)
            })
        } else if (message.type === 'VocabRequest') {
            console.log("attempting to query openai for vocabulary");
            const text = message.payload.text
            const content = vocab_prefix + text + vocab_suffix;

            const completion = await openai.chat.completions.create({
                messages: [{ role: 'user', content }],
                model: 'gpt-3.5-turbo',
            });
            console.log("Full prompt and response: ", content, completion);
            const result = completion.choices[0].message.content;
            console.log("First choice: ", result);

            //Send translation response back
            const response: VocabResponse = {
                type: 'VocabResponse',
                payload: {
                    list: result
                }
            }
            chrome.tabs.sendMessage(sender.tab.id, response);
        }
    }
)