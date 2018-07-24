(function () {

    const COMMANDS = {
        GET_CANVAS_INFO_LIST: "GET_CANVAS_INFO_LIST"
    };

    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {

            switch (request.command) {
                case COMMANDS.GET_CANVAS_INFO_LIST:
                    sendResponse({canvasInfoList: getCanvasInfoList()});
                    break;
                default:
                    break;

            }
        });

    let count = document.getElementsByTagName("canvas").length;

    if (window.document.frames) {
        window.document.frames.forEach(function (frame) {
            let frameDoc = frame.contentDocument || frame.contentWindow.document;
            let frameCount = frameDoc.getElementsByTagName("canvas").length;
            count = count + frameCount;
        });
    }

    chrome.runtime.sendMessage(chrome.runtime.id, {count: count});


    function getCanvasElementsList(){

        let canvasList = Array.from(document.getElementsByTagName("canvas"));

        if (window.document.frames) {
            window.document.frames.forEach(function (frame) {
                let frameDoc = frame.contentDocument || frame.contentWindow.document;
                let frameCanvasList = frameDoc.getElementsByTagName("canvas");
                if (frameCanvasList.length > 0){
                    canvasList.concat(Array.from(frameCanvasList))
                }
            });
        }

        return canvasList;
    }

    function getCanvasInfoList(){

        let canvasList = getCanvasElementsList();

        if (canvasList.length < 1)
            return [];

        let hiddenCanvas = document.createElement('canvas');

        return canvasList.map((canvas)=>{
            if (canvas.width > 100 || canvas.height > 100){

                hiddenCanvas.getContext("2d").clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);

                if (canvas.width > canvas.height){
                    hiddenCanvas.width = 100;
                    hiddenCanvas.height = canvas.height * (hiddenCanvas.width/canvas.width);
                } else{
                    hiddenCanvas.height = 100;
                    hiddenCanvas.width = canvas.width * (hiddenCanvas.height/canvas.height);
                }

                hiddenCanvas.getContext("2d").drawImage(canvas, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
            }

            return {
                dataURL: hiddenCanvas.toDataURL(),
                id: canvas.id
            }
        })
    }

}());



