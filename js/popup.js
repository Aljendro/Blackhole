// Variables to store data and update interval
let trackingData = {};
let config = { rate: 0.01 };
let updateInterval;

// Function to update the UI with the latest data
function updateUI() {
  // Calculate total debt
  let totalDebt = 0;
  for (const domain in trackingData) {
    totalDebt += trackingData[domain].debt;
  }

  // Update UI
  document.getElementById("total-debt").textContent =
    `$${totalDebt.toFixed(2)}`;

  // Display site list
  const sitesList = document.getElementById("sites-list");
  sitesList.innerHTML = "";

  // Sort domains by debt (highest first)
  const sortedDomains = Object.keys(trackingData).sort(
    (a, b) => trackingData[b].debt - trackingData[a].debt,
  );

  for (const domain of sortedDomains) {
    const siteData = trackingData[domain];
    const siteElement = document.createElement("div");
    siteElement.className = "site-entry";

    const hours = Math.floor(siteData.totalTime / 60);
    const minutes = Math.floor(siteData.totalTime % 60);
    const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    siteElement.innerHTML = `
      <div class="site-name">${domain}</div>
      <div class="site-time">${timeString}</div>
      <div class="site-debt">$${siteData.debt.toFixed(2)}</div>
    `;

    sitesList.appendChild(siteElement);
  }
}

// Function to load the latest data
async function loadData() {
  const result = await chrome.storage.local.get(["trackingData", "config"]);
  trackingData = result.trackingData || {};
  config = result.config || { rate: 0.01 };

  // Check if active tracking is happening and update in real-time
  const activeState = await chrome.runtime.sendMessage({
    type: "getActiveState",
  });
  if (activeState && activeState.isActive) {
    // Update the active site's data with current session
    const domain = activeState.domain;
    if (domain && trackingData[domain]) {
      const currentSessionTime =
        (Date.now() - activeState.startTime) / 1000 / 60;
      const tempData = { ...trackingData };
      tempData[domain] = {
        totalTime: trackingData[domain].totalTime + currentSessionTime,
        debt: trackingData[domain].debt + currentSessionTime * config.rate,
      };
      trackingData = tempData;
    }
  }

  updateUI();
}

// Initial setup when popup is opened
document.addEventListener("DOMContentLoaded", async () => {
  // Load data immediately
  await loadData();

  // Set up regular updates while popup is open
  updateInterval = setInterval(loadData, 1000); // Update every second

  // Configure button
  document.getElementById("configure-btn").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});

// Clean up when popup is closed
window.addEventListener("unload", () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});
