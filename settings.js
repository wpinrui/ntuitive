(function () {
  "use strict";

  var SETTINGS_KEY = "ntulearn-ext-settings";

  function getSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  window.__ntulearn = {
    isEnabled: function (key, defaultValue) {
      var settings = getSettings();
      if (!settings) return defaultValue;
      return settings.hasOwnProperty(key) ? !!settings[key] : defaultValue;
    },
    getSetting: function (key, defaultValue) {
      var settings = getSettings();
      if (!settings) return defaultValue;
      return settings.hasOwnProperty(key) ? settings[key] : defaultValue;
    }
  };
})();
