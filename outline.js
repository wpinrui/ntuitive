(function () {
  "use strict";

  // === Constants ===
  const EXPAND_DELAY = 0; // ms before clicking the next folder (tune as needed)
  const MAX_EXPAND_DEPTH = 0; // 0 = top-level only, 1 = +subfolders, Infinity = all
  const FOLDER_BTN_SELECTOR =
    'button[data-analytics-id="content.item.folder.toggleFolder.button"]';
  const OUTLINE_RE = /\/ultra\/courses\/[^/]+\/outline$/;

  // === State ===
  // Track folders we've already expanded (by aria-controls ID) so we don't
  // fight the user when they manually collapse one.
  let expanded = new Set();
  let observer = null;
  let debounceTimer = null;

  // === Core ===
  // Count how many folder-contents regions this button is nested inside.
  // Top-level folder = 0, subfolder = 1, etc.
  function getFolderDepth(btn) {
    let depth = 0;
    let el = btn.parentElement;
    while (el) {
      if (el.id && el.id.startsWith("folder-contents-")) depth++;
      el = el.parentElement;
    }
    return depth;
  }

  // Click ONE collapsed folder per pass. Each click can trigger a React
  // re-render that replaces sibling buttons, so we let the MutationObserver
  // cascade: click one → DOM updates → observer fires → click next.
  function expandOneFolder() {
    // Seed the set with any folders already open
    document.querySelectorAll(FOLDER_BTN_SELECTOR).forEach(function (btn) {
      if (btn.getAttribute("aria-expanded") === "true") {
        expanded.add(btn.getAttribute("aria-controls"));
      }
    });
    // Find first collapsed folder we haven't touched yet
    const buttons = document.querySelectorAll(
      FOLDER_BTN_SELECTOR + '[aria-expanded="false"]'
    );
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const id = btn.getAttribute("aria-controls");
      if (expanded.has(id)) continue;
      if (getFolderDepth(btn) > MAX_EXPAND_DEPTH) continue;
      expanded.add(id);
      btn.click();
      return;
    }
  }

  function scheduleExpand() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(expandOneFolder, EXPAND_DELAY);
  }

  // === Observer lifecycle ===
  function startObserver() {
    if (observer || !document.body) return;
    expanded = new Set();
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
