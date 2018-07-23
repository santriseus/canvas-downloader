(function () {

    var count = document.getElementsByTagName("canvas").length;

    if (window.document.frames){
        window.document.frames.forEach(function(frame) {
            var frameDoc = frame.contentDocument || frame.contentWindow.document;
            var frameCount = frameDoc.getElementsByTagName("canvas").length;
            count = count + frameCount;
        });
    }

    chrome.runtime.sendMessage(chrome.runtime.id, {count: count});

}());



