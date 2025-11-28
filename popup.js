// DOM Elements
const popOutBtn = document.getElementById('popOutBtn');
const useSlotCheckbox = document.getElementById('useSlot');
const baseUrlContainer = document.getElementById('baseUrlContainer');
const baseUrlInput = document.getElementById('baseUrl');
const itemListTextarea = document.getElementById('itemList');
const generateBtn = document.getElementById('generateBtn');
const collectionInfo = document.getElementById('collectionInfo');
const collectionCount = document.getElementById('collectionCount');
const currentIndex = document.getElementById('currentIndex');
const delaySlider = document.getElementById('delaySlider');
const delayValue = document.getElementById('delayValue');
const prevBtn = document.getElementById('prevBtn');
const playPauseBtn = document.getElementById('playPauseBtn');
const nextBtn = document.getElementById('nextBtn');
const statusDiv = document.getElementById('status');
const currentUrlDisplay = document.getElementById('currentUrl');
const urlList = document.getElementById('urlList');
const skipStartBtn = document.getElementById('skipStartBtn');
const skipEndBtn = document.getElementById('skipEndBtn');
const setTabLink = document.getElementById('setTabLink');
const themeToggleBtn = document.getElementById('themeToggleBtn');

// State
let state = {
  useSlot: false,
  baseUrl: '',
  itemList: '',
  collection: [],
  originalItems: [], // Store original items for carousel display
  currentIndex: 0,
  isPlaying: false,
  delay: 5,
  targetTabId: null, // Store the tab we should navigate
  darkMode: false
};

// Validation function for Generate button
function validateGenerateButton() {
  const hasItems = state.itemList.trim().length > 0;
  const slotValid = !state.useSlot || (state.baseUrl.trim().length > 0 && state.baseUrl.includes('{slot}'));
  const isValid = hasItems && slotValid;
  
  generateBtn.disabled = !isValid;
}

// Theme toggle functions
function applyTheme() {
  if (state.darkMode) {
    document.body.classList.add('dark-mode');
    document.documentElement.classList.add('dark-mode');
    themeToggleBtn.textContent = '☀️';
    themeToggleBtn.title = 'Switch to light mode';
  } else {
    document.body.classList.remove('dark-mode');
    document.documentElement.classList.remove('dark-mode');
    themeToggleBtn.textContent = '🌙';
    themeToggleBtn.title = 'Switch to dark mode';
  }
}

themeToggleBtn.addEventListener('click', () => {
  state.darkMode = !state.darkMode;
  applyTheme();
  saveState();
});

// Initialize
loadState();

// Check if we're in a popup window and hide the pop-out button
// If not in a popup window, get the current active tab
chrome.windows.getCurrent((win) => {
  if (win.type === 'popup') {
    popOutBtn.style.display = 'none';
  } else {
    // Get the current active tab for normal popup
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        state.targetTabId = tabs[0].id;
        saveState();
      }
    });
  }
});

// Tab switching
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.getAttribute('data-tab');
    switchTab(tabName);
  });
});

// Skip button handlers
skipStartBtn.addEventListener('click', () => {
  if (state.collection.length > 0) {
    navigateToIndex(0);
  }
});

skipEndBtn.addEventListener('click', () => {
  if (state.collection.length > 0) {
    navigateToIndex(state.collection.length - 1);
  }
});

// Set Tab link handler
setTabLink.addEventListener('click', (e) => {
  e.preventDefault();
  switchTab('urls');
  generateBtn.click();
});

function switchTab(tabName) {
  // Update tab buttons
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update tab contents
  tabContents.forEach(content => {
    if (content.id === tabName + 'Tab') {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
}

// Event Listeners
popOutBtn.addEventListener('click', () => {
  // Get the current active tab to store its ID
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      // Store the tab ID so the popped-out window knows which tab to navigate
      state.targetTabId = tabs[0].id;
      saveState();
      
      // Get current window dimensions - smaller height for tabbed interface
      const width = 480;
      const height = 350;
      
      // Create a new window with the popup
      chrome.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: width,
        height: height
      }, () => {
        // Close the original popup after opening the new window
        window.close();
      });
    }
  });
});

useSlotCheckbox.addEventListener('change', (e) => {
  state.useSlot = e.target.checked;
  baseUrlContainer.classList.toggle('hidden', !e.target.checked);
  saveState();
  validateGenerateButton();
});

baseUrlInput.addEventListener('input', (e) => {
  state.baseUrl = e.target.value;
  saveState();
  validateGenerateButton();
});

itemListTextarea.addEventListener('input', (e) => {
  state.itemList = e.target.value;
  saveState();
  validateGenerateButton();
});

delaySlider.addEventListener('input', (e) => {
  state.delay = parseInt(e.target.value);
  delayValue.textContent = state.delay;
  saveState();
  
  // Update the delay in content script if playing
  if (state.isPlaying) {
    const tabId = state.targetTabId;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: 'updateDelay',
        delay: state.delay * 1000
      });
    } else {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateDelay',
            delay: state.delay * 1000
          });
        }
      });
    }
  }
});


generateBtn.addEventListener('click', generateCollection);

prevBtn.addEventListener('click', () => {
  const tabId = state.targetTabId;
  if (tabId) {
    chrome.tabs.sendMessage(tabId, {action: 'navigatePrevious'});
  } else {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'navigatePrevious'});
      }
    });
  }
});

playPauseBtn.addEventListener('click', () => {
  state.isPlaying = !state.isPlaying;
  updatePlayPauseButton();
  saveState();
  
  const tabId = state.targetTabId;
  if (tabId) {
    chrome.tabs.sendMessage(tabId, {
      action: 'setAutoTraverse',
      enabled: state.isPlaying,
      delay: state.delay * 1000
    });
  } else {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'setAutoTraverse',
          enabled: state.isPlaying,
          delay: state.delay * 1000
        });
      }
    });
  }
});

nextBtn.addEventListener('click', () => {
  const tabId = state.targetTabId;
  if (tabId) {
    chrome.tabs.sendMessage(tabId, {action: 'navigateNext'});
  } else {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'navigateNext'});
      }
    });
  }
});

// Functions
function generateCollection() {
  const items = state.itemList.split('\n')
    .map(item => item.trim())
    .filter(item => item.length > 0);
  
  if (items.length === 0) {
    showStatus('Please enter at least one item', 'error');
    return;
  }
  
  if (state.useSlot) {
    if (!state.baseUrl || !state.baseUrl.includes('{slot}')) {
      showStatus('Base URL must contain {slot} placeholder', 'error');
      return;
    }
    
    state.originalItems = items; // Store original items for carousel
    state.collection = items.map(item => state.baseUrl.replace('{slot}', item));
  } else {
    state.originalItems = []; // No carousel for direct URLs
    // Ensure each URL has a protocol (https://)
    state.collection = items.map(item => {
      if (!item.startsWith('http://') && !item.startsWith('https://')) {
        return 'https://' + item;
      }
      return item;
    });
  }
  
  state.currentIndex = 0;
  saveState();
  
  collectionCount.textContent = state.collection.length;
  currentIndex.textContent = state.currentIndex + 1;
  
  // Update the URL list
  updateUrlList();
  
  showStatus(`Collection generated with ${state.collection.length} items`, 'success');
  
  // Switch to Navigation tab
  switchTab('navigation');
  
  // Navigate to first item
  if (state.collection.length > 0) {
    navigateToIndex(0);
  }
}

function navigateToIndex(index) {
  if (index < 0 || index >= state.collection.length) {
    return;
  }
  
  state.currentIndex = index;
  currentIndex.textContent = state.currentIndex + 1;
  saveState();
  
  const url = state.collection[index];
  
  // Update the current URL display
  currentUrlDisplay.textContent = url;
  
  // Update URL list highlighting and scroll
  updateUrlListHighlight();
  
  // Use the stored target tab ID if available (for popped-out windows)
  // Otherwise use the active tab (for normal popup)
  if (state.targetTabId) {
    chrome.tabs.update(state.targetTabId, {url: url}, () => {
      // Send collection info to content script
      setTimeout(() => {
        chrome.tabs.sendMessage(state.targetTabId, {
          action: 'updateCollection',
          collection: state.collection,
          currentIndex: state.currentIndex,
          delay: state.delay * 1000
        });
      }, 500);
    });
  } else {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        // Store this tab ID for future use
        state.targetTabId = tabs[0].id;
        saveState();
        
        chrome.tabs.update(tabs[0].id, {url: url}, () => {
          // Send collection info to content script
          setTimeout(() => {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'updateCollection',
              collection: state.collection,
              currentIndex: state.currentIndex,
              delay: state.delay * 1000
            });
          }, 500);
        });
      }
    });
  }
}

function saveState() {
  chrome.storage.local.set({state: state});
}

function loadState() {
  chrome.storage.local.get(['state'], (result) => {
    if (result.state) {
      state = result.state;
      
      // Update UI
      useSlotCheckbox.checked = state.useSlot;
      baseUrlContainer.classList.toggle('hidden', !state.useSlot);
      baseUrlInput.value = state.baseUrl || '';
      itemListTextarea.value = state.itemList || '';
      delaySlider.value = state.delay;
      delayValue.textContent = state.delay;
      updatePlayPauseButton();
      validateGenerateButton();
      applyTheme();
      
      if (state.collection && state.collection.length > 0) {
        collectionCount.textContent = state.collection.length;
        currentIndex.textContent = state.currentIndex + 1;
        
        // Update current URL display
        if (state.collection[state.currentIndex]) {
          currentUrlDisplay.textContent = state.collection[state.currentIndex];
        }
        
        // Update the URL list
        updateUrlList();
        
        // Switch to Navigation tab if collection exists
        switchTab('navigation');
        
        // Notify content script about the collection
        const tabId = state.targetTabId;
        if (tabId) {
          chrome.tabs.sendMessage(tabId, {
            action: 'updateCollection',
            collection: state.collection,
            currentIndex: state.currentIndex,
            delay: state.delay * 1000
          });
        } else {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateCollection',
                collection: state.collection,
                currentIndex: state.currentIndex,
                delay: state.delay * 1000
              });
            }
          });
        }
      }
    } else {
      // No saved state, validate with defaults
      validateGenerateButton();
    }
  });
}

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

function updatePlayPauseButton() {
  if (state.isPlaying) {
    playPauseBtn.textContent = '⏸';
    playPauseBtn.classList.add('playing');
  } else {
    playPauseBtn.textContent = '▶';
    playPauseBtn.classList.remove('playing');
  }
}

function updateUrlList() {
  urlList.innerHTML = '';
  
  // Determine what to display: originalItems (slot names) or collection (URLs)
  const displayItems = state.originalItems && state.originalItems.length > 0 
    ? state.originalItems 
    : state.collection;
  
  displayItems.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'url-list-item' + (index === state.currentIndex ? ' active' : '');
    div.textContent = item;
    div.title = state.collection[index] || item;
    div.addEventListener('click', () => {
      navigateToIndex(index);
    });
    urlList.appendChild(div);
  });
  
  // Scroll to current item
  scrollToCurrentItem();
}

function updateUrlListHighlight() {
  const items = urlList.querySelectorAll('.url-list-item');
  items.forEach((item, index) => {
    if (index === state.currentIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  scrollToCurrentItem();
}

function scrollToCurrentItem() {
  const activeItem = urlList.querySelector('.url-list-item.active');
  if (activeItem) {
    activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Listen for navigation messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateIndex') {
    state.currentIndex = request.index;
    currentIndex.textContent = state.currentIndex + 1;
    
    // Update current URL display
    if (state.collection[state.currentIndex]) {
      currentUrlDisplay.textContent = state.collection[state.currentIndex];
    }
    
    // Update URL list highlighting
    updateUrlListHighlight();
    
    saveState();
  } else if (request.action === 'updatePlayState') {
    state.isPlaying = request.isPlaying;
    updatePlayPauseButton();
    saveState();
  }
});
