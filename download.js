(function () {
  "use strict";

  if (!window.__ntulearn.isEnabled("surfaceDownload", false)) return;

  // === Constants ===
  const OVERFLOW_BTN_SELECTOR =
    'button[id^="content-item-overflow-menu-button-"]';
  const OUTLINE_RE = /\/ultra\/courses\/([^/]+)\/outline/;
  const SCAN_DELAY = 300;

  const DOWNLOAD_SVG =
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
  const processed = new WeakSet();
  let observer = null;
  let debounceTimer = null;

  // === Styles ===
  function injectStyles() {
    if (document.getElementById("ntulearn-ext-dl-style")) return;
    const style = document.createElement("style");
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

  // === Helpers ===
  function getCourseId() {
    const match = location.pathname.match(OUTLINE_RE);
    return match ? match[1] : null;
  }

  function getContentId(button) {
    const match = (button.id || "").match(/content-item-overflow-menu-button-(.+)$/);
    return match ? match[1] : null;
  }

  function restoreOverflowButton(dlBtn, overflowBtn) {
    overflowBtn.style.display = "";
    dlBtn.remove();
  }

  // === Download ===
  function triggerDownload(courseId, contentId, dlBtn, overflowBtn) {
    const apiBase = location.origin +
      "/learn/api/public/v1/courses/" + courseId +
      "/contents/" + contentId + "/attachments";

    fetch(apiBase, { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) throw new Error("Attachments API returned " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data.results || data.results.length === 0) {
          restoreOverflowButton(dlBtn, overflowBtn);
          return;
        }
        const att = data.results[0];
        const dlUrl = apiBase + "/" + att.id + "/download";
        return fetch(dlUrl, { credentials: "same-origin", redirect: "follow" })
          .then(function (res) {
            if (!res.ok) throw new Error("Download returned " + res.status);
            return res.blob();
          })
          .then(function (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = att.fileName || "download";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          });
      })
      .catch(function (err) {
        console.error("[NTULearn Nav Fix] Download failed:", err);
        restoreOverflowButton(dlBtn, overflowBtn);
      });
  }

  // === Scanning ===
  function scan() {
    const courseId = getCourseId();
    if (!courseId) return;

    const buttons = document.querySelectorAll(OVERFLOW_BTN_SELECTOR);
    for (let i = 0; i < buttons.length; i++) {
      const overflowBtn = buttons[i];
      if (processed.has(overflowBtn)) continue;
      processed.add(overflowBtn);

      const contentId = getContentId(overflowBtn);
      if (!contentId) continue;

      overflowBtn.style.display = "none";

      const dlBtn = document.createElement("button");
      dlBtn.className = "ntulearn-dl-btn";
      dlBtn.innerHTML = DOWNLOAD_SVG;
      dlBtn.type = "button";

      const fileName = (overflowBtn.title || "").replace("More options for ", "");
      dlBtn.title = fileName ? "Download " + fileName : "Download";
      dlBtn.setAttribute("aria-label", dlBtn.title);

      dlBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        triggerDownload(courseId, contentId, dlBtn, overflowBtn);
      });

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
