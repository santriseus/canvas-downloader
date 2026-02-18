(function () {

    const COMMANDS = {
        GET_CANVAS_INFO_LIST: "GET_CANVAS_INFO_LIST",
        GET_CANVAS_DATA: "GET_CANVAS_DATA",

    };

    let frameId = generateId(20);
    let extractSourceUrls = false; // Default: disabled

    // Load setting from storage
    chrome.storage.local.get(['extractSourceUrls'], function(result) {
        extractSourceUrls = result.extractSourceUrls === true;
    });

    // Listen for setting changes
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (changes.extractSourceUrls) {
            extractSourceUrls = changes.extractSourceUrls.newValue === true;
        }
    });

    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            switch (request.command) {
                case COMMANDS.GET_CANVAS_INFO_LIST:
                    // Update setting before processing
                    chrome.storage.local.get(['extractSourceUrls'], function(result) {
                        extractSourceUrls = result.extractSourceUrls === true;
                        let list = getCanvasInfoList().then((list) => {
                            chrome.runtime.sendMessage(chrome.runtime.id, {canvasInfoList: list});
                        }).catch(err => {
                            console.error('Error getting canvas list:', err);
                        });
                    });
                    break;
                    case COMMANDS.GET_CANVAS_DATA:
                        if (request.data.frame === frameId){
                            try {
                                const canvas = document.getElementsByTagName("canvas")[request.data.index];
                                const result = getCanvasDataWithSource(canvas, request.data.type);
                                sendResponse(result);
                            } catch (e) {
                                console.error('Error getting canvas data:', e);
                                sendResponse({
                                    type: 'error',
                                    dataURL: null,
                                    frameId: frameId,
                                    isTainted: true,
                                    hasSourceUrl: false,
                                    error: e.message
                                });
                            }
                        }
                    break;
                default:
                    break;
            }
            return true; // Keep message channel open for async response
        });


    function getCanvasElementsList(){
        // Include all canvases - we'll handle tainted ones via data-src fallback
        let canvasList = Array.from(document.getElementsByTagName("canvas"));
        return canvasList;
    }

    /**
     * Try to get canvas data from data-src attribute first (bypasses taint),
     * then fall back to canvas.toDataURL()
     */
    function getCanvasDataWithSource(canvas, type = 'image/png') {
        // Only check for source URL if setting is enabled
        if (extractSourceUrls) {
            const sourceUrl = canvas.dataset.src || 
                              canvas.getAttribute('data-src') ||
                              canvas.dataset.source ||
                              canvas.getAttribute('data-source') ||
                              canvas.dataset.url ||
                              canvas.getAttribute('data-url');
            
            if (sourceUrl) {
                // Resolve relative URLs
                const absoluteUrl = new URL(sourceUrl, window.location.href).href;
                return {
                    type: 'url',
                    dataURL: absoluteUrl,
                    frameId: frameId,
                    isTainted: false,
                    hasSourceUrl: true
                };
            }
        }
        
        // Fallback to canvas extraction
        try {
            return {
                type: 'dataUrl',
                dataURL: canvas.toDataURL(type, 1),
                frameId: frameId,
                isTainted: false,
                hasSourceUrl: false
            };
        } catch (e) {
            // Canvas is tainted and no source URL available
            return {
                type: 'tainted',
                dataURL: null,
                frameId: frameId,
                isTainted: true,
                hasSourceUrl: false
            };
        }
    }

    async function getCanvasInfoList(){

        let canvasList = getCanvasElementsList();

        if (canvasList.length < 1)
            return [];

        let hiddenCanvas = document.createElement('canvas');

        let result = [];
        for (let index = 0; index < canvasList.length; index++) {
            let canvas = canvasList[index];
            
            // Only check for source URL if setting is enabled
            const sourceUrl = extractSourceUrls ? getImageSource(canvas) : null;
            const tainted = isTainted(canvas);
            
            let canvasData = {
                frameId: frameId,
                index: index,
                width: canvas.width,
                height: canvas.height,
                isTainted: tainted,
                hasSourceUrl: !!sourceUrl,
                sourceUrl: sourceUrl,
                dataURL: null
            };

            if (sourceUrl) {
                // Use source URL directly - no taint issues
                canvasData.dataURL = sourceUrl;
                canvasData.type = 'url';
            } else if (!tainted) {
                // Normal canvas extraction
                hiddenCanvas.getContext("2d").clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);

                if (canvas.width > 50 || canvas.height > 50) {
                    // Resize large canvases to fit preview
                    if (canvas.width > canvas.height){
                        hiddenCanvas.width = 100;
                        hiddenCanvas.height = canvas.height * (hiddenCanvas.width / canvas.width);
                    } else{
                        hiddenCanvas.height = 100;
                        hiddenCanvas.width = canvas.width * (hiddenCanvas.height / canvas.height);
                    }
                } else {
                    // Use original size for small canvases
                    hiddenCanvas.width = canvas.width;
                    hiddenCanvas.height = canvas.height;
                }

                hiddenCanvas.getContext("2d").drawImage(canvas, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
                // wait requestAnimationFrame to ensure drawing is complete
                await new Promise(requestAnimationFrame);

                canvasData.dataURL = hiddenCanvas.toDataURL();
                canvasData.type = 'dataUrl';
            } else {
                // Tainted canvas with no source URL - cannot extract
                canvasData.type = 'tainted';
                canvasData.dataURL = null;
            }

            result.push(canvasData);
        }

        return result;
    }

    /**
     * Extract image source URL from various data attributes
     */
    function getImageSource(canvas) {
        const possibleSources = [
            canvas.getAttribute('data-src'),
            canvas.dataset.src,
            canvas.dataset.image,
            canvas.dataset.url,
            canvas.getAttribute('data-original'),
            canvas.getAttribute('data-source'),
            canvas.dataset.source,
            canvas.getAttribute('data-image-url'),
            canvas.dataset.imageUrl,
            // Check parent element for lazy-loaded images
            canvas.parentElement?.getAttribute('data-src'),
            canvas.parentElement?.dataset.src,
        ];
        
        const source = possibleSources.find(src => src && src.length > 0);
        
        if (source) {
            // Resolve relative URLs to absolute
            try {
                return new URL(source, window.location.href).href;
            } catch (e) {
                return source;
            }
        }
        
        return null;
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



