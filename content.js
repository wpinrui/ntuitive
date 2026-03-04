(function () {
  "use strict";

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
    if (url) {
      const targetPath = new URL(url, location.origin).pathname;
      if (isDocumentView(location.href) && isOutlineView(targetPath)) {
        history.back();
        return;
      }
    }
    return originalPushState(state, title, url);
  };

  // --- Strategy 2: MutationObserver on close button ---
  const CLOSE_BUTTON_SELECTOR =
    'button[data-bbui-close="true"], bb-close-panel button';

  function handleCloseButton(button) {
    if (button.__ntuNavFixed) return;
    button.__ntuNavFixed = true;

    button.addEventListener(
      "click",
      function (e) {
        if (isDocumentView(location.href)) {
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

  if (document.body) {
    scanForCloseButtons();
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      scanForCloseButtons();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
