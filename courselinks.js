(function () {
  "use strict";

  // === Constants ===
  const COURSES_PAGE_PATH = "/ultra/course";
  const LINK_SELECTOR = 'a.course-title[href="javascript:void(0);"]';

  // === State ===
  const processed = new WeakSet();
  let observer = null;
  let debounceTimer = null;

  // === Core ===
  function fixCourseLinks() {
    document.querySelectorAll(LINK_SELECTOR).forEach(function (link) {
      if (processed.has(link)) return;

      const article = link.closest("article[data-course-id]");
      if (!article) return;

      const courseId = article.getAttribute("data-course-id");
      if (!courseId) return;

      processed.add(link);

      // Set real href so ctrl+click / right-click "Open in new tab" works
      link.href = "/ultra/courses/" + courseId + "/outline";

      // Prevent default on normal clicks so the existing Angular ng-click
      // handler can do SPA navigation without the browser also following the href
      link.addEventListener("click", function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
      });
    });
  }

  function scheduleFix() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fixCourseLinks, 200);
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
  function start() {
    onNavigate();
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start);
  }
})();
