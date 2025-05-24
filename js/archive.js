class ArchiveManager {
  constructor() {
    this.currentMonth = this.getCurrentMonthKey();
  }

  getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  async archiveCurrentMonth() {
    try {
      const result = await browser.storage.local.get([
        "trackingData",
        "config",
      ]);
      const trackingData = result.trackingData || {};
      const config = result.config || { rate: 0.01 };

      if (Object.keys(trackingData).length === 0) {
        console.log("[Archive] No data to archive");
        return false;
      }

      // Calculate totals for this month
      let totalTime = 0;
      let totalDebt = 0;
      for (const domain in trackingData) {
        totalTime += trackingData[domain].totalTime;
        totalDebt += trackingData[domain].debt;
      }

      const archiveData = {
        month: this.currentMonth,
        archivedAt: Date.now(),
        rate: config.rate,
        sites: { ...trackingData },
        totals: {
          totalTime: totalTime,
          totalDebt: totalDebt,
          siteCount: Object.keys(trackingData).length,
        },
      };

      // Get existing archives
      const archiveResult = await browser.storage.local.get("archives");
      const archives = archiveResult.archives || {};
      archives[this.currentMonth] = archiveData;

      // Save archive and clear current data
      await browser.storage.local.set({
        archives: archives,
        trackingData: {},
      });

      console.log(`[Archive] Successfully archived month ${this.currentMonth}`);
      return true;
    } catch (error) {
      console.error("[Archive] Error archiving month:", error);
      return false;
    }
  }

  async getArchives() {
    try {
      const result = await browser.storage.local.get("archives");
      return result.archives || {};
    } catch (error) {
      console.error("[Archive] Error getting archives:", error);
      return {};
    }
  }

  async getArchive(monthKey) {
    try {
      const archives = await this.getArchives();
      return archives[monthKey] || null;
    } catch (error) {
      console.error("[Archive] Error getting archive:", error);
      return null;
    }
  }

  async deleteArchive(monthKey) {
    try {
      const archives = await this.getArchives();
      delete archives[monthKey];
      await browser.storage.local.set({ archives: archives });
      return true;
    } catch (error) {
      console.error("[Archive] Error deleting archive:", error);
      return false;
    }
  }

  async checkForMonthChange() {
    const currentMonth = this.getCurrentMonthKey();
    if (currentMonth !== this.currentMonth) {
      console.log(
        `[Archive] Month changed from ${this.currentMonth} to ${currentMonth}`,
      );

      // Auto-archive previous month if there's data
      const result = await browser.storage.local.get("trackingData");
      const trackingData = result.trackingData || {};

      if (Object.keys(trackingData).length > 0) {
        console.log("[Archive] Auto-archiving previous month data");
        await this.archiveCurrentMonth();
      }

      this.currentMonth = currentMonth;
      return true;
    }
    return false;
  }
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = ArchiveManager;
} else {
  window.ArchiveManager = ArchiveManager;
}
