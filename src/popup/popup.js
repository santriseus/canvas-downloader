(function () {

    console.log("BOOM!");

    const COMMANDS = {
        GET_CANVAS_INFO_LIST: "GET_CANVAS_INFO_LIST",
        GET_CANVAS_DATA: "GET_CANVAS_DATA"
    };

    let canvasInfoList = [];

    document.getElementsByTagName("section")[0].addEventListener('click', (event)=>{
        if (event.target.tagName !== 'A')
            return;
        event.preventDefault();
        console.log(event.target.dataset.canvasType);
        console.log(event.target.dataset.canvasFrame);
        console.log(event.target.dataset.canvasIndex);

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {command: COMMANDS.GET_CANVAS_DATA, data: {
                frame:event.target.dataset.canvasFrame,
                index: event.target.dataset.canvasIndex,
                type: event.target.dataset.canvasType,
                }}, function(response) {

                chrome.downloads.download({
                    url: response.dataURL,
                    filename: "canvas." + event.target.dataset.canvasType.substring(6),
                    saveAs: true
                });
            });
        });

    }, false);

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {command: COMMANDS.GET_CANVAS_INFO_LIST});
    });

    chrome.runtime.onMessage.addListener(function(message) {
        if (message.canvasInfoList) {
            canvasInfoList = canvasInfoList.concat(message.canvasInfoList);
            drawContent(canvasInfoList);
        }
    });

    function drawContent(canvasInfoList){

        let section = document.getElementsByTagName("section")[0];

        if (canvasInfoList.length > 0){

            let html = [];

            html.push("<table  class=\"table is-narrow\">");
            html.push("<tr>");
            html.push("<th>");
            html.push("Preview");
            html.push("</th>");
            html.push("<th colspan=\"4\">");
            html.push("Export options");
            html.push("</th>");
            html.push("</tr>");

            canvasInfoList.forEach((canvasInfo)=>{
                html.push(drawElement(html, canvasInfo));
            });

            html.push("</table>");

            section.innerHTML = html.join('\n');

        }
        else {
            section.innerText = "No canvas was found on the page.";
        }
    }

    function drawElement(html, element){
        html.push("<tr>");
        html.push("<td>");
        html.push("<img src=\"" + element.dataURL + "\">");
        html.push("</td>");
        html.push("<td>");
        html.push("<button data-canvas-type=\"image/png\" data-canvas-frame=\"" + element.frameId + "\" data-canvas-index=\"" + element.index + "\" title=\"Download as PNG image.\">PNG</button>");
        html.push("</td>");
        html.push("<td>");
        html.push("<button  data-canvas-type=\"image/jpeg\" data-canvas-frame=\"" + element.frameId + "\" data-canvas-index=\"" + element.index + "\" title=\"Download as JPEG image with 100% quality.\">JPEG</button>");
        html.push("</td>");
        html.push("<td>");
        html.push("<button data-canvas-type=\"image/bmp\" data-canvas-frame=\"" + element.frameId + "\" data-canvas-index=\"" + element.index + "\" title=\"Download as BMP image.\">BMP</button>");
        html.push("</td>");
        html.push("<td>");
        html.push("<button data-canvas-type=\"image/webp\" data-canvas-frame=\"" + element.frameId + "\" data-canvas-index=\"" + element.index + "\" title=\"Download as WEBP image.\">WEBP</button>");
        html.push("</td>");
        html.push("</tr>");
    }

}());