/**
 * PodExport Popup Script
 * Handles the popup interface interactions and communication with the extension
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('PodExport popup loaded');
    
    // Initialize popup
    initializePopup();

    // Set up event listeners
    setupEventListeners();
});

/**
 * Initialize the popup with stored data
 */
function initializePopup() {
    // Load any saved preferences or data from chrome.storage
    chrome.storage.local.get(['authorName', 'extensionStats'], function(result) {
        if (result.authorName) {
            // Update author name if customized
            const authorElements = document.querySelectorAll('.detail-value');
            if (authorElements[1]) {
                authorElements[1].textContent = result.authorName;
            }
        }
        
        if (result.extensionStats) {
            // Could display stats like number of downloads, etc.
            console.log('Extension stats:', result.extensionStats);
        }
    });
}



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
    // Track donate button clicks
    const donateButton = document.querySelector('.donate-button');
    if (donateButton) {
        donateButton.addEventListener('click', function() {
            // Track donation click
            chrome.storage.local.get(['donationClicks'], function(result) {
                const clicks = (result.donationClicks || 0) + 1;
                chrome.storage.local.set({donationClicks: clicks});
                console.log('Donation button clicked:', clicks, 'times');
            });
        });
    }
    
    // Handle GitHub link clicks
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