(function () {
  "use strict";

  var SETTINGS_KEY = "ntulearn-ext-settings";
  var COURSES_KEY = "ntulearn-ext-courses";
  var HIDDEN_KEY = "ntulearn-ext-hidden";

  function syncToLocal(raw) {
    var settings = Object.assign({}, DEFAULT_SETTINGS, raw || {});
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (_) {}
  }

  // Sync chrome.storage.local -> localStorage on page load
  chrome.storage.local.get("settings", function (result) {
    syncToLocal(result.settings);
  });

  // Live-sync when settings change (e.g. popup is open while page is loaded)
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local" || !changes.settings) return;
    syncToLocal(changes.settings.newValue);
  });

  // Handle messages from popup (e.g. reset course cache)
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.action === "resetCourseCache") {
      try {
        localStorage.removeItem(COURSES_KEY);
        localStorage.removeItem(HIDDEN_KEY);
      } catch (_) {}
      sendResponse({ ok: true });
    }
  });
})();
