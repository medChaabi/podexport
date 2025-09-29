/**
 * PodExport Background Service Worker
 * Handles downloads, message passing, and extension lifecycle
 */

console.log('PodExport background service worker initialized');

// Keep track of active downloads
const activeDownloads = new Map();

/**
 * Install event - runs when extension is installed or updated
 */
chrome.runtime.onInstalled.addListener(function(details) {
    console.log('Extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        // First installation
        chrome.storage.local.set({
            installedDate: new Date().toISOString(),
            downloadCount: 0,
            authorName: 'Your Name'
        });
        
        // Open welcome page or documentation
        chrome.tabs.create({
            url: 'https://github.com/medChaabi/podexport'
        });
    } else if (details.reason === 'update') {
        // Extension updated
        console.log('Updated from version:', details.previousVersion);
    }
});

/**
 * Listen for messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Background received message:', request);
    
    switch (request.action) {
        case 'download':
            handleDownload(request.data, sendResponse);
            break;
            
        case 'downloadImage':
            handleImageDownload(request.data, sendResponse);
            break;
            
        case 'getStats':
            getDownloadStats(sendResponse);
            break;
            
        case 'updateSettings':
            updateSettings(request.data, sendResponse);
            break;
            
        default:
            sendResponse({error: 'Unknown action'});
    }
    
    // Return true to keep the message channel open for async response
    return true;
});

/**
 * Handle download request
 */
async function handleDownload(mediaInfo, sendResponse) {
    try {
        console.log('Processing download:', mediaInfo);
        
        // Validate media info
        if (!mediaInfo || !mediaInfo.url) {
            throw new Error('No valid media URL provided');
        }
        
        // Generate filename
        const filename = generateFilename(mediaInfo);
        
        // Check if URL is downloadable
        const isValidUrl = await validateUrl(mediaInfo.url);
        if (!isValidUrl) {
            throw new Error('URL is not accessible or valid');
        }
        
        // Start download using Chrome's download API
        chrome.downloads.download({
            url: mediaInfo.url,
            filename: filename,
            saveAs: true, // Show save dialog
            conflictAction: 'uniquify' // Add number if file exists
        }, function(downloadId) {
            if (chrome.runtime.lastError) {
                console.error('Download error:', chrome.runtime.lastError);
                sendResponse({
                    success: false,
                    error: chrome.runtime.lastError.message
                });
                return;
            }
            
            console.log('Download started with ID:', downloadId);
            
            // Track the download
            activeDownloads.set(downloadId, {
                startTime: Date.now(),
                mediaInfo: mediaInfo
            });
            
            // Update download count
            incrementDownloadCount();
            
            sendResponse({
                success: true,
                downloadId: downloadId
            });
        });
        
    } catch (error) {
        console.error('Download error:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

/**
 * Handle image download request
 */
async function handleImageDownload(imageInfo, sendResponse) {
    try {
        console.log('Processing image download:', imageInfo);
        
        // Validate image info
        if (!imageInfo || !imageInfo.url) {
            throw new Error('No valid image URL provided');
        }
        
        // Generate filename for image
        const filename = generateImageFilename(imageInfo);
        
        // Start download using Chrome's download API
        chrome.downloads.download({
            url: imageInfo.url,
            filename: filename,
            saveAs: true, // Show save dialog
            conflictAction: 'uniquify' // Add number if file exists
        }, function(downloadId) {
            if (chrome.runtime.lastError) {
                console.error('Image download error:', chrome.runtime.lastError);
                sendResponse({
                    success: false,
                    error: chrome.runtime.lastError.message
                });
                return;
            }
            
            console.log('Image download started with ID:', downloadId);
            
            // Track the download
            activeDownloads.set(downloadId, {
                startTime: Date.now(),
                mediaInfo: imageInfo
            });
            
            // Update download count
            incrementDownloadCount();
            
            sendResponse({
                success: true,
                downloadId: downloadId
            });
        });
        
    } catch (error) {
        console.error('Image download error:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

/**
 * Generate filename from media info
 */
function generateFilename(mediaInfo) {
    // Clean up title and artist names
    const cleanString = (str) => {
        return str.replace(/[<>:"/\\|?*]/g, '_').trim();
    };
    
    const title = cleanString(mediaInfo.title || 'Unknown');
    const artist = cleanString(mediaInfo.artist || 'Unknown');
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Determine extension based on type
    let extension = '.mp3'; // Default
    if (mediaInfo.url) {
        if (mediaInfo.url.includes('.mp4') || mediaInfo.url.includes('.m4a')) {
            extension = '.mp4';
        } else if (mediaInfo.url.includes('.wav')) {
            extension = '.wav';
        } else if (mediaInfo.url.includes('.ogg')) {
            extension = '.ogg';
        }
    }
    
    // Build filename
    let filename = 'PodExport/';
    if (artist !== 'Unknown') {
        filename += `${artist} - `;
    }
    filename += title;
    
    // Add timestamp if needed to avoid duplicates
    if (mediaInfo.addTimestamp) {
        filename += ` [${timestamp}]`;
    }
    
    filename += extension;
    
    return filename;
}

/**
 * Generate filename for images
 */
function generateImageFilename(imageInfo) {
    // Clean up title
    const cleanString = (str) => {
        return str.replace(/[<>:"/\\|?*]/g, '_').trim();
    };
    
    const title = cleanString(imageInfo.title || 'amazon-product');
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Determine extension from URL
    let extension = '.jpg'; // Default
    if (imageInfo.url) {
        if (imageInfo.url.includes('.png')) {
            extension = '.png';
        } else if (imageInfo.url.includes('.webp')) {
            extension = '.webp';
        } else if (imageInfo.url.includes('.gif')) {
            extension = '.gif';
        }
    }
    
    // Build filename
    let filename = 'PodExport/Images/';
    filename += title;
    filename += '_' + timestamp;
    filename += extension;
    
    return filename;
}

/**
 * Validate URL is accessible
 */
async function validateUrl(url) {
    try {
        // Try a HEAD request to check if URL is valid
        const response = await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors' // Allow cross-origin requests
        });
        
        // If we get here without error, URL is likely valid
        return true;
    } catch (error) {
        console.error('URL validation failed:', error);
        
        // For some URLs, HEAD might fail but GET works
        // Return true anyway and let the download API handle it
        return true;
    }
}

/**
 * Monitor download progress
 */
chrome.downloads.onChanged.addListener(function(downloadDelta) {
    if (!downloadDelta.id) return;
    
    const downloadInfo = activeDownloads.get(downloadDelta.id);
    if (!downloadInfo) return;
    
    // Check state changes
    if (downloadDelta.state) {
        if (downloadDelta.state.current === 'complete') {
            console.log('Download completed:', downloadDelta.id);
            
            // Notify popup and content script
            chrome.runtime.sendMessage({
                action: 'downloadComplete',
                downloadId: downloadDelta.id,
                mediaInfo: downloadInfo.mediaInfo
            });
            
            // Clean up
            activeDownloads.delete(downloadDelta.id);
            
        } else if (downloadDelta.state.current === 'interrupted') {
            console.error('Download interrupted:', downloadDelta.id);
            
            // Notify about error
            chrome.runtime.sendMessage({
                action: 'downloadError',
                downloadId: downloadDelta.id,
                error: 'Download was interrupted'
            });
            
            // Clean up
            activeDownloads.delete(downloadDelta.id);
        }
    }
    
    // Track progress
    if (downloadDelta.bytesReceived) {
        console.log('Download progress:', downloadDelta.bytesReceived.current);
    }
});

/**
 * Get download statistics
 */
async function getDownloadStats(sendResponse) {
    chrome.storage.local.get(['downloadCount', 'installedDate'], function(result) {
        sendResponse({
            success: true,
            stats: {
                totalDownloads: result.downloadCount || 0,
                installedDate: result.installedDate || null,
                activeDownloads: activeDownloads.size
            }
        });
    });
}

/**
 * Update extension settings
 */
async function updateSettings(settings, sendResponse) {
    chrome.storage.local.set(settings, function() {
        if (chrome.runtime.lastError) {
            sendResponse({
                success: false,
                error: chrome.runtime.lastError.message
            });
        } else {
            sendResponse({success: true});
        }
    });
}

/**
 * Increment download count
 */
function incrementDownloadCount() {
    chrome.storage.local.get(['downloadCount'], function(result) {
        const newCount = (result.downloadCount || 0) + 1;
        chrome.storage.local.set({downloadCount: newCount});
        console.log('Total downloads:', newCount);
    });
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
 * Context menu integration (right-click menu)
 */


/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId === 'podexport-download') {
        console.log('Context menu download triggered');
        
        // Send message to content script to extract media info
        chrome.tabs.sendMessage(tab.id, {
            action: 'triggerDownload',
            contextUrl: info.srcUrl || info.linkUrl
        });
    }
});

/**
 * Keep service worker alive (for Manifest V3)
 */
const keepAlive = () => {
    // Send a simple message to keep the service worker active
    chrome.runtime.getPlatformInfo(() => {});
};

// Keep alive every 20 seconds
setInterval(keepAlive, 20000);

console.log('PodExport background service worker ready');