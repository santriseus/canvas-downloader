(async function () {

    const COMMANDS = {
        GET_CANVAS_INFO_LIST: "GET_CANVAS_INFO_LIST",
        GET_CANVAS_DATA: "GET_CANVAS_DATA"
    };

    let canvasInfoList = [];

    document.getElementsByTagName("section")[0].addEventListener('click', async (event)=>{
        if (event.target.tagName !== 'BUTTON')
            return;
        event.preventDefault();
        let main = document.getElementById('main');
        main.style.display = 'none';
        let spinner = document.getElementById('spinner');
        spinner.style.display = 'block';
        
        if (event.target.dataset.canvasData){
            let counter = 1;
            let zip = new JSZip();
            let entries;
            
            // Check if any checkboxes are unchecked - if so, use only selected items
            let allCheckboxes = document.querySelectorAll('input[name="canvas-select"]');
            let checkedCheckboxes = document.querySelectorAll('input[name="canvas-select"]:checked');
            
            if (checkedCheckboxes.length < allCheckboxes.length) {
                // Use selected items only
                let selectedEntries = getSelectedEntries();
                entries = selectedEntries.map(entry => [entry.frameId, entry.index]);
            } else {
                // Use all items
                entries = event.target.dataset.canvasData.split(';;;').map(entry => entry.split('|||'));
            }
            
            for (let entry of entries){
                let dataURL = await getCanvasContent( {
                    frame:entry[0],
                    index: entry[1],
                    type: event.target.dataset.canvasType,
                });
                zip.file(`canvas_${counter}.` + event.target.dataset.canvasType.substring(6), dataURL.split('base64,')[1],{base64: true});
                counter++;
            }
            let content = await zip.generateAsync({type:"blob"});
            let zipDataURL = URL.createObjectURL(content);
            let filename = checkedCheckboxes.length < allCheckboxes.length ? "canvas_selected.zip" : "canvas_all.zip";
            await chrome.downloads.download({
                url: zipDataURL,
                filename: filename,
                saveAs: true
            });
        }
        else if (event.target.dataset.canvasPdf){
            let counter = 1;
            let doc = new window.jspdf.jsPDF();
            let entries;
            
            // Check if any checkboxes are unchecked - if so, use only selected items
            let allCheckboxes = document.querySelectorAll('input[name="canvas-select"]');
            let checkedCheckboxes = document.querySelectorAll('input[name="canvas-select"]:checked');
            
            if (checkedCheckboxes.length < allCheckboxes.length) {
                // Use selected items only
                let selectedEntries = getSelectedEntries();
                entries = selectedEntries.map(entry => [entry.frameId, entry.index]);
            } else {
                // Use all items (original behavior)
                entries = event.target.dataset.canvasPdf.split(';;;').map(entry => entry.split('|||'));
            }
            
            for (let entry of entries){
                let dataURL = await getCanvasContent( {
                    frame:entry[0],
                    index: entry[1],
                    type: event.target.dataset.canvasType,
                });
                // fit image to page, preserve aspect ratio
                let imageWidth = 0, imageHeight = 0, width = 0, height = 0;
                try {
                    const dimensions = await getImageDimensions(dataURL);
                    imageWidth = dimensions.width;
                    imageHeight = dimensions.height;
                } catch (error) {
                    console.log('Error getting image dimensions:', error);
                    continue;
                }
                if (imageWidth === 0 || imageHeight === 0) {
                    console.log('Invalid image dimensions:', imageWidth, imageHeight);
                    continue;
                }

                let pageWidth = 210;
                let pageHeight = 297;
                let ratio = imageWidth / imageHeight;
                if (ratio > 1) {
                    width = pageWidth;
                    height = pageWidth / ratio; // preserve aspect ratio
                }
                else {
                    height = pageHeight;
                    width = pageHeight * ratio; // preserve aspect ratio
                }
                doc.addImage(dataURL, 'PNG', 0, 0, width, height, undefined,'FAST');
                if (counter < entries.length)
                    doc.addPage();
                counter++;
            }
            let filename = checkedCheckboxes.length < allCheckboxes.length ? 'canvas_selected.pdf' : 'canvas_all.pdf';
            doc.save(filename);
        }
        else{
            let dataURL = await getCanvasContent( {
                frame:event.target.dataset.canvasFrame,
                index: event.target.dataset.canvasIndex,
                type: event.target.dataset.canvasType,
            });
            if (event.target.dataset.canvasCopy){
                await copyDataUrlToClipboard(dataURL);
                event.target.classList.add('is-success');
                event.target.innerText = 'COPIED!';
                setTimeout(()=>{
                    event.target.classList.remove('is-success');
                    event.target.innerText = 'COPY';
                }, 1000);
            } else {
                await chrome.downloads.download({
                    url: dataURL,
                    filename: "canvas." + event.target.dataset.canvasType.substring(6),
                    saveAs: true
                });
            }
        }

        main.style.display = 'block';
        spinner.style.display = 'none';
    }, false);

    // Add event listener for checkboxes
    document.getElementsByTagName("section")[0].addEventListener('change', (event) => {
        if (event.target.type === 'checkbox') {
            if (event.target.id === 'all-toggle') {
                toggleAllCheckboxes(event.target.checked);
            } else {
                updateAllToggleCheckbox();
                updateAllButtonsState();
            }
        }
    });

    let tabs = await chrome.tabs.query({active: true, currentWindow: true});

    chrome.runtime.onMessage.addListener(function(message) {
        if (message.canvasInfoList) {
            canvasInfoList = canvasInfoList.concat(message.canvasInfoList);
            drawContent(canvasInfoList);
        }
    });

    await chrome.tabs.sendMessage(tabs[0].id, {command: COMMANDS.GET_CANVAS_INFO_LIST});

    async function getCanvasContent (data){
        let tabs = await chrome.tabs.query({active: true, currentWindow: true});
        let result = await chrome.tabs.sendMessage(tabs[0].id, {command: COMMANDS.GET_CANVAS_DATA, data: {
                frame: data.frame,
                index: data.index,
                type: data.type,
            }});
        return result.dataURL;
    }

    function getSelectedEntries() {
        let checkboxes = document.querySelectorAll('input[name="canvas-select"]:checked');
        return Array.from(checkboxes).map(checkbox => {
            let index = parseInt(checkbox.value);
            return canvasInfoList[index];
        });
    }

    function toggleAllCheckboxes(checked) {
        let checkboxes = document.querySelectorAll('input[name="canvas-select"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        updateAllButtonsState();
    }

    function updateAllToggleCheckbox() {
        let checkboxes = document.querySelectorAll('input[name="canvas-select"]');
        let checkedBoxes = document.querySelectorAll('input[name="canvas-select"]:checked');
        let allToggleCheckbox = document.getElementById('all-toggle');
        
        if (allToggleCheckbox) {
            allToggleCheckbox.checked = checkboxes.length > 0 && checkedBoxes.length === checkboxes.length;
            allToggleCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length;
        }
    }

    function updateAllButtonsState() {
        let allCheckboxes = document.querySelectorAll('input[name="canvas-select"]');
        let checkedCheckboxes = document.querySelectorAll('input[name="canvas-select"]:checked');
        let allButtons = document.querySelectorAll('.all-action-button');
        
        let isPartialSelection = checkedCheckboxes.length < allCheckboxes.length;
        
        allButtons.forEach(button => {
            let originalTitle = button.getAttribute('data-original-title');
            if (!originalTitle) {
                originalTitle = button.title;
                button.setAttribute('data-original-title', originalTitle);
            }
            
            if (isPartialSelection) {
                button.title = originalTitle.replace('All', 'Selected');
                button.disabled = checkedCheckboxes.length === 0;
                if (checkedCheckboxes.length === 0) {
                    button.style.opacity = '0.5';
                } else {
                    button.style.opacity = '1';
                }
            } else {
                button.title = originalTitle;
                button.disabled = false;
                button.style.opacity = '1';
            }
        });
    }

    function drawContent(canvasInfoList){
        let section = document.getElementById('main');

        if (canvasInfoList.length > 0){
            let html = [];

            html.push("<table class=\"table is-narrow\">");
            html.push("<tr>");
            html.push("<th class=\"checkbox-column\">");
            html.push("</th>");
            html.push("<th>");
            html.push("Preview");
            html.push("</th>");
            html.push("<th colspan=\"4\">");
            html.push("Export options");
            html.push("</th>");
            html.push("</tr>");

            drawDownloadAll(html, canvasInfoList.map(element => element.frameId + '|||' + element.index).join(';;;'));

            canvasInfoList.forEach((canvasInfo, index)=>{
                drawElement(html, canvasInfo, index);
            });

            html.push("</table>");

            section.innerHTML = html.join('\n');

            // Initially all checkboxes should be checked
            setTimeout(() => {
                let allToggleCheckbox = document.getElementById('all-toggle');
                if (allToggleCheckbox) {
                    allToggleCheckbox.checked = true;
                    toggleAllCheckboxes(true);
                }
            }, 0);
        }
        else {
            section.innerText = "No canvas was found on the page.";
        }
    }

    function drawElement(html, element, index){
        html.push("<tr>");
        html.push("<td class=\"checkbox-column\">");
        html.push(`<input type="checkbox" name="canvas-select" value="${index}" class="checkbox-input" checked>`);
        html.push("</td>");
        html.push("<td>");
        html.push("<img alt='canvas content' src=\"" + element.dataURL + "\">");
        html.push("</td>");
        html.push("<td>");
        html.push("<button class=\"button is-primary is-small\" data-canvas-type=\"image/png\" data-canvas-frame=\"" + element.frameId + "\" data-canvas-index=\"" + element.index + "\" title=\"Download as PNG image.\">PNG</button>");
        html.push("</td>");
        html.push("<td>");
        html.push("<button class=\"button is-primary is-small\" data-canvas-type=\"image/jpeg\" data-canvas-frame=\"" + element.frameId + "\" data-canvas-index=\"" + element.index + "\" title=\"Download as JPEG image with 100% quality.\">JPEG</button>");
        html.push("</td>");
        html.push("<td>");
        html.push("<button class=\"button is-primary is-small\" data-canvas-type=\"image/webp\" data-canvas-frame=\"" + element.frameId + "\" data-canvas-index=\"" + element.index + "\" title=\"Download as WEBP image.\">WEBP</button>");
        html.push("</td>");
        html.push("<td>");
        html.push("<button class=\"button is-primary is-small fixed-size\" data-canvas-type=\"image/png\" data-canvas-copy=\"true\" data-canvas-frame=\"" + element.frameId + "\" data-canvas-index=\"" + element.index + "\" title=\"Copy to clipboard.\">COPY</button>");
        html.push("</td>");
        html.push("</tr>");
    }

    function drawDownloadAll(html, data){
        html.push("<tr class=\"is-selected\">");
        html.push("<td class=\"checkbox-column\">");
        html.push("<input type=\"checkbox\" id=\"all-toggle\" class=\"checkbox-input\" title=\"Toggle all checkboxes\" checked>");
        html.push("</td>");
        html.push("<td style='text-align: center'>");
        html.push("<b>All</b>");
        html.push("</td>");
        html.push("<td>");
        html.push("<button class=\"button is-small all-action-button\" data-canvas-type=\"image/png\" data-canvas-data=\"" + data + "\" title=\"Download All as PNG images.\">PNG</button>");
        html.push("</td>");
        html.push("<td>");
        html.push("<button class=\"button is-small all-action-button\" data-canvas-type=\"image/jpeg\" data-canvas-data=\"" + data + "\" title=\"Download All as JPEG images with 100% quality.\">JPEG</button>");
        html.push("</td>");
        html.push("<td>");
        html.push("<button class=\"button is-small all-action-button\" data-canvas-type=\"image/webp\" data-canvas-data=\"" + data + "\" title=\"Download All as WEBP images.\">WEBP</button>");
        html.push("</td>");
        html.push("<td>");
        html.push("<button class=\"button is-small all-action-button\" data-canvas-type=\"image/png\" data-canvas-pdf=\"" + data + "\" title=\"Download All as PDF file.\">PDF</button>");
        html.push("</td>");
        html.push("</tr>");
    }

    async function copyDataUrlToClipboard(dataUrl) {
        // Convert Data URL to a Blob
        const blob = await dataUrlToBlob(dataUrl);

        // Create a ClipboardItem
        const clipboardItem = new ClipboardItem({ [blob.type]: blob });

        // Write to clipboard
        await navigator.clipboard.write([clipboardItem])
    }

    // Helper function to convert Data URL to a Blob
    function dataUrlToBlob(dataUrl) {
        return new Promise((resolve) => {
            const parts = dataUrl.split(',');
            const mime = parts[0].match(/:(.*?);/)[1];
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);

            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }

            resolve(new Blob([u8arr], { type: mime }));
        });
    }

    function getImageDimensions(dataUrl) {
        return new Promise((resolve, reject) => {
            // Create an Image object
            const img = new Image();

            // Set up an onload event to resolve the dimensions
            img.onload = function() {
                // Once loaded, get the width and height
                const width = img.width;
                const height = img.height;
                resolve({ width, height });
            };

            // Set up an onerror event to handle loading issues
            img.onerror = function() {
                reject(new Error('Unable to load image.'));
            };

            // Set the src of the Image to the data URL
            img.src = dataUrl;
        });
    }

}());