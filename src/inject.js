(function () {

    const COMMANDS = {
        GET_CANVAS_INFO_LIST: "GET_CANVAS_INFO_LIST"
    };

    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {

            switch (request.command) {
                case COMMANDS.GET_CANVAS_INFO_LIST:
                    let list = getCanvasInfoList();
                    console.log("sending GET_CANVAS_INFO_LIST response " + JSON.stringify(list));
                    chrome.runtime.sendMessage(chrome.runtime.id, {canvasInfoList: list});
                    break;
                default:
                    break;
            }
        });

    let count = document.getElementsByTagName("canvas").length;

    chrome.runtime.sendMessage(chrome.runtime.id, {count: count});


    function getCanvasElementsList(){

        let canvasList = Array.from(document.getElementsByTagName("canvas"));

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



