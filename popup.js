(function () {
  "use strict";

  var TOGGLE_IDS = [
    "backButtonFix", "courseSwitcher", "courseLinks",
    "autoExpandFolders", "pdfViewer", "darkTheme"
  ];

  var expandDepthSelect = document.getElementById("expandDepth");
  var expandDepthExtra = document.getElementById("expandDepthExtra");
  var courseSwitcherExtra = document.getElementById("courseSwitcherExtra");
  var resetCacheBtn = document.getElementById("resetCacheBtn");

  function updateSubSettings(settings) {
    expandDepthExtra.style.display = settings.autoExpandFolders ? "" : "none";
    courseSwitcherExtra.style.display = settings.courseSwitcher ? "" : "none";
  }

  // Load current settings into UI
  chrome.storage.local.get("settings", function (result) {
    var settings = Object.assign({}, DEFAULT_SETTINGS, result.settings || {});
    TOGGLE_IDS.forEach(function (id) {
      document.getElementById(id).checked = !!settings[id];
    });
    expandDepthSelect.value = String(settings.expandDepth);
    updateSubSettings(settings);
  });

  // Save on any change
  function saveSettings() {
    var settings = {};
    TOGGLE_IDS.forEach(function (id) {
      settings[id] = document.getElementById(id).checked;
    });
    settings.expandDepth = parseInt(expandDepthSelect.value, 10);
    chrome.storage.local.set({ settings: settings });
    updateSubSettings(settings);
  }

  TOGGLE_IDS.forEach(function (id) {
    document.getElementById(id).addEventListener("change", saveSettings);
  });
  expandDepthSelect.addEventListener("change", saveSettings);

  // Reset course cache via message to bridge.js
  resetCacheBtn.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0] || !tabs[0].id) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: "resetCourseCache" }, function () {
        var failed = !!chrome.runtime.lastError;
        resetCacheBtn.textContent = failed ? "Open NTULearn first" : "Cache cleared!";
        setTimeout(function () {
          resetCacheBtn.textContent = "Reset course cache";
        }, 2000);
      });
    });
  });
})();
