class TrackingUtils {
  static getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  static async getTrackingData() {
    try {
      const result = await browser.storage.local.get("trackingData");
      return result.trackingData || {};
    } catch (error) {
      console.error("Error getting tracking data:", error);
      return {};
    }
  }

  static async saveTrackingData(trackingData) {
    try {
      await browser.storage.local.set({ trackingData });
      return true;
    } catch (error) {
      console.error("Error saving tracking data:", error);
      return false;
    }
  }

  static async getCurrentMonthData() {
    const trackingData = await this.getTrackingData();
    const currentMonth = this.getCurrentMonthKey();
    return trackingData[currentMonth] || {};
  }

  static async addTimeToCurrentMonth(domain, timeSpent, rate) {
    const trackingData = await this.getTrackingData();
    const currentMonth = this.getCurrentMonthKey();

    if (!trackingData[currentMonth]) {
      trackingData[currentMonth] = {};
    }

    if (!trackingData[currentMonth][domain]) {
      trackingData[currentMonth][domain] = { totalTime: 0, debt: 0 };
    }

    trackingData[currentMonth][domain].totalTime += timeSpent;
    trackingData[currentMonth][domain].debt += timeSpent * rate;

    await this.saveTrackingData(trackingData);
    return trackingData[currentMonth][domain];
  }

  static getArchivedMonths(trackingData) {
    const currentMonth = this.getCurrentMonthKey();
    return Object.keys(trackingData).filter((month) => month !== currentMonth);
  }

  static calculateMonthTotals(monthData) {
    let totalTime = 0;
    let totalDebt = 0;
    let siteCount = 0;

    for (const domain in monthData) {
      totalTime += monthData[domain].totalTime;
      totalDebt += monthData[domain].debt;
      siteCount++;
    }

    return { totalTime, totalDebt, siteCount };
  }

  static async deleteArchivedMonth(monthKey) {
    try {
      const trackingData = await this.getTrackingData();
      delete trackingData[monthKey];
      await this.saveTrackingData(trackingData);
      return true;
    } catch (error) {
      console.error("Error deleting archived month:", error);
      return false;
    }
  }
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = TrackingUtils;
} else {
  window.TrackingUtils = TrackingUtils;
}
