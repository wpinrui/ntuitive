(function () {
  "use strict";

  if (!window.__ntulearn.isEnabled("courseSwitcher", true)) return;

  // === Constants ===
  const SNAPSHOT_KEY = "ntulearn-ext-page-snapshot";
  const COURSES_PAGE_PATH = "/ultra/course";
  const PRELOAD_ID = "ntulearn-ext-preload";
  const STYLE_ID = "ntulearn-ext-preload-style";
  const NATIVE_CARD_SELECTOR = "article.course-element-card";
  const SNAPSHOT_SELECTOR = ".course-org-list";
  const FADE_MS = 200;
  const CAPTURE_DELAY = 2000; // ms after last mutation before capturing snapshot

  // === Page Detection ===
  function isCoursesPage() {
    const p = location.pathname;
    return p === COURSES_PAGE_PATH || p === COURSES_PAGE_PATH + "/";
  }

  // === Snapshot Storage ===
  function loadSnapshot() {
    try {
      return localStorage.getItem(SNAPSHOT_KEY);
    } catch (_) { return null; }
  }

  function saveSnapshot(html) {
    try {
      localStorage.setItem(SNAPSHOT_KEY, html);
    } catch (_) {}
  }

  // === CSS ===
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "#" + PRELOAD_ID + "{transition:opacity " + FADE_MS + "ms ease-out}\n" +
      "#" + PRELOAD_ID + ".fade-out{opacity:0}\n";
    (document.head || document.documentElement).appendChild(style);
  }

  function removeStyles() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  // === Snapshot Capture ===
  let captureObserver = null;
  let captureTimer = null;

  function captureSnapshot() {
    const target = document.querySelector(SNAPSHOT_SELECTOR);
    if (!target) return;
    saveSnapshot(target.outerHTML);
  }

  function scheduleCapture() {
    clearTimeout(captureTimer);
    captureTimer = setTimeout(captureSnapshot, CAPTURE_DELAY);
  }

  function startCaptureObserver() {
    if (captureObserver || !document.body) return;
    captureObserver = new MutationObserver(function () {
      if (document.querySelector(NATIVE_CARD_SELECTOR)) {
        scheduleCapture();
      }
    });
    captureObserver.observe(document.body, { childList: true, subtree: true });
    // Check immediately in case cards already exist
    if (document.querySelector(NATIVE_CARD_SELECTOR)) {
      scheduleCapture();
    }
  }

  function stopCaptureObserver() {
    if (captureObserver) {
      captureObserver.disconnect();
      captureObserver = null;
    }
    clearTimeout(captureTimer);
  }

  // === Replay ===
  let cleanupObserver = null;

  function fadeOutAndRemove() {
    if (cleanupObserver) {
      cleanupObserver.disconnect();
      cleanupObserver = null;
    }
    const container = document.getElementById(PRELOAD_ID);
    if (!container) return;
    container.classList.add("fade-out");
    setTimeout(function () {
      container.remove();
      removeStyles();
    }, FADE_MS);
  }

  function setupCleanupObserver() {
    if (cleanupObserver) return;
    cleanupObserver = new MutationObserver(function () {
      // Look for a native card NOT inside our preload container
      const cards = document.querySelectorAll(NATIVE_CARD_SELECTOR);
      for (let i = 0; i < cards.length; i++) {
        if (!cards[i].closest("#" + PRELOAD_ID)) {
          fadeOutAndRemove();
          startCaptureObserver();
          return;
        }
      }
    });
    cleanupObserver.observe(document.body, { childList: true, subtree: true });
  }

  function removePreload() {
    if (cleanupObserver) {
      cleanupObserver.disconnect();
      cleanupObserver = null;
    }
    stopCaptureObserver();
    const container = document.getElementById(PRELOAD_ID);
    if (container) container.remove();
    removeStyles();
  }

  // === Injection ===
  function injectPreload() {
    const html = loadSnapshot();
    if (!html) {
      // No snapshot yet — just set up capture for next visit
      function waitAndCapture() {
        if (document.body) {
          startCaptureObserver();
        } else {
          document.addEventListener("DOMContentLoaded", startCaptureObserver);
        }
      }
      waitAndCapture();
      return;
    }

    injectStyles();
    const container = document.createElement("div");
    container.id = PRELOAD_ID;
    container.innerHTML = html;

    function insert() {
      if (document.getElementById(PRELOAD_ID)) return;
      if (document.querySelector(NATIVE_CARD_SELECTOR)) return;
      document.body.appendChild(container);
      setupCleanupObserver();
    }

    if (document.body) {
      insert();
    } else {
      const bodyWaiter = new MutationObserver(function () {
        if (document.body) {
          bodyWaiter.disconnect();
          insert();
        }
      });
      bodyWaiter.observe(document.documentElement, { childList: true });
    }
  }

  // === SPA Navigation Detection ===
  function onNavigate() {
    if (isCoursesPage()) {
      injectPreload();
    } else {
      removePreload();
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
  if (isCoursesPage()) {
    injectPreload();
  }
})();
