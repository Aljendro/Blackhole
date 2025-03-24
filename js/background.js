// Configuration and default values
let config = {
  blackholes: [],
  rate: 0.01, // Default rate in currency per minute
};

// Track active sites and time
let activeTab = null;
let trackingData = {};
let startTime = null;

// Load configuration from storage
chrome.storage.local.get(["config", "trackingData"], (result) => {
  if (result.config) config = result.config;
  if (result.trackingData) trackingData = result.trackingData;
});

// Check if a URL matches any blackhole pattern
function isBlackhole(url) {
  if (!url || !config.blackholes) return false;

  return config.blackholes.some((blackhole) => {
    const regex = new RegExp(blackhole.url);
    return regex.test(url);
  });
}

// Update time tracking when tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    handleTabChange(tab);
  } catch (error) {
    console.error("Error getting tab info:", error);
  }
});

// Update when tab URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    handleTabChange(tab);
  }
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus
    stopTracking();
  } else {
    // Browser gained focus
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs.length > 0) {
        handleTabChange(tabs[0]);
      }
    } catch (error) {
      console.error("Error querying tabs:", error);
    }
  }
});

function handleTabChange(tab) {
  stopTracking(); // Stop tracking the previous site

  if (isBlackhole(tab.url)) {
    startTracking(tab.url);
    activeTab = tab;
  }
}

function startTracking(url) {
  startTime = Date.now();
  console.log(`Started tracking: ${url}`);
}

function stopTracking() {
  if (activeTab && startTime) {
    const url = activeTab.url;
    const domain = new URL(url).hostname;
    const timeSpent = (Date.now() - startTime) / 1000 / 60; // Convert to minutes

    if (!trackingData[domain]) {
      trackingData[domain] = { totalTime: 0, debt: 0 };
    }

    trackingData[domain].totalTime += timeSpent;
    trackingData[domain].debt += timeSpent * config.rate;

    // Save tracking data
    chrome.storage.local.set({ trackingData });

    console.log(`Stopped tracking ${domain}: ${timeSpent.toFixed(2)} minutes`);
    startTime = null;
    activeTab = null;
  }
}

// Message handler to respond to popup requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getActiveState") {
    if (activeTab && startTime) {
      sendResponse({
        isActive: true,
        domain: new URL(activeTab.url).hostname,
        startTime: startTime,
      });
    } else {
      sendResponse({ isActive: false });
    }
    return true; // Indicates async response
  }
});
