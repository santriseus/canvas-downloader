(function () {

    console.log("BOOM!");

    const COMMANDS = {
        GET_CANVAS_INFO_LIST: "GET_CANVAS_INFO_LIST"
    };

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {command: COMMANDS.GET_CANVAS_INFO_LIST}, function(response) {
            drawContent(response.canvasInfoList);
        });
    });


    function drawContent(canvasInfoList){

        let section = document.getElementsByTagName("section")[0];

        if (canvasInfoList.length > 0){

            let html = [];

            html.push("<table>");
            html.push("<tr>");
            html.push("<th>");
            html.push("Preview");
            html.push("</th>");
            html.push("<th colspan=\"4\">");
            html.push("Download options");
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
        html.push("<button>PNG</button>");
        html.push("</td>");
        html.push("<td>");
        html.push("<button>JPEG</button>");
        html.push("</td>");
        html.push("<td>");
        html.push("<button>BMP</button>");
        html.push("</td>");
        html.push("<td>");
        html.push("<button>WEBP</button>");
        html.push("</td>");
        html.push("</tr>");
    }

}());