// Variables to store configuration
let config = {
  blackholes: [],
  rate: 0.01,
};

// Load configuration on page load
document.addEventListener("DOMContentLoaded", loadConfiguration);

// Function to load the current configuration
async function loadConfiguration() {
  try {
    const result = await browser.storage.local.get("config");
    if (result.config) {
      config = result.config;
    } else {
      // Load default configuration if none exists
      config = {
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
        rate: 0.01,
      };
    }

    // Update UI with loaded configuration
    document.getElementById("rate-input").value = config.rate;
    renderBlackholeList();
  } catch (error) {
    console.error("Failed to load configuration:", error);
  }
}

// Function to render the list of blackhole sites
function renderBlackholeList() {
  const blackholeList = document.getElementById("blackhole-list");
  blackholeList.innerHTML = "";

  config.blackholes.forEach((blackhole, index) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "blackhole-item";

    const input = document.createElement("input");
    input.type = "text";
    input.value = blackhole.url;
    input.dataset.index = index;
    input.addEventListener("change", (e) => {
      config.blackholes[e.target.dataset.index].url = e.target.value;
    });

    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.dataset.index = index;
    removeButton.addEventListener("click", removeSite);

    itemDiv.appendChild(input);
    itemDiv.appendChild(removeButton);
    blackholeList.appendChild(itemDiv);
  });
}

// Function to handle adding a new site
function addSite() {
  config.blackholes.push({ url: "" });
  renderBlackholeList();
}

// Function to handle removing a site
function removeSite(event) {
  const index = event.target.dataset.index;
  config.blackholes.splice(index, 1);
  renderBlackholeList();
}

// Function to save configuration
async function saveConfiguration() {
  try {
    // Update rate value from input
    config.rate = parseFloat(document.getElementById("rate-input").value);

    // Save to storage
    await browser.storage.local.set({ config });

    alert("Configuration saved successfully!");
  } catch (error) {
    console.error("Failed to save configuration:", error);
    alert("Error saving configuration: " + error.message);
  }
}

// Event listeners for buttons
document.getElementById("add-site-btn").addEventListener("click", addSite);
document
  .getElementById("save-btn")
  .addEventListener("click", saveConfiguration);
document
  .getElementById("cancel-btn")
  .addEventListener("click", () => window.close());
document.getElementById("view-archive-btn").addEventListener("click", () => {
  browser.tabs.create({ url: browser.runtime.getURL("archive.html") });
});
