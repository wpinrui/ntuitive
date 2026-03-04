(function () {
  "use strict";

  if (!window.__ntulearn.isEnabled("darkTheme", false)) return;

  // === Constants ===
  const STYLE_ID = "ntulearn-ext-dark-style";
  const DARK_CLASS = "ntulearn-ext-dark";

  // Already-dark UI regions that need re-inversion to stay dark.
  // Maintain as an array for easy addition/removal during testing.
  const DARK_CHROME_SELECTORS = [
    ".bb-course-navigation",
    ".base-header",
    "course-banner",
    ".black-panel-header",
    ':has(> [data-test-id="course-switcher-popover"])'
  ];

  // Media elements that need re-inversion to preserve original appearance.
  const MEDIA_SELECTORS = [
    "img",
    "video",
    "canvas",
    "iframe",
    '[style*="background-image"]'
  ];

  // Elements inside re-inverted containers whose text reverts to dark-on-dark.
  const TEXT_FIX_SELECTORS = [
    "#main-heading",
    ".catalog-anchor-tag > span > bb-translate"
  ];

  // === CSS Generation ===
  function buildCSS() {
    const darkRoot = "html." + DARK_CLASS;
    const reinvert = "filter:invert(1) hue-rotate(180deg) !important";

    function ruleBlock(selectors, rule) {
      return selectors.map(function (s) { return darkRoot + " " + s; }).join(",")
        + "{" + rule + "}\n";
    }

    let css = darkRoot + "{" + reinvert + ";background-color:#111 !important}\n";
    css += ruleBlock(MEDIA_SELECTORS, reinvert);
    if (DARK_CHROME_SELECTORS.length) css += ruleBlock(DARK_CHROME_SELECTORS, reinvert);
    if (TEXT_FIX_SELECTORS.length) css += ruleBlock(TEXT_FIX_SELECTORS, "color:#fff !important");

    return css;
  }

  // === Injection ===
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = buildCSS();
  (document.head || document.documentElement).appendChild(style);
  document.documentElement.classList.add(DARK_CLASS);
})();
