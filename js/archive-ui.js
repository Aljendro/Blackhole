let archiveManager;

document.addEventListener("DOMContentLoaded", async () => {
  archiveManager = new ArchiveManager();
  await loadArchives();

  // Event listeners
  document
    .getElementById("archive-current-btn")
    .addEventListener("click", archiveCurrentMonth);
  document
    .getElementById("back-to-options-btn")
    .addEventListener("click", () => {
      browser.runtime.openOptionsPage();
      window.close();
    });
});

async function loadArchives() {
  try {
    const archives = await archiveManager.getArchives();
    const archiveKeys = Object.keys(archives).sort().reverse(); // Most recent first

    if (archiveKeys.length === 0) {
      document.getElementById("no-archives").style.display = "block";
      updateSummaryStats(archives);
      return;
    }

    document.getElementById("no-archives").style.display = "none";
    const container = document.getElementById("archives-container");
    container.innerHTML = "";
    for (const monthKey of archiveKeys) {
      const archive = archives[monthKey];
      const archiveElement = createArchiveElement(monthKey, archive);
      container.appendChild(archiveElement);
    }

    updateSummaryStats(archives);
  } catch (error) {
    console.error("Error loading archives:", error);
  }
}

function createArchiveElement(monthKey, archive) {
  const archiveDiv = document.createElement("div");
  archiveDiv.className = "archive-item";

  // const monthDate = new Date(monthKey + "-01");
  const monthDate = new Date(archive.archivedAt);
  const monthName = monthDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  const archivedDate = new Date(archive.archivedAt);
  const archivedDateStr = archivedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const totalHours = Math.floor(archive.totals.totalTime / 60);
  const totalMinutes = Math.floor(archive.totals.totalTime % 60);
  const timeString =
    totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`;

  archiveDiv.innerHTML = `
    <div class="archive-header">
      <h3>${monthName}</h3>
      <div class="archive-actions">
        <button class="view-btn" data-month="${monthKey}">View Details</button>
        <button class="delete-btn" data-month="${monthKey}">Delete</button>
      </div>
    </div>
    <div class="archive-summary">
      <div class="archive-stat">
        <span class="label">Total Debt:</span>
        <span class="value">$${archive.totals.totalDebt.toFixed(2)}</span>
      </div>
      <div class="archive-stat">
        <span class="label">Total Time:</span>
        <span class="value">${timeString}</span>
      </div>
      <div class="archive-stat">
        <span class="label">Sites Tracked:</span>
        <span class="value">${archive.totals.siteCount}</span>
      </div>
      <div class="archive-stat">
        <span class="label">Rate:</span>
        <span class="value">$${archive.rate}/min</span>
      </div>
      <div class="archive-stat">
        <span class="label">Archived:</span>
        <span class="value">${archivedDateStr}</span>
      </div>
    </div>
    <div class="archive-details" id="details-${monthKey}" style="display: none;">
      <h4>Site Breakdown</h4>
      <div class="sites-list">
        ${Object.entries(archive.sites)
          .map(([domain, data]) => {
            const hours = Math.floor(data.totalTime / 60);
            const minutes = Math.floor(data.totalTime % 60);
            const siteTimeString =
              hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            return `
            <div class="site-entry">
              <span class="site-name">${domain}</span>
              <span class="site-time">${siteTimeString}</span>
              <span class="site-debt">$${data.debt.toFixed(2)}</span>
            </div>
          `;
          })
          .join("")}
      </div>
    </div>
  `;

  // Add event listeners
  const viewBtn = archiveDiv.querySelector(".view-btn");
  const deleteBtn = archiveDiv.querySelector(".delete-btn");

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
    await archiveManager.deleteArchive(monthKey);
    await loadArchives(); // Refresh the display
  } catch (error) {
    console.error("Error deleting archive:", error);
    alert("Error deleting archive: " + error.message);
  }
}

async function archiveCurrentMonth() {
  if (
    !confirm(
      "This will archive the current month's data and reset tracking. Continue?",
    )
  ) {
    return;
  }

  try {
    const success = await archiveManager.archiveCurrentMonth();
    if (success) {
      alert("Current month archived successfully!");
      await loadArchives(); // Refresh the display
    } else {
      alert("No data to archive for current month.");
    }
  } catch (error) {
    console.error("Error archiving current month:", error);
    alert("Error archiving current month: " + error.message);
  }
}

function updateSummaryStats(archives) {
  const archiveKeys = Object.keys(archives);
  let totalDebt = 0;
  let totalTime = 0;

  for (const key of archiveKeys) {
    totalDebt += archives[key].totals.totalDebt;
    totalTime += archives[key].totals.totalTime;
  }

  const totalHours = Math.floor(totalTime / 60);
  const totalMinutes = Math.floor(totalTime % 60);
  const timeString =
    totalHours > 0 ? `${totalHours}h ${totalMinutes.toFixed(5)}m` : `${totalTime.toFixed(5)}m`;

  document.getElementById("total-months").textContent = archiveKeys.length;
  document.getElementById("total-debt").textContent =
    `$${totalDebt.toFixed(2)}`;
  document.getElementById("total-time").textContent = timeString;
}
