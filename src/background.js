chrome.runtime.onMessage.addListener(function(message) {
    chrome.browserAction.setBadgeText({text: message.data});
});