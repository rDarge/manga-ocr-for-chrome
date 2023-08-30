chrome.action.onClicked.addListener(function (tab) {
    const tabId = tab.id;
    if (!tab.url.includes('chrome://')) {
        chrome.scripting.executeScript({
            target: { tabId },
            files: ['content-script.js']
        });
    }
});

interface ImageRequest {
    x1: number,
    x2: number,
    y1: number,
    y2: number
}

chrome.runtime.onMessage.addListener(
    async function(request, sender, sendResponse) {
        console.log("Received message from: ", sender.tab.url, request);
        const imagePoints = request as ImageRequest;
        let recording = false;
        
        // https://developer.chrome.com/docs/extensions/mv3/screen_capture/#audio-and-video-offscreen-doc
        //@ts-ignore see more details https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/functional-samples/sample.tabcapture-recorder/service-worker.js
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
        sendResponse({response:"Good job"});
    }
)