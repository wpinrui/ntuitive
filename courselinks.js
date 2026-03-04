(function () {
  "use strict";

  if (!window.__ntulearn.isEnabled("courseLinks", true)) return;

  // === Constants ===
  const COURSES_PAGE_PATH = "/ultra/course";
  const LINK_SELECTOR = 'a.course-title[href="javascript:void(0);"]';
  const FIX_DELAY = 200; // ms debounce before processing new links

  // === State ===
  const processed = new WeakSet();
  let observer = null;
  let debounceTimer = null;

  // === Core ===

  // Capture-phase handler fires before Angular's ng-click (bubbling phase).
  // Modifier/middle clicks: suppress Angular so only a new tab opens and
  // the current page stays put. Normal clicks: just prevent the browser
  // from following the href while Angular does SPA navigation.
  function interceptClick(e) {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) {
      e.stopImmediatePropagation();
      return;
    }
    e.preventDefault();
  }

  function fixCourseLinks() {
    document.querySelectorAll(LINK_SELECTOR).forEach(function (link) {
      if (processed.has(link)) return;

      const article = link.closest("article[data-course-id]");
      if (!article) return;

      const courseId = article.getAttribute("data-course-id");
      if (!courseId) return;

      processed.add(link);

      // Set real href so ctrl+click / right-click "Open in new tab" works
      link.href = location.origin + "/ultra/courses/" + courseId + "/outline";
      link.addEventListener("click", interceptClick, true);
    });
  }

  function scheduleFix() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fixCourseLinks, FIX_DELAY);
  }

  // === Observer lifecycle ===
  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(scheduleFix);
    observer.observe(document.body, { childList: true, subtree: true });
    fixCourseLinks();
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    clearTimeout(debounceTimer);
  }

  // === SPA Navigation Detection ===
  function isCoursesPage() {
    const p = location.pathname;
    return p === COURSES_PAGE_PATH || p === COURSES_PAGE_PATH + "/";
  }

  function onNavigate() {
    if (isCoursesPage()) {
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
