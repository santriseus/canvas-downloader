chrome.browserAction.setBadgeBackgroundColor({color: "#474a4f"});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.count && message.count > 0) {
        console.log("Starting");
        sendResponse('Dummy string.');
        chrome.browserAction.getBadgeText({tabId:sender.tab.id}, (text) => {
            let value = text ? parseInt(text) : 0;
            console.log("Current state before: " + value);
            value = value + message.count;
            chrome.browserAction.setBadgeText({tabId:sender.tab.id, text:value.toString()});
            console.log("Current state after: " + value);
        });
    }
});