(function () {

    const COMMANDS = {
        GET_CANVAS_INFO_LIST: "GET_CANVAS_INFO_LIST",
        GET_CANVAS_DATA: "GET_CANVAS_DATA",

    };

    let frameId = generateId(20);

    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            switch (request.command) {
                case COMMANDS.GET_CANVAS_INFO_LIST:
                    let list = getCanvasInfoList();
                    sendResponse( {canvasInfoList: list});
                    break;
                    case COMMANDS.GET_CANVAS_DATA:
                        if (request.data.frame === frameId){
                            sendResponse({dataURL: document.getElementsByTagName("canvas")[request.data.index].toDataURL(request.data.type, 1)});
                        }
                    break;
                default:
                    break;
            }
        });

    let count = getCanvasElementsList().length;

    chrome.runtime.sendMessage(chrome.runtime.id, {count: count});


    function getCanvasElementsList(){

        let canvasList = Array.from(document.getElementsByTagName("canvas")).filter((canvas => { return !isTainted(canvas)}));

        return canvasList;
    }

    function getCanvasInfoList(){

        let canvasList = getCanvasElementsList();

        if (canvasList.length < 1)
            return [];

        let hiddenCanvas = document.createElement('canvas');

        return canvasList.map((canvas, index)=>{
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
                frameId: frameId,
                index: index
            }
        })
    }

    function dec2hex (dec) {
        return ('0' + dec.toString(16)).substr(-2);
    }

    function generateId (len) {
        let arr = new Uint8Array((len || 40) / 2);
        window.crypto.getRandomValues(arr);
        return Array.from(arr, dec2hex).join('');
    }

    function isTainted(canvas) {
        try {
            let pixel = canvas.getContext("2d").getImageData(0, 0, 1, 1);
            return false;
        } catch(err) {
            return (err.code === 18);
        }
    }

}());



