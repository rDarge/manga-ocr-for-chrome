chrome.action.onClicked.addListener(function (tab) {
    const tabId = tab.id;
    if (!tab.url.includes('chrome://')) {
        chrome.scripting.executeScript({
            target: { tabId },
            files: ['content-script.js']
        });
        chrome.scripting.insertCSS( {
            target: { tabId },
            files: ['style.css']
        });
    }
});



chrome.runtime.onMessage.addListener(
    async function (request, sender, sendResponse) {
        console.log("Received message from: ", sender, request);
        const message = request as Message;
        if(message.type === 'OCRStart') {
            const imagePoints = message.payload as CropArea;

            const image = await chrome.tabs.captureVisibleTab(sender.tab.windowId, {
                format: 'png'
            });
            console.log("Capture of tab is: ", image);
    
            //@ts-ignore types out of date: https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/functional-samples/sample.tabcapture-recorder/service-worker.js
            const existingContexts = await chrome.runtime.getContexts({});
    
            const offscreenDocument = existingContexts.find(c => c.contextType === 'OFFSCREEN_DOCUMENT');
    
            if (!offscreenDocument) {
                await chrome.offscreen.createDocument({
                    url: 'offscreen.html',
                    reasons: [chrome.offscreen.Reason.USER_MEDIA],
                    justification: 'Background processing of OCR requests'
                })
            }
    
            const request: Message = {
                type: 'ProcessBackend',
                payload: {
                    image: image, 
                    tabId: sender.tab.id, 
                    points: imagePoints
                }
            }
            console.log("Queuing request to offscreen tab:", request);
            const result = await chrome.runtime.sendMessage(request);
            console.log("Response from offscreen worker is");
            sendResponse(result);
        } else if (message.type === 'OCRComplete') {
            console.log("Message complete!", message.payload);
            const payload = message.payload as BackendResponse;
            const tabId = payload.tabId;
            console.log("Forwarding message to original tab for final processing");
            chrome.tabs.sendMessage(tabId, message);
        }
    }
)