// Background service worker for the extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('SiteListWalker extension installed');
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command) => {
  let action = '';
  
  if (command === 'navigate-previous') {
    action = 'navigatePrevious';
  } else if (command === 'navigate-next') {
    action = 'navigateNext';
  } else if (command === 'toggle-pause') {
    action = 'togglePlayPause';
  }
  
  if (action) {
    // Get the targetTabId from storage to send message to correct tab
    chrome.storage.local.get(['state'], (result) => {
      const targetTabId = result.state?.targetTabId;
      
      if (targetTabId) {
        // Use stored target tab ID
        chrome.tabs.sendMessage(targetTabId, {action: action});
      } else {
        // Fallback to active tab
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {action: action});
          }
        });
      }
    });
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'navigate') {
    // Handle navigation from content script
    // Get the targetTabId from storage to ensure we navigate the correct tab
    chrome.storage.local.get(['state'], (result) => {
      const targetTabId = result.state?.targetTabId;
      const state = result.state || {};
      
      // Update the index in storage BEFORE navigation
      state.currentIndex = request.index;
      chrome.storage.local.set({state: state}, () => {
        if (targetTabId) {
          // Use the stored target tab ID
          chrome.tabs.update(targetTabId, {url: request.url}, () => {
            // Notify popup about index change
            chrome.runtime.sendMessage({
              action: 'updateIndex',
              index: request.index
            });
          });
        } else {
          // Fallback to active tab if no targetTabId is stored
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.update(tabs[0].id, {url: request.url}, () => {
                // Notify popup about index change
                chrome.runtime.sendMessage({
                  action: 'updateIndex',
                  index: request.index
                });
              });
            }
          });
        }
      });
    });
  } else if (request.action === 'updateIndex' || request.action === 'updatePlayState') {
    // These messages are from content script to popup
    // Chrome will handle the routing automatically
  }
  
  return true;
});
