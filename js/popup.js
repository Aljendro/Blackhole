// Variables to store config and update interval
let config = { rate: 0.01 };
let updateInterval;

// Function to update the UI with the latest data
async function updateUI() {
  const currentMonthData = await TrackingUtils.getCurrentMonthData();

  // Calculate total debt for current month
  let totalDebt = 0;
  for (const domain in currentMonthData) {
    totalDebt += currentMonthData[domain].debt;
  }

  // Update UI
  document.getElementById("total-debt").textContent = `$${totalDebt.toFixed(
    5,
  )}`;

  // Show current month info
  const currentMonth = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
  document.getElementById("current-month").textContent = currentMonth;

  // Display site list
  const sitesList = document.getElementById("sites-list");
  sitesList.innerHTML = "";

  // Sort domains by debt (highest first)
  const sortedDomains = Object.keys(currentMonthData).sort(
    (a, b) => currentMonthData[b].debt - currentMonthData[a].debt,
  );

  for (const domain of sortedDomains) {
    const siteData = currentMonthData[domain];
    const siteElement = document.createElement("div");
    siteElement.className = "site-entry";

    const hours = Math.floor(siteData.totalTime / 60);
    const minutes = Math.floor(siteData.totalTime % 60);
    const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    // Create and append elements safely using textContent
    const nameDiv = document.createElement("div");
    nameDiv.className = "site-name";
    nameDiv.textContent = domain;

    const timeDiv = document.createElement("div");
    timeDiv.className = "site-time";
    timeDiv.textContent = timeString;

    const debtDiv = document.createElement("div");
    debtDiv.className = "site-debt";
    debtDiv.textContent = `$${siteData.debt.toFixed(2)}`;

    siteElement.appendChild(nameDiv);
    siteElement.appendChild(timeDiv);
    siteElement.appendChild(debtDiv);

    sitesList.appendChild(siteElement);
  }
}

// Function to load the initial data
async function loadData() {
  const result = await browser.storage.local.get("config");
  config = result.config || { rate: 0.01 };

  // Check if active tracking is happening and update UI with latest data
  await requestActiveStateUpdate();

  await updateUI();
}

async function requestActiveStateUpdate() {
  try {
    const activeState = await browser.runtime.sendMessage({
      type: "getActiveState",
    });

    if (activeState && activeState.isActive) {
      // Update the active site's data with current session
      const domain = activeState.domain;
      const currentSessionTime =
        (Date.now() - activeState.startTime) / 1000 / 60;

      // We don't need to manually update tracking data here since
      // TrackingUtils.getCurrentMonthData() will fetch the latest data
      // The active session time will be added when stopTracking() is called
    }
  } catch (error) {
    console.error("Failed to get active state:", error);
  }
}

// Initial setup when popup is opened
document.addEventListener("DOMContentLoaded", async () => {
  // Load data immediately
  await loadData();

  // Set up message listener for data updates from background script
  browser.runtime.onMessage.addListener(async (message) => {
    if (message.type === "trackingUpdate") {
      // Refresh the UI when tracking data is updated
      await updateUI();
    }
  });

  // Request regular updates from the background script
  browser.runtime.sendMessage({ type: "registerPopup" });

  // Configure button
  document.getElementById("configure-btn").addEventListener("click", () => {
    browser.runtime.openOptionsPage();
  });
});

// Clean up when popup is closed
window.addEventListener("unload", () => {
  // Notify background script that popup is closing
  browser.runtime.sendMessage({ type: "unregisterPopup" });
});
