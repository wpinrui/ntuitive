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
  var inspecting = false;
  var queue = [];

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

  function getVisibleItems(menu) {
    var items = menu.querySelectorAll('li[role="menuitem"]');
    var visible = [];
    for (var i = 0; i < items.length; i++) {
      if (getComputedStyle(items[i]).display !== "none") {
        visible.push(items[i]);
      }
    }
    return visible;
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

  // === Download Button ===
  function createDownloadButton(overflowBtn, mode) {
    var btn = document.createElement("button");
    btn.className = "ntulearn-dl-btn";
    btn.innerHTML = DOWNLOAD_SVG;
    btn.type = "button";

    var fileName = (overflowBtn.title || "").replace("More options for ", "");
    btn.title = fileName ? "Download " + fileName : "Download";
    btn.setAttribute("aria-label", btn.title);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      triggerDownload(overflowBtn);
    });

    var container = overflowBtn.parentElement;
    if (mode === "replace") {
      overflowBtn.style.display = "none";
      container.insertBefore(btn, overflowBtn);
    } else {
      container.insertBefore(btn, overflowBtn);
    }
  }

  function triggerDownload(overflowBtn) {
    var wasHidden = overflowBtn.style.display === "none";
    if (wasHidden) overflowBtn.style.display = "";

    var existing = snapshotPopovers();
    overflowBtn.click();

    waitForMenu(existing).then(function (menu) {
      if (!menu) {
        if (wasHidden) overflowBtn.style.display = "none";
        return;
      }

      var dlItem = menu.querySelector(
        'li[data-analytics-id="' + DOWNLOAD_ANALYTICS_ID + '"]'
      );
      if (dlItem) {
        dlItem.click();
      } else {
        closeMenu();
      }

      if (wasHidden) overflowBtn.style.display = "none";
    });
  }

  // === Inspection ===
  function inspectButton(button) {
    var existing = snapshotPopovers();

    var overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:transparent;";
    document.body.appendChild(overlay);

    button.click();

    return waitForMenu(existing).then(function (menu) {
      overlay.remove();

      if (!menu) return;

      var visible = getVisibleItems(menu);
      var dlItem = null;
      var otherCount = 0;

      for (var i = 0; i < visible.length; i++) {
        var aid = visible[i].getAttribute("data-analytics-id") || "";
        if (aid === DOWNLOAD_ANALYTICS_ID) {
          dlItem = visible[i];
        } else {
          otherCount++;
        }
      }

      closeMenu();

      if (!dlItem) return;

      if (otherCount === 0) {
        createDownloadButton(button, "replace");
      } else {
        createDownloadButton(button, "alongside");
      }
    });
  }

  function processQueue() {
    if (inspecting || queue.length === 0) return;
    inspecting = true;

    var button = queue.shift();

    inspectButton(button).then(function () {
      inspecting = false;
      if (queue.length > 0) {
        setTimeout(processQueue, 200);
      }
    });
  }

  // === Scanning ===
  function scan() {
    var buttons = document.querySelectorAll(OVERFLOW_BTN_SELECTOR);
    var added = false;

    for (var i = 0; i < buttons.length; i++) {
      if (!processed.has(buttons[i])) {
        processed.add(buttons[i]);
        queue.push(buttons[i]);
        added = true;
      }
    }

    if (added) processQueue();
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
    queue = [];
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
