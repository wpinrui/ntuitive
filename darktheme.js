(function () {
  "use strict";

  if (!window.__ntulearn.isEnabled("darkTheme", false)) return;

  // === Constants ===
  var STYLE_ID = "ntulearn-ext-dark-style";
  var DARK_CLASS = "ntulearn-ext-dark";

  // Already-dark UI regions that need re-inversion to stay dark.
  // Maintain as an array for easy addition/removal during testing.
  var DARK_CHROME_SELECTORS = [
    ".bb-course-navigation",
    ".base-header",
    "course-banner",
    ".black-panel-header",
    '[data-test-id="course-switcher-popover"]',
    ".toolbar-inner"
  ];

  // Media elements that need re-inversion to preserve original appearance.
  var MEDIA_SELECTORS = [
    "img",
    "video",
    "canvas",
    "iframe",
    '[style*="background-image"]'
  ];

  // === CSS Generation ===
  function buildCSS() {
    var d = "html." + DARK_CLASS;
    var reinvert = "filter:invert(1) hue-rotate(180deg) !important";

    var css = d + "{" + reinvert + ";background-color:#111 !important}\n";

    css += MEDIA_SELECTORS.map(function (s) { return d + " " + s; }).join(",")
      + "{" + reinvert + "}\n";

    if (DARK_CHROME_SELECTORS.length) {
      css += DARK_CHROME_SELECTORS.map(function (s) { return d + " " + s; }).join(",")
        + "{" + reinvert + "}\n";
    }

    return css;
  }

  // === Injection ===
  var style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = buildCSS();
  (document.head || document.documentElement).appendChild(style);
  document.documentElement.classList.add(DARK_CLASS);

  // === PDF viewer iframe background ===
  // The PDF viewer renders inside a same-origin iframe whose URL may not
  // match our content_scripts pattern.  Inject a background override
  // directly via contentDocument so it survives the filter chain.
  var PDF_STYLE_ID = STYLE_ID + "-pdf";
  var patchedIframes = new WeakSet();

  function patchPdfIframe() {
    var iframe = document.querySelector("bb-file-preview iframe");
    if (!iframe || patchedIframes.has(iframe)) return;
    patchedIframes.add(iframe);
    function inject() {
      try {
        var doc = iframe.contentDocument;
        if (!doc || doc.getElementById(PDF_STYLE_ID)) return;
        var s = doc.createElement("style");
        s.id = PDF_STYLE_ID;
        s.textContent = ".page-container{background-color:#222 !important}";
        (doc.head || doc.documentElement).appendChild(s);
      } catch (_) {}
    }
    inject();
    iframe.addEventListener("load", inject);
  }

  function startPdfWatch() {
    patchPdfIframe();
    new MutationObserver(patchPdfIframe)
      .observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) {
    startPdfWatch();
  } else {
    document.addEventListener("DOMContentLoaded", startPdfWatch);
  }
})();
