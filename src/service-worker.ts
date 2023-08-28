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
    function(request, sender, sendResponse) {
        console.log("Received message from: ", sender.tab.url, request);
        const imagePoints = request as ImageRequest;
        //TODO reference og google docs, this declaration seems stale
        chrome.tabCapture.capture({
            video:true,
            videoConstraints: {
                mandatory: {
                    chromeMediaSource: "tab",
                    chromeMediaSoureId: sender.tab.id
                }
            }
        }, async (mediaStream: MediaStream) => {
            const track = mediaStream.getVideoTracks()[0];
            const imageCapture = new ImageCapture(track);
            const imageBitmap = await imageCapture.takePhoto();
            console.log(imageBitmap);
        });
        sendResponse({response:"Good job"});
    }
)