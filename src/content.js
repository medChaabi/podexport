/**
 * PodExport Content Script
 * Injects download button on Amazon product images
 */

console.log('PodExport content script loaded on:', window.location.href);

// Configuration for download button on image
const CONFIG = {
    buttonStyles: {
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        zIndex: '9999',
        width: '32px',
        height: '32px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        color: '#232f3e',
        border: '1px solid #232f3e',
        borderRadius: '50%',
        fontSize: '16px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease'
    },
    hoverStyles: {
        backgroundColor: '#ff9900',
        color: 'white',
        borderColor: '#ff9900',
        transform: 'scale(1.1)'
    }
};

// Initialize the extension
function init() {
    console.log('PodExport: Initializing...');
    
    // Wait for page to load completely
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkForProductImage);
    } else {
        checkForProductImage();
    }
    
    // Listen for dynamic content changes
    observePageChanges();
}

/**
 * Check if we're on a product page with valid multi-PNG image URL
 */
function checkForProductImage() {
    // First check if reviews anchor exists (required)
    const reviewAnchor = document.getElementById('averageCustomerReviewsAnchor');
    
    if (!reviewAnchor) {
        console.log('PodExport: No product reviews found');
        return;
    }
    
    // Find the product image wrapper
    const imgWrapper = document.getElementById('imgTagWrapperId');
    
    if (!imgWrapper) {
        console.log('PodExport: Image wrapper not found');
        return;
    }
    
    // Find the actual product image
    const productImage = imgWrapper.querySelector('img');
    
    if (!productImage || !productImage.src) {
        console.log('PodExport: Product image not found');
        return;
    }
    
    console.log('PodExport: Checking product image URL:', productImage.src);
    
    // Check if the image URL contains multiple .png parts (encoded as %7C)
    const urlPattern = /\.png%7C.*\.png$/;
    const hasMultiplePngs = urlPattern.test(productImage.src);
    
    // Count actual .png occurrences in the URL
    const pngCount = (productImage.src.match(/\.png/g) || []).length;
    
    console.log('PodExport: PNG count in URL:', pngCount);
    console.log('PodExport: Has multiple PNG pattern:', hasMultiplePngs);
    
    // ONLY show button if URL has 2 OR MORE .png parts
    if (pngCount >= 2) {
        console.log('PodExport: Valid multi-PNG product detected - SHOWING download button');
        injectDownloadButton();
    } else {
        console.log('PodExport: Invalid product (not enough PNG parts) - NOT showing button');
    }
}

/**
 * Inject the download button on the product image
 */
function injectDownloadButton() {
    // Check if button already exists
    if (document.getElementById('podexport-download-btn')) {
        return;
    }
    
    // Find the image wrapper
    const imgWrapper = document.getElementById('imgTagWrapperId');
    
    if (!imgWrapper) {
        console.log('PodExport: Image wrapper not found');
        return;
    }
    
    // Find the actual image
    const productImage = imgWrapper.querySelector('img');
    
    if (!productImage) {
        console.log('PodExport: Product image not found');
        return;
    }
    
    // Make the wrapper position relative if it's not already
    if (getComputedStyle(imgWrapper).position === 'static') {
        imgWrapper.style.position = 'relative';
    }
    
    // Create the download button
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'podexport-download-btn';
    downloadBtn.innerHTML = `
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
        </svg>
    `;
    
    // Apply styles
    Object.assign(downloadBtn.style, CONFIG.buttonStyles);
    
    // Add hover effects
    downloadBtn.addEventListener('mouseenter', function() {
        Object.assign(this.style, CONFIG.hoverStyles);
    });
    
    downloadBtn.addEventListener('mouseleave', function() {
        Object.assign(this.style, CONFIG.buttonStyles);
    });
    
    // Add click handler to show image URL
    downloadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Get the image element
        const imgWrapper = document.getElementById('imgTagWrapperId');
        const img = imgWrapper.querySelector('img');
        
        if (img && img.src) {
           const imageId = getImageId(img.src);
           const imageUrl = `https://m.media-amazon.com/images/I/${imageId}.png`;
           downloadImage(imageUrl);
        } 
    });
    
    // Append to image wrapper
    imgWrapper.appendChild(downloadBtn);
    
    console.log('PodExport: Download button injected on product image');
}

function getImageId(imgSrc){
    const imageId = imgSrc.split(".png")[0];
    return imageId.slice(-11);
}

function downloadImage(imageUrl){
    try{
        const imageName = "podexport";
        const imageExtension = "png";
        
        // Create a link element to download the image directly
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = `${imageName}.${imageExtension}`;
        a.target = '_blank'; // Open in new tab as fallback
        
        // Try to trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        return true;
    } catch(error){
        console.error('Download error:', error);
        // Fallback: open image in new tab
        window.open(imageUrl, '_blank');
        return false;
    }
}




/**
 * Observe page changes for SPAs
 */
function observePageChanges() {
    const observer = new MutationObserver(function(mutations) {
        // Check if URL changed or if product content loaded
        if (window.location.href !== observer.lastUrl) {
            observer.lastUrl = window.location.href;
            console.log('PodExport: URL changed, re-checking for product image');
            
            // Remove existing button if it exists
            const existingBtn = document.getElementById('podexport-download-btn');
            if (existingBtn) {
                existingBtn.remove();
            }
            
            // Re-check for product image
            setTimeout(checkForProductImage, 500);
        }
        
        // Also check if product image with valid multi-PNG pattern appears (for dynamic loading)
        if (!document.getElementById('podexport-download-btn')) {
            const imgWrapper = document.getElementById('imgTagWrapperId');
            
            if (imgWrapper) {
                const productImage = imgWrapper.querySelector('img');
                
                if (productImage && productImage.src) {
                    // Count actual .png occurrences in the URL
                    const pngCount = (productImage.src.match(/\.png/g) || []).length;
                    
                    // ONLY show button if URL has 2 OR MORE .png parts
                    if (pngCount >= 2) {
                        console.log('PodExport: Valid multi-PNG product detected in observer, injecting button');
                        injectDownloadButton();
                        return;
                    }
                }
            }
        }
    });
    
    observer.lastUrl = window.location.href;
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}


/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    notification.textContent = message;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        .spinner {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Listen for messages from popup or background
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Content script received message:', request);
    
    if (request.action === 'getMediaInfo') {
        const mediaInfo = extractMediaInfo();
        sendResponse(mediaInfo);
    } else if (request.action === 'triggerDownload') {
        handleDownloadClick({
            currentTarget: document.getElementById('podexport-download-btn'),
            preventDefault: () => {}
        });
        sendResponse({success: true});
    }
    
    return true; // Keep message channel open for async response
});

// Initialize the content script
init();