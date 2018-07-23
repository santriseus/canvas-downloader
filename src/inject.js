(function () {

    var count = document.getElementsByTagName("canvas").length;

    chrome.runtime.sendMessage(chrome.runtime.id, {count: count});

}());



