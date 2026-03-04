(function () {
  "use strict";

  if (!window.__ntulearn.isEnabled("surfaceDownload", true)) return;

  // === Constants ===
  var OVERFLOW_BTN_SELECTOR =
    'button[id^="content-item-overflow-menu-button-"]';
  var DOWNLOAD_ANALYTICS_ID =
    "components.directives.content-item-base.overflowMenu.global.download.link";
  var OUTLINE_RE = /\/ultra\/courses\/[^/]+\/outline/;
  var MENU_WAIT_TIMEOUT = 2000;
  var SCAN_DELAY = 300;

  var DOWNLOAD_SVG =
    '<svg viewBox="0 0 16 16" width="16" height="16" focusable="false" ' +
    'aria-hidden="true" role="presentation">' +
    '<g fill="currentColor" stroke="transparent">' +
    '<path d="M8 0c.5523 0 1 .4477 1 1v8.5858l.2929-.293c.3905-.3904 ' +
    '1.0237-.3904 1.4142 0 .3905.3906.3905 1.0238 0 1.4143l-2 ' +
    '2c-.3905.3905-1.0237.3905-1.4142 0l-2-2c-.3905-.3905-.3905-1.0237 ' +
    '0-1.4142.3905-.3905 1.0237-.3905 1.4142 0L7 9.5858V1c0-.5523.4477-1 ' +
    '1-1z"></path>' +
    '<path d="M0 4c0-.5523.4477-1 1-1h3c.5523 0 1 .4477 1 1s-.4477 ' +
    '1-1 1H2v9h12V5h-2c-.5523 0-1-.4477-1-1s.4477-1 1-1h3c.5523 0 1 ' +
    '.4477 1 1v11c0 .5523-.4477 1-1 1H1c-.5523 0-1-.4477-1-1V4z"></path>' +
    '</g></svg>';

  // === State ===
  var processed = new WeakSet();
  var observer = null;
  var debounceTimer = null;

  // === Styles ===
  function injectStyles() {
    if (document.getElementById("ntulearn-ext-dl-style")) return;
    var style = document.createElement("style");
    style.id = "ntulearn-ext-dl-style";
    style.textContent =
      ".ntulearn-dl-btn{display:inline-flex;align-items:center;" +
      "justify-content:center;width:36px;height:36px;padding:6px;" +
      "border:none;border-radius:50%;background:transparent;color:inherit;" +
      "cursor:pointer;transition:background-color 150ms cubic-bezier(0.4,0,0.2,1);}" +
      ".ntulearn-dl-btn:hover{background-color:rgba(0,0,0,0.04);}" +
      ".ntulearn-dl-btn svg{display:block;}";
    (document.head || document.documentElement).appendChild(style);
  }

  // === Menu Helpers ===
  function snapshotPopovers() {
    var set = new Set();
    document.querySelectorAll('[role="presentation"]').forEach(function (el) {
      set.add(el);
    });
    return set;
  }

  function waitForMenu(existing) {
    return new Promise(function (resolve) {
      var timeout = setTimeout(function () {
        menuObs.disconnect();
        resolve(null);
      }, MENU_WAIT_TIMEOUT);

      var menuObs = new MutationObserver(function () {
        var popovers = document.querySelectorAll('[role="presentation"]');
        for (var i = 0; i < popovers.length; i++) {
          var p = popovers[i];
          if (!existing.has(p)) {
            p.style.visibility = "hidden";
            var menu = p.querySelector('ul[role="menu"]');
            if (menu) {
              clearTimeout(timeout);
              menuObs.disconnect();
              resolve(menu);
              return;
            }
          }
        }
      });
      menuObs.observe(document.body, { childList: true, subtree: true });
    });
  }

  function closeMenu() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        keyCode: 27,
        bubbles: true,
        cancelable: true
      })
    );
  }

  // === Download Trigger ===
  // Opens the overflow menu hidden, clicks the download item, menu auto-closes.
  // If no download item exists, falls back to showing the menu normally.
  function triggerDownload(overflowBtn) {
    overflowBtn.style.display = "";
    var existing = snapshotPopovers();
    overflowBtn.click();

    waitForMenu(existing).then(function (menu) {
      if (!menu) {
        overflowBtn.style.display = "none";
        return;
      }

      var dlItem = menu.querySelector(
        'li[data-analytics-id="' + DOWNLOAD_ANALYTICS_ID + '"]'
      );
      if (dlItem) {
        dlItem.click();
        overflowBtn.style.display = "none";
      } else {
        // No download option — show menu normally as fallback
        var popover = menu.closest('[role="presentation"]');
        if (popover) popover.style.visibility = "";
        overflowBtn.style.display = "none";
      }
    });
  }

  // === Scanning ===
  // Replace each ... button with a download button immediately (no inspection).
  function scan() {
    var buttons = document.querySelectorAll(OVERFLOW_BTN_SELECTOR);
    for (var i = 0; i < buttons.length; i++) {
      var overflowBtn = buttons[i];
      if (processed.has(overflowBtn)) continue;
      processed.add(overflowBtn);

      overflowBtn.style.display = "none";

      var dlBtn = document.createElement("button");
      dlBtn.className = "ntulearn-dl-btn";
      dlBtn.innerHTML = DOWNLOAD_SVG;
      dlBtn.type = "button";

      var fileName = (overflowBtn.title || "").replace("More options for ", "");
      dlBtn.title = fileName ? "Download " + fileName : "Download";
      dlBtn.setAttribute("aria-label", dlBtn.title);

      (function (btn) {
        dlBtn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          triggerDownload(btn);
        });
      })(overflowBtn);

      overflowBtn.parentElement.insertBefore(dlBtn, overflowBtn);
    }
  }

  function scheduleScan() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scan, SCAN_DELAY);
  }

  // === Observer Lifecycle ===
  function startObserver() {
    if (observer || !document.body) return;
    injectStyles();
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    clearTimeout(debounceTimer);
  }

  // === SPA Navigation ===
  function isOutlinePage() {
    return OUTLINE_RE.test(location.pathname);
  }

  function onNavigate() {
    if (isOutlinePage()) {
      startObserver();
    } else {
      stopObserver();
    }
  }

  var _pushState = history.pushState;
  history.pushState = function () {
    var result = _pushState.apply(this, arguments);
    onNavigate();
    return result;
  };

  var _replaceState = history.replaceState;
  history.replaceState = function () {
    var result = _replaceState.apply(this, arguments);
    onNavigate();
    return result;
  };

  window.addEventListener("popstate", onNavigate);

  // === Bootstrap ===
  if (document.body) {
    onNavigate();
  } else {
    document.addEventListener("DOMContentLoaded", onNavigate);
  }
})();
