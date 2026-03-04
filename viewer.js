(function () {
  "use strict";

  // === Constants ===
  const DOCUMENT_RE = /\/ultra\/courses\/[^/]+\/outline\/.+/;
  const STYLE_ID = "ntulearn-ext-viewer-style";
  const BOTTOM_MARGIN = 8; // px gap below the viewer

  // === URL Detection ===
  function isFileView() {
    return DOCUMENT_RE.test(location.pathname);
  }

  // === CSS Injection ===
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      bb-file-preview > div {
        height: 100% !important;
      }
      bb-file-preview iframe {
        height: 100% !important;
        width: 100% !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function removeStyles() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  // === Attribute Fix ===
  const fixedPreviews = new WeakSet();

  function fixGrowIframe() {
    document
      .querySelectorAll('bb-file-preview[grow-iframe="false"]')
      .forEach(function (el) {
        if (fixedPreviews.has(el)) return;
        fixedPreviews.add(el);
        el.setAttribute("grow-iframe", "true");
      });
  }

  // === Viewer Resize ===
  // Measure the preview element's position and set its height to fill
  // the remaining viewport. Uses calc(100vh - ...) so it stays responsive
  // to window resize without needing a resize listener.
  let lastTop = -1;

  function resizeViewer() {
    const preview = document.querySelector("bb-file-preview");
    if (!preview) return;
    const rect = preview.getBoundingClientRect();
    const top = Math.round(rect.top);
    if (top > 0 && top !== lastTop) {
      lastTop = top;
      preview.style.height = "calc(100vh - " + top + "px - " + BOTTOM_MARGIN + "px)";
    }
  }

  // === Observer Lifecycle ===
  let observer = null;

  function onMutation() {
    fixGrowIframe();
    resizeViewer();
  }

  function startObserver() {
    if (observer || !document.body) return;
    injectStyles();
    observer = new MutationObserver(onMutation);
    observer.observe(document.body, { childList: true, subtree: true });
    fixGrowIframe();
    resizeViewer();
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    lastTop = -1;
    const preview = document.querySelector("bb-file-preview");
    if (preview) preview.style.height = "";
    removeStyles();
  }

  // === SPA Navigation Detection ===
  function onNavigate() {
    if (isFileView()) {
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
  if (document.body) {
    onNavigate();
  } else {
    document.addEventListener("DOMContentLoaded", onNavigate);
  }
})();
