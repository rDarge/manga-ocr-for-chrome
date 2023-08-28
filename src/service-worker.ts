chrome.action.onClicked.addListener(function (tab) {
    const tabId = tab.id;
    if (!tab.url.includes('chrome://')) {
        chrome.scripting.executeScript({
            target: { tabId },
            files: ['content-script.js']
        });
    }
});

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log("Received message from: ", sender.tab.url, request);
        sendResponse({response:"Good job"});
    }
)