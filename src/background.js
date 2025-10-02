/**
 * PodExport Background Service Worker
 * Handles tab opening and extension lifecycle
 */


/**
 * Install event - runs when extension is installed or updated
 */
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
        // Open welcome page or documentation
        chrome.tabs.create({
            url: 'https://github.com/medChaabi/podexport'
        });
    }
});

/**
 * Listen for messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.action) {
        case 'openImage':
            handleOpenImage(request.data, sendResponse);
            break;
            
        default:
            sendResponse({error: 'Unknown action'});
    }
    
    // Return true to keep the message channel open for async response
    return true;
});

/**
 * Handle opening image in new tab
 */
async function handleOpenImage(imageInfo, sendResponse) {
    try {
        // Validate image info
        if (!imageInfo || !imageInfo.url) {
            throw new Error('No valid image URL provided');
        }
        
        // Open image in new tab
        chrome.tabs.create({
            url: imageInfo.url,
            active: false // Don't switch to the new tab immediately
        }, function(tab) {
            if (chrome.runtime.lastError) {
                sendResponse({
                    success: false,
                    error: chrome.runtime.lastError.message
                });
                return;
            }
            
            sendResponse({
                success: true,
                tabId: tab.id
            });
        });
        
    } catch (error) {
        sendResponse({
            success: false,
            error: error.message
        });
    }
}


/**
 * Handle extension icon click (if action is not popup)
 * Note: This only fires if there's no popup defined in manifest
 * Since we have a popup defined, this listener won't be triggered
 */
// chrome.action.onClicked.addListener(function(tab) {
//     // This only fires if there's no popup defined
//     // Could be used to trigger download on current page
//     console.log('Extension icon clicked on tab:', tab.id);
// });


/**
 * Keep service worker alive (for Manifest V3)
 */
const keepAlive = () => {
    // Send a simple message to keep the service worker active
    chrome.runtime.getPlatformInfo(() => {});
};

// Keep alive every 20 seconds
setInterval(keepAlive, 20000);
