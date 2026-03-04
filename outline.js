(function () {
  "use strict";

  // === Constants ===
  const EXPAND_DELAY = 0; // ms before clicking the next folder (tune as needed)
  const FOLDER_BTN_SELECTOR =
    'button[data-analytics-id="content.item.folder.toggleFolder.button"][aria-expanded="false"]';
  const OUTLINE_RE = /\/ultra\/courses\/[^/]+\/outline$/;

  // === State ===
  let observer = null;
  let debounceTimer = null;

  // === Core ===
  // Click ONE collapsed folder per pass. Each click can trigger a React
  // re-render that replaces sibling buttons, so we let the MutationObserver
  // cascade: click one → DOM updates → observer fires → click next.
  function expandOneFolder() {
    const btn = document.querySelector(FOLDER_BTN_SELECTOR);
    if (btn) btn.click();
  }

  function scheduleExpand() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(expandOneFolder, EXPAND_DELAY);
  }

  // === Observer lifecycle ===
  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(scheduleExpand);
    observer.observe(document.body, { childList: true, subtree: true });
    expandOneFolder();
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    clearTimeout(debounceTimer);
  }

  // === SPA Navigation Detection ===
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

  const _pushState = history.pushState;
  history.pushState = function () {
    const result = _pushState.apply(this, arguments);
    onNavigate();
    return result;
  };

  const _replaceState = history.replaceState;
  history.replaceState = function () {
    const result = _replaceState.apply(this, arguments);
    onNavigate();
    return result;
  };

  window.addEventListener("popstate", onNavigate);

  // === Bootstrap ===
  function start() {
    onNavigate();
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start);
  }
})();
