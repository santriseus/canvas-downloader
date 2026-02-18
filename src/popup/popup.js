(async function () {

    const COMMANDS = {
        GET_CANVAS_INFO_LIST: "GET_CANVAS_INFO_LIST",
        GET_CANVAS_DATA: "GET_CANVAS_DATA"
    };

    let canvasInfoList = [];

    // Settings functionality
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsClose = document.getElementById('settings-close');

    // Load saved settings
    async function loadSettings() {
        const settings = await chrome.storage.local.get(['useDefaultLocation', 'multipleDownloads', 'timestampPrefix', 'extractSourceUrls', 'collectBlobImages']);
        console.log('Loading settings:', settings);
        
        if (settings.useDefaultLocation !== undefined) {
            document.getElementById('setting-default-location').checked = settings.useDefaultLocation;
        }
        if (settings.multipleDownloads !== undefined) {
            document.getElementById('setting-multiple-downloads').checked = settings.multipleDownloads;
        }
        if (settings.timestampPrefix !== undefined) {
            document.getElementById('setting-timestamp-prefix').checked = settings.timestampPrefix;
        }
        if (settings.extractSourceUrls !== undefined) {
            document.getElementById('setting-extract-source-urls').checked = settings.extractSourceUrls;
        }
        if (settings.collectBlobImages !== undefined) {
            document.getElementById('setting-collect-blob-images').checked = settings.collectBlobImages;
        }
    }

    // Save settings
    async function saveSettings() {
        const settings = {
            useDefaultLocation: document.getElementById('setting-default-location').checked,
            multipleDownloads: document.getElementById('setting-multiple-downloads').checked,
            timestampPrefix: document.getElementById('setting-timestamp-prefix').checked,
            extractSourceUrls: document.getElementById('setting-extract-source-urls').checked,
            collectBlobImages: document.getElementById('setting-collect-blob-images').checked
        };
        console.log('Saving settings:', settings);
        
        await chrome.storage.local.set(settings);
    }

    // Close and save settings
    async function closeSettings() {
        await saveSettings();
        settingsModal.classList.remove('active');
        document.body.classList.remove('settings-open');
    }

    // Get useDefaultLocation setting
    async function getUseDefaultLocation() {
        const settings = await chrome.storage.local.get(['useDefaultLocation']);
        console.log('Settings retrieved for download:', settings);
        return settings.useDefaultLocation === true;
    }

    // Get multipleDownloads setting
    async function getMultipleDownloads() {
        const settings = await chrome.storage.local.get(['multipleDownloads']);
        return settings.multipleDownloads === true;
    }

    // Get timestampPrefix setting
    async function getTimestampPrefix() {
        const settings = await chrome.storage.local.get(['timestampPrefix']);
        return settings.timestampPrefix === true;
    }

    // Get extractSourceUrls setting
    async function getExtractSourceUrls() {
        const settings = await chrome.storage.local.get(['extractSourceUrls']);
        return settings.extractSourceUrls === true;
    }

    // Get collectBlobImages setting
    async function getCollectBlobImages() {
        const settings = await chrome.storage.local.get(['collectBlobImages']);
        return settings.collectBlobImages === true;
    }

    // Open settings modal
    settingsBtn.addEventListener('click', () => {
        console.log('Settings button clicked');
        document.body.classList.add('settings-open');
        settingsModal.classList.add('active');
    });

    // Close settings modal (and save)
    settingsClose.addEventListener('click', closeSettings);

    // Close modal when clicking outside (and save)
    settingsModal.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            closeSettings();
        }
    });

    // Save settings immediately when checkbox changes
    document.getElementById('setting-default-location').addEventListener('change', async (event) => {
        console.log('Checkbox changed to:', event.target.checked);
        await saveSettings();
    });

    document.getElementById('setting-multiple-downloads').addEventListener('change', async (event) => {
        console.log('Multiple downloads changed to:', event.target.checked);
        await saveSettings();
    });

    document.getElementById('setting-timestamp-prefix').addEventListener('change', async (event) => {
        console.log('Timestamp prefix changed to:', event.target.checked);
        await saveSettings();
    });

    document.getElementById('setting-extract-source-urls').addEventListener('change', async (event) => {
        console.log('Extract source URLs changed to:', event.target.checked);
        await saveSettings();
    });

    document.getElementById('setting-collect-blob-images').addEventListener('change', async (event) => {
        console.log('Collect BLOB images changed to:', event.target.checked);
        await saveSettings();
    });

    // Helper function to get file prefix
    function getFilePrefix(counter) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}_${hours}${minutes}${seconds}`;
    }

    // Load settings on startup
    await loadSettings();
    console.log('Popup initialized');

    // Show spinner while collecting canvas information
    let main = document.getElementById('main');
    let tableHeader = document.getElementById('table-header');
    let spinner = document.getElementById('spinner');
    let spinnerText = document.getElementById('spinner-text');
    main.style.display = 'none';
    tableHeader.style.display = 'none';
    spinner.style.display = 'flex';
    spinnerText.textContent = 'Collecting canvas information from page...';

    // Handle single file download/copy action
    async function handleSingleFileAction(button) {
        let main = document.getElementById('main');
        main.style.display = 'none';
        let spinner = document.getElementById('spinner');
        let spinnerText = document.getElementById('spinner-text');
        spinner.style.display = 'flex';
        
        if (button.dataset.canvasCopy) {
            spinnerText.textContent = 'Copying...';
        } else {
            spinnerText.textContent = 'Saving...';
        }
        
        // Get canvas content
        let canvasResult = await getCanvasContent({
            frame: button.dataset.canvasFrame,
            index: button.dataset.canvasIndex,
            type: button.dataset.canvasType,
            isBlobImage: button.dataset.isBlob === 'true',
            blobIndex: button.dataset.blobIndex
        });
        
        // Handle case where canvas data is not available
        if (!canvasResult || !canvasResult.dataURL) {
            main.style.display = 'block';
            spinner.style.display = 'none';
            return;
        }
        
        let dataURL = canvasResult.dataURL;
        const hasSourceUrl = canvasResult.hasSourceUrl;
        const isBlobUrl = canvasResult.isBlobUrl;
        
        if (button.dataset.canvasCopy) {
            if (hasSourceUrl || isBlobUrl) {
                // Cannot copy source URL or BLOB URL to clipboard as image
                button.classList.add('is-danger');
                button.innerText = 'N/A';
                setTimeout(() => {
                    button.classList.remove('is-danger');
                    button.innerText = 'COPY';
                }, 1000);
            } else {
                await copyDataUrlToClipboard(dataURL);
                button.classList.add('is-success');
                button.innerText = 'COPIED!';
                setTimeout(() => {
                    button.classList.remove('is-success');
                    button.innerText = 'COPY';
                }, 1000);
            }
        } else {
            let useDefaultLocation = await getUseDefaultLocation();
            let useTimestamp = await getTimestampPrefix();
            let prefix = useTimestamp ? getFilePrefix() : 'canvas';
            console.log('useDefaultLocation:', useDefaultLocation, 'saveAs:', !useDefaultLocation);
            
            // Determine file extension
            let extension;
            if (hasSourceUrl) {
                // Extract extension from source URL or default to png
                try {
                    const urlPath = new URL(dataURL).pathname;
                    const ext = urlPath.split('.').pop().toLowerCase();
                    extension = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) ? ext : 'png';
                } catch (e) {
                    extension = 'png';
                }
            } else if (isBlobUrl) {
                // BLOB URLs default to png
                extension = 'png';
            } else {
                extension = button.dataset.canvasType.substring(6);
            }
            
            await chrome.downloads.download({
                url: dataURL,
                filename: `${prefix}.` + extension,
                saveAs: !useDefaultLocation
            });
        }
        
        main.style.display = 'block';
        spinner.style.display = 'none';
    }

    document.getElementById('table-header').addEventListener('click', async (event)=>{
        if (event.target.tagName !== 'BUTTON')
            return;
        event.preventDefault();
        let main = document.getElementById('main');
        main.style.display = 'none';
        let spinner = document.getElementById('spinner');
        let spinnerText = document.getElementById('spinner-text');
        spinner.style.display = 'flex';
        
        if (event.target.dataset.canvasData){
            spinnerText.textContent = 'Generating archive...';
            let counter = 1;
            let zip = new JSZip();
            let entries;
            
            // Check if any checkboxes are unchecked - if so, use only selected items
            let allCheckboxes = document.querySelectorAll('input[name="canvas-select"]');
            let checkedCheckboxes = document.querySelectorAll('input[name="canvas-select"]:checked');
            
            if (checkedCheckboxes.length < allCheckboxes.length) {
                // Use selected items only
                let selectedEntries = getSelectedEntries();
                entries = selectedEntries.map(entry => ({
                    frameId: entry.frameId,
                    index: entry.index,
                    isBlobUrl: entry.isBlobUrl,
                    blobIndex: entry.blobIndex
                }));
            } else {
                // Use all items - need to get full entry data from canvasInfoList
                const entryPairs = event.target.dataset.canvasData.split(';;;').map(entry => entry.split('|||'));
                entries = entryPairs.map(pair => {
                    const entry = canvasInfoList.find(c => c.frameId === pair[0] && String(c.index) === pair[1]);
                    return entry ? {
                        frameId: entry.frameId,
                        index: entry.index,
                        isBlobUrl: entry.isBlobUrl,
                        blobIndex: entry.blobIndex
                    } : { frameId: pair[0], index: pair[1], isBlobUrl: false, blobIndex: undefined };
                });
            }
            let multipleDownloads = await getMultipleDownloads();
            let useDefaultLocation = await getUseDefaultLocation();
            let useTimestamp = await getTimestampPrefix();
            let prefix = useTimestamp ? getFilePrefix() : 'canvas';
            
            // Calculate padding for counter based on number of images
            const totalImages = entries.length;
            const paddingLength = String(totalImages).length;
            
            for (let entry of entries){
                let canvasResult = await getCanvasContent( {
                    frame: entry.frameId,
                    index: entry.index,
                    type: event.target.dataset.canvasType,
                    isBlobImage: entry.isBlobUrl,
                    blobIndex: entry.blobIndex
                });
                
                // Skip tainted canvases without source URL
                if (!canvasResult || !canvasResult.dataURL) {
                    console.warn('Skipping canvas - no data available');
                    counter++;
                    continue;
                }
                
                const paddedCounter = String(counter).padStart(paddingLength, '0');
                
                if (multipleDownloads) {
                    // Download each file separately
                    let extension = event.target.dataset.canvasType.substring(6);
                    if (canvasResult.hasSourceUrl) {
                        // Extract extension from source URL or default to png
                        try {
                            const urlPath = new URL(canvasResult.dataURL).pathname;
                            const ext = urlPath.split('.').pop().toLowerCase();
                            extension = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) ? ext : 'png';
                        } catch (e) {
                            extension = 'png';
                        }
                    } else if (canvasResult.isBlobUrl) {
                        extension = 'png';
                    }
                    await chrome.downloads.download({
                        url: canvasResult.dataURL,
                        filename: `${prefix}_${paddedCounter}.` + extension,
                        saveAs: !useDefaultLocation
                    });
                } else {
                    // Add to zip - need to handle source URLs and BLOB URLs differently
                    if (canvasResult.hasSourceUrl || canvasResult.isBlobUrl) {
                        // Fetch the image and convert to base64 for zip
                        try {
                            const response = await fetch(canvasResult.dataURL);
                            const blob = await response.blob();
                            const base64 = await blobToBase64(blob);
                            const base64Data = base64.split('base64,')[1];
                            if (base64Data) {
                                zip.file(`${prefix}_${paddedCounter}.png`, base64Data, {base64: true});
                            }
                        } catch (e) {
                            console.error('Failed to fetch URL for zip:', e);
                        }
                    } else {
                        // Regular data URL
                        const base64Data = canvasResult.dataURL.split('base64,')[1];
                        if (base64Data) {
                            zip.file(`${prefix}_${paddedCounter}.` + event.target.dataset.canvasType.substring(6), base64Data, {base64: true});
                        }
                    }
                }
                counter++;
            }
            
            // Only create zip if not using multiple downloads
            if (!multipleDownloads) {
                let content = await zip.generateAsync({type:"blob"});
                let zipDataURL = URL.createObjectURL(content);
                let filename = checkedCheckboxes.length < allCheckboxes.length ? `${prefix}_selected.zip` : `${prefix}_all.zip`;
                await chrome.downloads.download({
                    url: zipDataURL,
                    filename: filename,
                    saveAs: !useDefaultLocation
                });
            }
        }
        else if (event.target.dataset.canvasPdf){
            spinnerText.textContent = 'Generating PDF...';
            let counter = 1;
            let doc = new window.jspdf.jsPDF();
            let entries;
            
            // Check if any checkboxes are unchecked - if so, use only selected items
            let allCheckboxes = document.querySelectorAll('input[name="canvas-select"]');
            let checkedCheckboxes = document.querySelectorAll('input[name="canvas-select"]:checked');
            
            if (checkedCheckboxes.length < allCheckboxes.length) {
                // Use selected items only
                let selectedEntries = getSelectedEntries();
                entries = selectedEntries.map(entry => ({
                    frameId: entry.frameId,
                    index: entry.index,
                    isBlobUrl: entry.isBlobUrl,
                    blobIndex: entry.blobIndex
                }));
            } else {
                // Use all items - need to get full entry data from canvasInfoList
                const entryPairs = event.target.dataset.canvasPdf.split(';;;').map(entry => entry.split('|||'));
                entries = entryPairs.map(pair => {
                    const entry = canvasInfoList.find(c => c.frameId === pair[0] && String(c.index) === pair[1]);
                    return entry ? {
                        frameId: entry.frameId,
                        index: entry.index,
                        isBlobUrl: entry.isBlobUrl,
                        blobIndex: entry.blobIndex
                    } : { frameId: pair[0], index: pair[1], isBlobUrl: false, blobIndex: undefined };
                });
            }
            
            // Calculate padding for counter based on number of pages
            const totalPages = entries.length;
            const paddingLength = String(totalPages).length;
            
            for (let entry of entries){
                let canvasResult = await getCanvasContent( {
                    frame: entry.frameId,
                    index: entry.index,
                    type: event.target.dataset.canvasType,
                    isBlobImage: entry.isBlobUrl,
                    blobIndex: entry.blobIndex
                });
                
                // Skip tainted canvases without source URL
                if (!canvasResult || !canvasResult.dataURL) {
                    console.warn('Skipping canvas for PDF - no data available');
                    continue;
                }
                
                let dataURL = canvasResult.dataURL;
                
                // For source URLs and BLOB URLs, we need to fetch and convert to data URL for PDF
                if (canvasResult.hasSourceUrl || canvasResult.isBlobUrl) {
                    try {
                        const response = await fetch(dataURL);
                        const blob = await response.blob();
                        dataURL = await blobToBase64(blob);
                    } catch (e) {
                        console.error('Failed to fetch URL for PDF:', e);
                        continue;
                    }
                }
                
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
            let useDefaultLocation = await getUseDefaultLocation();
            let pdfBlob = doc.output('blob');
            let pdfURL = URL.createObjectURL(pdfBlob);
            await chrome.downloads.download({
                url: pdfURL,
                filename: filename,
                saveAs: !useDefaultLocation
            });
        }

        main.style.display = 'block';
        spinner.style.display = 'none';
    }, false);

    // Add event listener for single file download buttons in main section
    document.getElementById('main').addEventListener('click', async (event) => {
        if (event.target.tagName !== 'BUTTON')
            return;
        event.preventDefault();
        
        // Only handle single file buttons (have canvas-frame attribute)
        if (!event.target.dataset.canvasFrame)
            return;
        
        await handleSingleFileAction(event.target);
    }, false);

    // Add event listener for checkboxes in table header
    document.getElementById('table-header').addEventListener('change', (event) => {
        if (event.target.type === 'checkbox') {
            if (event.target.id === 'all-toggle') {
                toggleAllCheckboxes(event.target.checked);
            } else {
                updateAllToggleCheckbox();
                updateAllButtonsState();
            }
        }
    });

    // Add event listener for checkboxes in main content
    document.getElementById('main').addEventListener('change', (event) => {
        if (event.target.type === 'checkbox') {
            updateAllToggleCheckbox();
            updateAllButtonsState();
        }
    });

    let tabs = await chrome.tabs.query({active: true, currentWindow: true});

    chrome.runtime.onMessage.addListener(function(message) {
        if (message.canvasInfoList) {
            canvasInfoList = canvasInfoList.concat(message.canvasInfoList);
            drawContent(canvasInfoList);
            // Hide spinner and show main content
            spinner.style.display = 'none';
            main.style.display = 'block';
            tableHeader.style.display = 'block';
        }
    });

    // Set a timeout to hide spinner if no response received
    let spinnerTimeout = setTimeout(() => {
        spinner.style.display = 'none';
        main.style.display = 'block';
        tableHeader.style.display = 'block';
        drawContent([]);
    }, 3000);

    // Clear timeout when message is received
    chrome.runtime.onMessage.addListener(function(message) {
        if (message.canvasInfoList) {
            clearTimeout(spinnerTimeout);
        }
    });

    await chrome.tabs.sendMessage(tabs[0].id, {command: COMMANDS.GET_CANVAS_INFO_LIST});

    async function getCanvasContent (data){
        let tabs = await chrome.tabs.query({active: true, currentWindow: true});
        let result = await chrome.tabs.sendMessage(tabs[0].id, {command: COMMANDS.GET_CANVAS_DATA, data: {
                frame: data.frame,
                index: data.index,
                type: data.type,
                isBlobImage: data.isBlobImage,
                blobIndex: data.blobIndex ? parseInt(data.blobIndex) : undefined
            }});
        return result;
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
        let tableHeader = document.getElementById('table-header');
        let footer = document.getElementById('footer');

        if (canvasInfoList.length > 0){
            // Separate available and tainted canvases (BLOB images are never tainted)
            const availableCanvases = canvasInfoList.filter(c => !c.isTainted || c.hasSourceUrl || c.isBlobUrl);
            const taintedCanvases = canvasInfoList.filter(c => c.isTainted && !c.hasSourceUrl && !c.isBlobUrl);
            
            let headerHtml = [];
            let bodyHtml = [];

            if (availableCanvases.length > 0) {
                // Table header with column names
                headerHtml.push("<table class=\"table is-narrow\">");
                headerHtml.push("<tr>");
                headerHtml.push("<th class=\"checkbox-column\">");
                headerHtml.push("</th>");
                headerHtml.push("<th>");
                headerHtml.push("Preview");
                headerHtml.push("</th>");
                headerHtml.push("<th colspan=\"4\">");
                headerHtml.push("Export options");
                headerHtml.push("</th>");
                headerHtml.push("</tr>");

                // "All" row as part of sticky header
                drawDownloadAll(headerHtml, availableCanvases.map(element => element.frameId + '|||' + element.index).join(';;;'));
                headerHtml.push("</table>");

                // Body table with individual entries
                bodyHtml.push("<table class=\"table is-narrow\">");
                // Only draw available canvases
                availableCanvases.forEach((canvasInfo, index)=>{
                    drawElement(bodyHtml, canvasInfo, index);
                });
                bodyHtml.push("</table>");
            }

            tableHeader.innerHTML = headerHtml.join('\n');
            section.innerHTML = bodyHtml.join('\n');

            // Show tainted canvas warning in the footer
            if (taintedCanvases.length > 0) {
                footer.innerHTML = "<div class=\"tainted-warning\"><strong>⚠️ " + taintedCanvases.length + " canvas" + (taintedCanvases.length > 1 ? "es" : "") + " not shown</strong> — Cross-origin images cannot be exported due to browser security. <a href=\"https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image\" target=\"_blank\" rel=\"noopener\" style=\"color: #856404; text-decoration: underline;\">Learn more</a></div>";
            } else {
                footer.innerHTML = '';
            }

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
            tableHeader.innerHTML = '';
            section.innerHTML = "<div class=\"notification\">No canvas was found on the page.</div>";
            footer.innerHTML = '';
        }
    }

    function drawElement(html, element, index){
        const hasSourceUrl = element.hasSourceUrl;
        const isBlobUrl = element.isBlobUrl;
        
        html.push("<tr>");
        html.push("<td class=\"checkbox-column\">");
        html.push(`<input type="checkbox" name="canvas-select" value="${index}" class="checkbox-input" checked>`);
        html.push("</td>");
        html.push("<td>");
        
        // Show preview
        if (element.dataURL) {
            html.push("<img alt='canvas content' src=\"" + element.dataURL + "\">");
        }
        
        // Add source URL indicator
        if (hasSourceUrl) {
            html.push("<div style='font-size:9px;color:#48c774;margin-top:2px;' title='Using source URL'>🔗 Source URL</div>");
        }
        
        // Add BLOB URL indicator
        if (isBlobUrl) {
            html.push("<div style='font-size:9px;color:#3273dc;margin-top:2px;' title='BLOB URL image'>📦 BLOB URL</div>");
        }
        
        html.push("</td>");
        
        // Export buttons
        html.push("<td>");
        if (isBlobUrl) {
            html.push("<button class=\"button is-primary is-small\" data-canvas-type=\"image/png\" data-canvas-frame=\"" + element.frameId + "\" data-canvas-index=\"" + element.index + "\" data-blob-index=\"" + element.blobIndex + "\" data-is-blob=\"true\" title=\"Download as PNG image.\">PNG</button>");
        } else {
            html.push("<button class=\"button is-primary is-small\" data-canvas-type=\"image/png\" data-canvas-frame=\"" + element.frameId + "\" data-canvas-index=\"" + element.index + "\" title=\"Download as PNG image.\">PNG</button>");
        }
        html.push("</td>");
        html.push("<td>");
        if (!hasSourceUrl && !isBlobUrl) {
            html.push("<button class=\"button is-primary is-small\" data-canvas-type=\"image/jpeg\" data-canvas-frame=\"" + element.frameId + "\" data-canvas-index=\"" + element.index + "\" title=\"Download as JPEG image with 100% quality.\">JPEG</button>");
        } else if (isBlobUrl) {
            html.push("<button class=\"button is-small\" disabled title=\"JPEG not available for BLOB URLs\">JPEG</button>");
        } else {
            html.push("<button class=\"button is-small\" disabled title=\"JPEG not available for source URLs\">JPEG</button>");
        }
        html.push("</td>");
        html.push("<td>");
        if (!hasSourceUrl && !isBlobUrl) {
            html.push("<button class=\"button is-primary is-small\" data-canvas-type=\"image/webp\" data-canvas-frame=\"" + element.frameId + "\" data-canvas-index=\"" + element.index + "\" title=\"Download as WEBP image.\">WEBP</button>");
        } else if (isBlobUrl) {
            html.push("<button class=\"button is-small\" disabled title=\"WEBP not available for BLOB URLs\">WEBP</button>");
        } else {
            html.push("<button class=\"button is-small\" disabled title=\"WEBP not available for source URLs\">WEBP</button>");
        }
        html.push("</td>");
        html.push("<td>");
        if (!hasSourceUrl && !isBlobUrl) {
            html.push("<button class=\"button is-primary is-small fixed-size\" data-canvas-type=\"image/png\" data-canvas-copy=\"true\" data-canvas-frame=\"" + element.frameId + "\" data-canvas-index=\"" + element.index + "\" title=\"Copy to clipboard.\">COPY</button>");
        } else if (isBlobUrl) {
            html.push("<button class=\"button is-small fixed-size\" disabled title=\"Copy not available for BLOB URLs\">COPY</button>");
        } else {
            html.push("<button class=\"button is-small fixed-size\" disabled title=\"Copy not available for source URLs\">COPY</button>");
        }
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

    // Helper function to convert Blob to Base64 Data URL
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
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