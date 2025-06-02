let archiveManager;

document.addEventListener("DOMContentLoaded", async () => {
  await loadArchives();

  document
    .getElementById("back-to-options-btn")
    .addEventListener("click", () => {
      browser.runtime.openOptionsPage();
      window.close();
    });
});

async function loadArchives() {
  try {
    const trackingData = await TrackingUtils.getTrackingData();
    const archivedMonths = TrackingUtils.getArchivedMonths(trackingData);
    const sortedMonths = archivedMonths.sort().reverse(); // Most recent first

    if (sortedMonths.length === 0) {
      const container = document.getElementById("archives-container");
      container.innerHTML = "";
      const noArchivesElement = document.createElement("p");
      noArchivesElement.id = "no-archives";
      noArchivesElement.innerText =
        "No archives found. Data will be automatically archived at the end of each month.";
      container.appendChild(noArchivesElement);
      updateSummaryStats({});
      return;
    }

    const container = document.getElementById("archives-container");
    container.innerHTML = "";

    for (const monthKey of sortedMonths) {
      const monthData = trackingData[monthKey];
      const archiveElement = createArchiveElement(monthKey, monthData);
      container.appendChild(archiveElement);
    }

    updateSummaryStats(trackingData);
  } catch (error) {
    console.error("Error loading archives:", error);
  }
}

function createArchiveElement(monthKey, monthData) {
  const archiveDiv = document.createElement("div");
  archiveDiv.className = "archive-item";

  const [year, month] = monthKey.split("-");
  const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const monthName = monthDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  const totals = TrackingUtils.calculateMonthTotals(monthData);
  const totalHours = Math.floor(totals.totalTime / 60);
  const totalMinutes = Math.floor(totals.totalTime % 60);
  const timeString =
    totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`;

  // Create archive header
  const archiveHeader = document.createElement("div");
  archiveHeader.className = "archive-header";

  const headerTitle = document.createElement("h3");
  headerTitle.textContent = monthName;

  const archiveActions = document.createElement("div");
  archiveActions.className = "archive-actions";

  const viewBtn = document.createElement("button");
  viewBtn.className = "view-btn";
  viewBtn.dataset.month = monthKey;
  viewBtn.textContent = "View Details";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.dataset.month = monthKey;
  deleteBtn.textContent = "Delete";

  archiveActions.appendChild(viewBtn);
  archiveActions.appendChild(deleteBtn);
  archiveHeader.appendChild(headerTitle);
  archiveHeader.appendChild(archiveActions);

  // Create archive summary
  const archiveSummary = document.createElement("div");
  archiveSummary.className = "archive-summary";

  // Helper function to create stat divs
  function createStatDiv(label, value) {
    const statDiv = document.createElement("div");
    statDiv.className = "archive-stat";

    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = label;

    const valueSpan = document.createElement("span");
    valueSpan.className = "value";
    valueSpan.textContent = value;

    statDiv.appendChild(labelSpan);
    statDiv.appendChild(valueSpan);
    return statDiv;
  }

  // Get current rate from config (we'll need to load this)
  const defaultRate = 0.01; // fallback rate

  archiveSummary.appendChild(
    createStatDiv("Total Debt:", `$${totals.totalDebt.toFixed(2)}`),
  );
  archiveSummary.appendChild(createStatDiv("Total Time:", timeString));
  archiveSummary.appendChild(createStatDiv("Sites Tracked:", totals.siteCount));
  archiveSummary.appendChild(createStatDiv("Rate:", `$${defaultRate}/min`));

  // Create archive details
  const archiveDetails = document.createElement("div");
  archiveDetails.className = "archive-details";
  archiveDetails.id = `details-${monthKey}`;
  archiveDetails.style.display = "none";

  const detailsTitle = document.createElement("h4");
  detailsTitle.textContent = "Site Breakdown";

  const sitesList = document.createElement("div");
  sitesList.className = "sites-list";

  Object.entries(monthData).forEach(([domain, data]) => {
    const hours = Math.floor(data.totalTime / 60);
    const minutes = Math.floor(data.totalTime % 60);
    const siteTimeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const siteEntry = document.createElement("div");
    siteEntry.className = "site-entry";

    const siteName = document.createElement("span");
    siteName.className = "site-name";
    siteName.textContent = domain;

    const siteTime = document.createElement("span");
    siteTime.className = "site-time";
    siteTime.textContent = siteTimeString;

    const siteDebt = document.createElement("span");
    siteDebt.className = "site-debt";
    siteDebt.textContent = `$${data.debt.toFixed(2)}`;

    siteEntry.appendChild(siteName);
    siteEntry.appendChild(siteTime);
    siteEntry.appendChild(siteDebt);
    sitesList.appendChild(siteEntry);
  });

  archiveDetails.appendChild(detailsTitle);
  archiveDetails.appendChild(sitesList);

  // Assemble the complete archive div
  archiveDiv.appendChild(archiveHeader);
  archiveDiv.appendChild(archiveSummary);
  archiveDiv.appendChild(archiveDetails);

  viewBtn.addEventListener("click", () => toggleArchiveDetails(monthKey));
  deleteBtn.addEventListener("click", () => deleteArchive(monthKey));

  return archiveDiv;
}

function toggleArchiveDetails(monthKey) {
  const detailsDiv = document.getElementById(`details-${monthKey}`);
  const viewBtn = document.querySelector(`[data-month="${monthKey}"].view-btn`);

  if (detailsDiv.style.display === "none") {
    detailsDiv.style.display = "block";
    viewBtn.textContent = "Hide Details";
  } else {
    detailsDiv.style.display = "none";
    viewBtn.textContent = "View Details";
  }
}

async function deleteArchive(monthKey) {
  if (
    !confirm(
      `Are you sure you want to delete the archive for ${monthKey}? This action cannot be undone.`,
    )
  ) {
    return;
  }

  try {
    await TrackingUtils.deleteArchivedMonth(monthKey);
    await loadArchives(); // Refresh the display
  } catch (error) {
    console.error("Error deleting archive:", error);
    alert("Error deleting archive: " + error.message);
  }
}

function updateSummaryStats(trackingData) {
  const archivedMonths = TrackingUtils.getArchivedMonths(trackingData);
  let totalDebt = 0;
  let totalTime = 0;

  for (const monthKey of archivedMonths) {
    const monthData = trackingData[monthKey];
    const totals = TrackingUtils.calculateMonthTotals(monthData);
    totalDebt += totals.totalDebt;
    totalTime += totals.totalTime;
  }

  const totalHours = Math.floor(totalTime / 60);
  const totalMinutes = Math.floor(totalTime % 60);
  const timeString =
    totalHours > 0
      ? `${totalHours}h ${totalMinutes.toFixed(5)}m`
      : `${totalTime.toFixed(5)}m`;

  document.getElementById("total-months").textContent = archivedMonths.length;
  document.getElementById("total-debt").textContent = `$${totalDebt.toFixed(
    2,
  )}`;
  document.getElementById("total-time").textContent = timeString;
}
