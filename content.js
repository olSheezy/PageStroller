// Content script for handling navigation and hotkeys
let collection = [];
let currentIndex = 0;
let isPlaying = false;
let delay = 3000;
let autoTraverseTimeout = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateCollection') {
    collection = request.collection;
    currentIndex = request.currentIndex;
    delay = request.delay;
  } else if (request.action === 'setAutoTraverse') {
    isPlaying = request.enabled;
    delay = request.delay;
    
    if (isPlaying) {
      startAutoTraverse();
    } else {
      stopAutoTraverse();
    }
  } else if (request.action === 'updateDelay') {
    delay = request.delay;
  } else if (request.action === 'navigatePrevious') {
    navigatePrevious();
  } else if (request.action === 'navigateNext') {
    navigateNext();
  } else if (request.action === 'togglePlayPause') {
    togglePlayPause();
  }
  
  sendResponse({success: true});
  return true;
});

// Keyboard navigation - wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupKeyboardListeners);
} else {
  setupKeyboardListeners();
}

function setupKeyboardListeners() {
  document.addEventListener('keydown', (e) => {
    // Only handle if we have a collection
    if (collection.length === 0) {
      return;
    }
    
    // Ignore if user is typing in an input field or textarea
    const target = e.target;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable) {
      return;
    }
    
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigatePrevious();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateNext();
    }
  }, true); // Use capture phase to ensure we get the event first
}

function navigatePrevious() {
  if (collection.length === 0 || currentIndex <= 0) {
    return;
  }
  
  // If auto-traverse is playing, restart the timer after navigation
  const wasPlaying = isPlaying;
  if (wasPlaying) {
    stopAutoTraverse();
  }
  
  currentIndex--;
  navigateToCurrentIndex();
  
  // Restart auto-traverse if it was playing
  if (wasPlaying) {
    startAutoTraverse();
  }
}

function navigateNext() {
  if (collection.length === 0 || currentIndex >= collection.length - 1) {
    return;
  }
  
  // If auto-traverse is playing, restart the timer after navigation
  const wasPlaying = isPlaying;
  if (wasPlaying) {
    stopAutoTraverse();
  }
  
  currentIndex++;
  navigateToCurrentIndex();
  
  // Restart auto-traverse if it was playing
  if (wasPlaying) {
    startAutoTraverse();
  }
}

function navigateToCurrentIndex() {
  let url = collection[currentIndex];
  
  // Ensure URL has a protocol for proper navigation
  // Chrome's tabs API treats URLs without protocol as relative URLs
  if (!url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
    url = 'https://' + url;
  }
  
  // Send navigation request to background script
  chrome.runtime.sendMessage({
    action: 'navigate',
    url: url,
    index: currentIndex
  });
}

function startAutoTraverse() {
  stopAutoTraverse();
  
  if (currentIndex < collection.length - 1) {
    autoTraverseTimeout = setTimeout(() => {
      currentIndex++;
      navigateToCurrentIndex();
      
      if (isPlaying) {
        startAutoTraverse();
      }
    }, delay);
  } else {
    // Reached the end, stop playing
    isPlaying = false;
    notifyPlayStateChange();
  }
}

function stopAutoTraverse() {
  if (autoTraverseTimeout) {
    clearTimeout(autoTraverseTimeout);
    autoTraverseTimeout = null;
  }
}

function togglePlayPause() {
  if (collection.length === 0) {
    showNotification('No collection loaded');
    return;
  }
  
  isPlaying = !isPlaying;
  
  notifyPlayStateChange();
  
  if (isPlaying) {
    showNotification('Auto-traverse started');
    // If we're not at the end, start the timer for next navigation
    if (currentIndex < collection.length - 1) {
      startAutoTraverse();
    } else {
      showNotification('Already at the end of collection');
      isPlaying = false;
      notifyPlayStateChange();
    }
  } else {
    stopAutoTraverse();
    showNotification('Auto-traverse stopped');
  }
}

function notifyPlayStateChange() {
  chrome.runtime.sendMessage({
    action: 'updatePlayState',
    isPlaying: isPlaying
  });
}

function showNotification(message) {
  // Create a temporary notification element
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1a73e8;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease-out;
  `;
  
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
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transition = 'opacity 0.3s ease-out';
    notification.style.opacity = '0';
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 300);
  }, 2000);
}

// Load state from storage on page load
chrome.storage.local.get(['state'], (result) => {
  if (result.state && result.state.collection) {
    collection = result.state.collection;
    currentIndex = result.state.currentIndex;
    isPlaying = result.state.isPlaying || false;
    delay = result.state.delay * 1000;
    
    // Check if current URL matches current index and should auto-play
    const currentUrl = window.location.href;
    if (collection[currentIndex] && isPlaying) {
      startAutoTraverse();
    }
  }
});
