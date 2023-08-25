chrome.action.onClicked.addListener(function (tab) {
    const tabId = tab.id;
    if (!tab.url.includes('chrome://')) {
        chrome.scripting.executeScript({
            target: { tabId },
            files: ['content-script.js']
        });
    }
});