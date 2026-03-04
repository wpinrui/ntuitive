(function () {
  "use strict";

  if (!window.__ntulearn.isEnabled("backButtonFix", false)) return;

  // URL pattern helpers
  const DOCUMENT_RE =
    /\/ultra\/courses\/[^/]+\/outline\/.+/;
  const OUTLINE_RE = /\/ultra\/courses\/[^/]+\/outline$/;

  function isDocumentView(url) {
    return DOCUMENT_RE.test(url);
  }

  function isOutlineView(url) {
    return OUTLINE_RE.test(url);
  }

  // --- Strategy 1: pushState monkey-patch ---
  const originalPushState = history.pushState.bind(history);

  history.pushState = function (state, title, url) {
    try {
      if (url) {
        const targetPath = new URL(url, location.origin).pathname;
        if (isDocumentView(location.pathname) && isOutlineView(targetPath)) {
          history.back();
          return;
        }
      }
    } catch (_) {
      // Fall through to original pushState if URL parsing fails
    }
    return originalPushState(state, title, url);
  };

  // --- Strategy 2: MutationObserver on close button ---
  const CLOSE_BUTTON_SELECTOR =
    'button[data-bbui-close="true"], bb-close-panel button';
  const fixedButtons = new WeakSet();

  function handleCloseButton(button) {
    if (fixedButtons.has(button)) return;
    fixedButtons.add(button);

    button.addEventListener(
      "click",
      function (e) {
        if (isDocumentView(location.pathname)) {
          e.stopImmediatePropagation();
          e.preventDefault();
          history.back();
        }
      },
      true
    );
  }

  function scanForCloseButtons() {
    document
      .querySelectorAll(CLOSE_BUTTON_SELECTOR)
      .forEach(handleCloseButton);
  }

  const observer = new MutationObserver(scanForCloseButtons);

  function startObserver() {
    scanForCloseButtons();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) {
    startObserver();
  } else {
    document.addEventListener("DOMContentLoaded", startObserver);
  }
})();
