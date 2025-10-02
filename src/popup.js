/**
 * PodExport Popup Script
 * Handles the popup interface interactions and communication with the extension
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('PodExport popup loaded');
    setupEventListeners();
});

// No storage or settings are used; popup is static



/**
 * Check if URL is an Amazon domain
 */
function isAmazonDomain(url) {
    const amazonDomains = [
        'amazon.com',
        'amazon.co.uk',
        'amazon.ca',
        'amazon.de',
        'amazon.fr',
        'amazon.es',
        'amazon.it',
        'amazon.co.jp',
        'amazon.cn',
        'amazon.com.au',
        'amazon.com.br',
        'amazon.com.mx',
        'amazon.in',
        'amazon.nl',
        'amazon.ae',
        'amazon.sg',
        'amazon.se',
        'amazon.pl',
        'amazon.com.tr',
        'amazon.sa',
        'amazonmusic.com',
        'music.amazon.com'
    ];
    
    try {
        const urlObj = new URL(url);
        return amazonDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
        return false;
    }
}

/**
 * Set up event listeners for popup interactions
 */
function setupEventListeners() {
    const donateButton = document.querySelector('.donate-button');
    if (donateButton) {
        donateButton.addEventListener('click', function() {
            console.log('Rate/Review clicked');
        });
    }

    const githubLink = document.querySelector('.github-link');
    if (githubLink) {
        githubLink.addEventListener('click', function() {
            console.log('GitHub link clicked');
        });
    }
}

/**
 * Show status message - simplified version
 */
function showStatusMessage(message, type = 'info') {
    // Simplified - just log to console
    console.log(`Status: ${message}`);
}

/**
 * Send message to content script
 */
function sendMessageToContentScript(action, data = {}) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: action,
                data: data
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message:', chrome.runtime.lastError);
                    showStatusMessage('Error communicating with page', 'danger');
                } else if (response) {
                    console.log('Response from content script:', response);
                }
            });
        }
    });
}

/**
 * Listen for messages from other parts of the extension
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Popup received message:', request);
    
    if (request.action === 'downloadComplete') {
        showStatusMessage('Download completed successfully!', 'success');
    } else if (request.action === 'downloadError') {
        showStatusMessage('Download failed: ' + request.error, 'danger');
    }
    
    sendResponse({received: true});
});