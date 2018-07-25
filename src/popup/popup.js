(function () {

    console.log("BOOM!");

    const COMMANDS = {
        GET_CANVAS_INFO_LIST: "GET_CANVAS_INFO_LIST"
    };

    let canvasInfoList = [];

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {command: COMMANDS.GET_CANVAS_INFO_LIST});
    });

    chrome.runtime.onMessage.addListener(function(message, sender) {
        if (message.canvasInfoList) {
            canvasInfoList = canvasInfoList.concat(message.canvasInfoList);
            console.log('Response ' + JSON.stringify(message.canvasInfoList));
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

            canvasInfoList.forEach((canvasInfo, index)=>{
                html.push(drawElement(html, canvasInfo, index));
            });

            html.push("</table>");

            section.innerHTML = html.join('\n');
        }
        else {
            section.innerText = "No canvas was found on the page.";
        }
    }

    function drawElement(html, element, index){
        html.push("<tr>");
        html.push("<td>");
        html.push("<img src=\"" + element.dataURL + "\">");
        html.push("</td>");
        html.push("<td>");
        html.push("<a href=\"#\" title=\"Download as PNG image.\">PNG</a> ");
        html.push("</td>");
        html.push("<td>");
        html.push("<a href=\"#\" title=\"Download as JPEG image with 100% quality.\">JPEG</a> ");
        html.push("</td>");
        html.push("<td>");
        html.push("<a href=\"#\" title=\"Download as BMP image.\">BMP</a> ");
        html.push("</td>");
        html.push("<td>");
        html.push("<a href=\"#\" title=\"Download as WEBP image.\">WEBP</a> ");
        html.push("</td>");
        html.push("</tr>");
    }

    function exportCanvas(){
        console.log("OLOLO");
    }

}());