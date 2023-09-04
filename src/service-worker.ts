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
            let recording = false;
    
            //@ts-ignore types out of date: https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/functional-samples/sample.tabcapture-recorder/service-worker.js
            const existingContexts = await chrome.runtime.getContexts({});
    
            const offscreenDocument = existingContexts.find(c => c.contextType === 'OFFSCREEN_DOCUMENT');
    
            if (!offscreenDocument) {
                await chrome.offscreen.createDocument({
                    url: 'offscreen.html',
                    reasons: [chrome.offscreen.Reason.USER_MEDIA],
                    justification: 'Generating thumbnail of user selected region for OCR'
                })
            } else {
                recording = offscreenDocument.documentUrl.endsWith('#recording');
            }
    
            if (recording) {
                chrome.runtime.sendMessage({
                    type: 'stop-recording',
                    target: 'offscreen'
                });
            }
    
            //@ts-ignore types are outdated again
            const streamId: string = await chrome.tabCapture.getMediaStreamId({
                targetTabId: sender.tab.id
            });
    
            const request: Message = {
                type: 'ProcessBackend',
                payload: {
                    streamId: streamId, 
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
        
        

        // none of this shit fucking works
        // TODO reference og google docs, this declaration seems stale
        // chrome.tabCapture.getMediaStreamId({
        //     targetTabId: sender.tab.id
        // // }, )
        // // chrome.tabCapture.capture({
        // //     video:true,
        // //     videoConstraints: {
        // //         mandatory: {
        // //             chromeMediaSource: "tab",
        // //             chromeMediaSoureId: sender.tab.id
        // //         }
        // //     }
        // }, async (streamId: string) => {
        //     // const track = mediaStream.getVideoTracks()[0];
        //     // const imageCapture = new ImageCapture(track);
        //     // const imageBitmap = await imageCapture.takePhoto();
        //     // console.log(imageBitmap);
        //     console.log(streamId);
        //     const payload = {streamId: streamId, points: imagePoints};
        //     chrome.tabs.sendMessage(sender.tab.id, payload, (response) => {
        //         console.log("Got response: ", response);
        //     })
        // });
        // sendResponse({ response: "Good job" });
    }
)