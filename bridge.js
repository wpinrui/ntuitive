(function () {
  "use strict";

  var STORAGE_KEY = "ntulearn-ext-settings";

  // Sync chrome.storage.local -> localStorage on page load
  chrome.storage.local.get("settings", function (result) {
    var settings = Object.assign({}, DEFAULT_SETTINGS, result.settings || {});
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (_) {}
  });

  // Live-sync when settings change (e.g. popup is open while page is loaded)
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local" || !changes.settings) return;
    var settings = Object.assign({}, DEFAULT_SETTINGS, changes.settings.newValue || {});
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (_) {}
  });

  // Handle messages from popup (e.g. reset course cache)
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.action === "resetCourseCache") {
      try {
        localStorage.removeItem("ntulearn-ext-courses");
        localStorage.removeItem("ntulearn-ext-hidden");
      } catch (_) {}
      sendResponse({ ok: true });
    }
  });
})();
