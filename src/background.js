chrome.runtime.onStartup.addListener(function() {
    chrome.browserAction.setBadgeBackgroundColor({color: "#474a4f"});
});


chrome.runtime.onMessage.addListener(function(message, sender) {
    if (message.count) {
        chrome.tabs.get(sender.tab.id, function(tab) {
            if (tab.index >= 0) {
                chrome.browserAction.setBadgeBackgroundColor({color: "#474a4f"});
                chrome.browserAction.setBadgeText({tabId:tab.id, text:message.count > 0 ? message.count.toString() : ''});
            } else {
                var tabId = sender.tab.id, text = message.count > 0 ? message.count.toString() : '';
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