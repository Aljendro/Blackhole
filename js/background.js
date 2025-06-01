// Configuration and default values
let config = {
  blackholes: [
    { url: "facebook\\.com" },
    { url: "twitter\\.com" },
    { url: "x\\.com" },
    { url: "reddit\\.com" },
    { url: "youtube\\.com" },
    { url: "instagram\\.com" },
    { url: "netflix\\.com" },
    { url: "tiktok\\.com" },
    { url: "twitch\\.tv" },
  ],
  rate: 0.01, // $0.01 per minute
};

// Track active sites and time
let activeTab = null;
let trackingData = {};
let startTime = null;
let popupOpen = false;

console.debug("[Background] Script loaded and running");

// Initialize the tracker
console.debug("[Background] Initializing tracker module");
initializeTracker()
  .then(() => {
    console.debug("[Background] Tracker module initialized successfully");
    // Initialize archive manager and check for month changes
    initializeArchiveManager();
  })
  .catch((error) => {
    console.error("[Background] Error initializing tracker module:", error);
  });

// Initialize the messaging module
console.debug("[Background] Initializing messaging module");
initializeMessaging();

// Archive manager instance
let archiveManager;

async function initializeArchiveManager() {
  console.debug("[Background] Initializing archive manager");
  archiveManager = new ArchiveManager();

  // Check for month change on startup
  await archiveManager.checkForMonthChange();

  // Set up periodic check for month changes (check every hour)
  browser.alarms.create("monthChangeCheck", { periodInMinutes: 60 });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "monthChangeCheck") {
      console.debug("[Background] Checking for month change");
      await archiveManager.checkForMonthChange();
    }
  });
}

// Update time tracking when tab changes
console.debug("[Background] Setting up tab activation listener");
browser.tabs.onActivated.addListener(async (activeInfo) => {
  console.debug(`[Background] Tab activated: tabId=${activeInfo.tabId}`);
  try {
    const tab = await browser.tabs.get(activeInfo.tabId);
    console.debug(`[Background] Retrieved tab info: url=${tab.url}`);
    handleTabChange(tab);
  } catch (error) {
    console.error("[Background] Error getting tab info:", error);
  }
});

// Update when tab URL changes
console.debug("[Background] Setting up tab update listener");
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.debug(
    `[Background] Tab updated: tabId=${tabId}, changeInfo=`,
    changeInfo,
  );
  if (changeInfo.url) {
    console.debug(`[Background] URL changed to: ${changeInfo.url}`);
    handleTabChange(tab);
  }
});

// Handle window focus changes
console.debug("[Background] Setting up window focus change listener");
browser.windows.onFocusChanged.addListener(async (windowId) => {
  console.debug(`[Background] Window focus changed: windowId=${windowId}`);
  if (windowId === browser.windows.WINDOW_ID_NONE) {
    // Browser lost focus
    console.debug("[Background] Browser lost focus");
    handleTabChange(null);
  } else {
    // Browser gained focus
    console.debug("[Background] Browser gained focus, querying active tab");
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      console.debug(
        `[Background] Found ${tabs.length} active tabs in current window`,
      );
      if (tabs.length > 0) {
        console.debug(`[Background] Active tab: url=${tabs[0].url}`);
        handleTabChange(tabs[0]);
      }
    } catch (error) {
      console.error("[Background] Error querying tabs:", error);
    }
  }
});

// Function to reload configuration
async function reloadConfiguration() {
  console.debug("[Background] Reloading configuration");
  try {
    // Re-initialize the tracker which should load the latest config
    await initializeTracker();
    console.debug("[Background] Configuration reloaded successfully");
  } catch (error) {
    console.error("[Background] Error reloading configuration:", error);
  }
}

// Listen for changes to storage and reload configuration
console.debug("[Background] Setting up storage change listener");
browser.storage.onChanged.addListener((changes, namespace) => {
  console.debug(
    `[Background] Storage changed in namespace "${namespace}":`,
    changes,
  );
  if (namespace === "sync" || namespace === "local") {
    // Check if any configuration keys changed
    const configKeys = ["blackholes", "rate", "config"];
    const hasConfigChanges = Object.keys(changes).some((key) =>
      configKeys.includes(key),
    );

    if (hasConfigChanges) {
      console.debug("[Background] Configuration changes detected, reloading");
      reloadConfiguration();
    }
  }
});

// Add context menu item to reload configuration manually
browser.contextMenus.create({
  id: "reload-config",
  title: "Reload Blackhole Configuration",
  contexts: ["browser_action"], // "browser_action" for Firefox instead of "action"
});

// Listen for context menu clicks
browser.contextMenus.onClicked.addListener((info) => {
  // Removed unused 'tab' parameter
  if (info.menuItemId === "reload-config") {
    console.debug("[Background] Manual configuration reload requested");
    reloadConfiguration();
  }
});

//////////////////////////////////////////////////////////
////////////////// TRACKER FUNCTIONALITY /////////////////
//////////////////////////////////////////////////////////

// Initialize tracker
function initializeTracker() {
  console.debug("[Tracker] Initializing tracker module");
  // Load configuration from storage
  console.debug("[Tracker] Loading configuration from storage");
  return new Promise((resolve) => {
    browser.storage.local.get(["config", "trackingData"], (result) => {
      console.debug("[Tracker] Storage data retrieved:", result);
      if (result.config) {
        config = result.config;
        console.debug("[Tracker] Loaded config:", config);
      } else {
        console.debug("[Tracker] No saved config found, using defaults");
      }
      if (result.trackingData) {
        trackingData = result.trackingData;
        console.debug("[Tracker] Loaded tracking data:", trackingData);
      } else {
        console.debug("[Tracker] No saved tracking data found");
      }
      resolve();
    });
  });
}

// Check if a URL matches any blackhole pattern
function isBlackhole(url) {
  console.debug(`[Tracker] Checking if URL is blackhole: ${url}`);
  if (!url || !config.blackholes) {
    console.debug(
      `[Tracker] URL invalid or no blackholes configured, returning false`,
    );
    return false;
  }

  const result = config.blackholes.some((blackhole) => {
    console.debug(`[Tracker] Testing URL against pattern: ${blackhole.url}`);
    try {
      const regex = new RegExp(blackhole.url);
      const matches = regex.test(url);
      console.debug(`[Tracker] URL match result: ${matches}`);
      return matches;
    } catch (error) {
      console.error(
        `[Tracker] Error in regex pattern ${blackhole.url}:`,
        error,
      );
      return false;
    }
  });

  console.debug(`[Tracker] Final blackhole check result for ${url}: ${result}`);
  return result;
}

// Handle tab changes
function handleTabChange(tab) {
  console.debug(`[Tracker] Tab change detected:`, tab);
  console.debug(`[Tracker] Current active tab before change:`, activeTab);
  console.debug(`[Tracker] Current startTime before change: ${startTime}`);

  stopTracking(); // Stop tracking the previous site

  if (tab && tab.url) {
    console.debug(`[Tracker] Checking new tab URL: ${tab.url}`);
    const isBlackholeResult = isBlackhole(tab.url);
    console.debug(`[Tracker] Is blackhole result: ${isBlackholeResult}`);

    if (isBlackholeResult) {
      console.debug(`[Tracker] Starting to track blackhole site: ${tab.url}`);
      startTracking(tab.url);
      activeTab = tab;
      console.debug(`[Tracker] Active tab set to:`, activeTab);
    } else {
      console.debug(`[Tracker] Tab URL is not a blackhole, not tracking`);
    }
  } else {
    console.debug(`[Tracker] Tab is null or has no URL, not tracking`);
  }
}

// Start tracking a blackhole site
function startTracking(url) {
  console.debug(`[Tracker] startTracking called for URL: ${url}`);
  startTime = Date.now();
  console.debug(`[Tracker] Set startTime to: ${startTime}`);
  console.log(`Started tracking: ${url}`);

  // Turn icon red when tracking a blackhole site
  browser.browserAction
    .setIcon({
      path: {
        16: "../images/icon-red-16.png",
        32: "../images/icon-red-32.png",
        48: "../images/icon-red-48.png",
        128: "../images/icon-red-128.png",
      },
    })
    .catch((error) => {
      console.error("[Tracker] Error setting red icon:", error);
    });
}

// Stop tracking and calculate debt
function stopTracking() {
  console.debug(`[Tracker] stopTracking called`);
  console.debug(`[Tracker] Current activeTab:`, activeTab);
  console.debug(`[Tracker] Current startTime: ${startTime}`);

  if (activeTab && startTime) {
    console.debug(`[Tracker] Active tracking session found, calculating...`);
    const url = activeTab.url;
    console.debug(`[Tracker] URL being tracked: ${url}`);

    try {
      const domain = new URL(url).hostname;
      console.debug(`[Tracker] Extracted domain: ${domain}`);

      const timeSpent = (Date.now() - startTime) / 1000 / 60; // Convert to minutes
      console.debug(`[Tracker] Time spent: ${timeSpent.toFixed(4)} minutes`);
      console.debug(`[Tracker] Current rate: ${config.rate} per minute`);

      if (!trackingData[domain]) {
        console.debug(
          `[Tracker] First time tracking ${domain}, initializing data`,
        );
        trackingData[domain] = { totalTime: 0, debt: 0 };
      } else {
        console.debug(
          `[Tracker] Existing tracking data for ${domain}:`,
          trackingData[domain],
        );
      }

      trackingData[domain].totalTime += timeSpent;
      trackingData[domain].debt += timeSpent * config.rate;
      console.debug(
        `[Tracker] Updated tracking data for ${domain}:`,
        trackingData[domain],
      );

      // Save tracking data
      console.debug(`[Tracker] Saving tracking data to storage`);
      browser.storage.local.set({ trackingData }, () => {
        console.debug(`[Tracker] Tracking data saved successfully`);
      });

      // Notify messaging system of changes
      console.debug(`[Tracker] Sending tracking update`);
      sendTrackingUpdate();

      console.log(
        `Stopped tracking ${domain}: ${timeSpent.toFixed(2)} minutes`,
      );
      startTime = null;
      activeTab = null;

      // Reset icon to default when not tracking a blackhole site
      browser.browserAction
        .setIcon({
          path: {
            16: "../images/icon-16.png",
            32: "../images/icon-32.png",
            48: "../images/icon-48.png",
            128: "../images/icon-128.png",
          },
        })
        .catch((error) => {
          console.error("[Tracker] Error setting default icon:", error);
        });

      console.debug(`[Tracker] Reset startTime and activeTab to null`);
    } catch (error) {
      console.error(`[Tracker] Error in stopTracking:`, error);
    }
  } else {
    console.debug(`[Tracker] No active tracking session to stop`);
  }
}

////////////////////////////////////////////////////////////
////////////////// MESSAGING FUNCTIONALITY /////////////////
////////////////////////////////////////////////////////////

function initializeMessaging() {
  console.debug("[Messaging] Initializing messaging module");

  // Set up message handler
  browser.runtime.onMessage.addListener((message, _, sendResponse) => {
    // Handle active state requests
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

    // Handle popup registration/unregistration
    if (message.type === "registerPopup") {
      popupOpen = true;
      // Send initial data
      sendTrackingUpdate();
    }

    if (message.type === "unregisterPopup") {
      popupOpen = false;
    }
  });
}

// Function to send tracking data to popup
function sendTrackingUpdate() {
  if (popupOpen) {
    browser.runtime.sendMessage({
      type: "trackingUpdate",
      trackingData: trackingData,
    });
  }
}
