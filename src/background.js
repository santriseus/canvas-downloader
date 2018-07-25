var canvasCounts = {};

chrome.runtime.onStartup.addListener(function() {
    chrome.browserAction.setBadgeBackgroundColor({color: "#474a4f"});
});

chrome.runtime.onMessage.addListener(function(message, sender) {
    if (message.count) {
        chrome.tabs.get(sender.tab.id, function(tab) {
            canvasCounts[sender.tab.id] = (canvasCounts[sender.tab.id] || 0) + message.count;
            if (tab.index >= 0) {
                chrome.browserAction.setBadgeBackgroundColor({color: "#474a4f"});
                chrome.browserAction.setBadgeText({tabId:tab.id, text:canvasCounts[sender.tab.id] > 0 ? canvasCounts[sender.tab.id].toString() : ''});
            } else {
                var tabId = sender.tab.id, text = canvasCounts[sender.tab.id] > 0 ? canvasCounts[sender.tab.id].toString() : '';
                chrome.webNavigation.onCommitted.addListener(function update(details) {
                    if (details.tabId === tabId) {
                        chrome.browserAction.setBadgeBackgroundColor({color: "#474a4f"});
                        chrome.browserAction.setBadgeText({tabId: tabId, text: text});
                        chrome.webNavigation.onCommitted.removeListener(update);
                    }
                });
            }
        });
    }
});

chrome.tabs.onRemoved.addListener(function(tabid) {
    delete canvasCounts[tabid];
});

chrome.tabs.onUpdated.addListener(function(tabid) {
    delete canvasCounts[tabid];
});
