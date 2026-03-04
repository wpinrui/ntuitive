(function () {
  "use strict";

  if (!window.__ntulearn.isEnabled("courseSwitcher", true)) return;

  // === Constants ===
  const STORAGE_KEY = "ntulearn-ext-courses";
  const COURSES_PAGE_PATH = "/ultra/course";
  const PRELOAD_ID = "ntulearn-ext-preload";
  const STYLE_ID = "ntulearn-ext-preload-style";
  const NATIVE_CARD_SELECTOR = "article.course-element-card";
  const FADE_MS = 200;

  // === Page Detection ===
  function isCoursesPage() {
    const p = location.pathname;
    return p === COURSES_PAGE_PATH || p === COURSES_PAGE_PATH + "/";
  }

  // === Cache ===
  function loadCachedCourses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data.courses || null;
    } catch (_) {
      return null;
    }
  }

  // === CSS Injection ===
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "#" + PRELOAD_ID + "{" +
        "max-width:1200px;margin:0 auto;padding:24px 20px;" +
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
        "transition:opacity " + FADE_MS + "ms ease-out" +
      "}\n" +
      "#" + PRELOAD_ID + ".fade-out{opacity:0}\n" +
      "#" + PRELOAD_ID + " .preload-term h3{" +
        "font-size:18px;font-weight:600;color:#333;margin:24px 0 12px" +
      "}\n" +
      "#" + PRELOAD_ID + " .preload-term:first-child h3{margin-top:0}\n" +
      "#" + PRELOAD_ID + " .element-card{" +
        "display:flex;align-items:center;gap:16px;" +
        "background:#fff;border:1px solid #e0e0e0;border-radius:6px;" +
        "padding:12px 16px;margin-bottom:8px;" +
        "transition:box-shadow 0.15s" +
      "}\n" +
      "#" + PRELOAD_ID + " .element-card:hover{box-shadow:0 2px 8px rgba(0,0,0,0.1)}\n" +
      "#" + PRELOAD_ID + " .element-details{flex:1;min-width:0}\n" +
      "#" + PRELOAD_ID + " .course-id span{font-size:12px;color:#666}\n" +
      "#" + PRELOAD_ID + " .course-title{" +
        "display:block;text-decoration:none;color:inherit;margin:4px 0" +
      "}\n" +
      "#" + PRELOAD_ID + " .course-title:hover{text-decoration:underline}\n" +
      "#" + PRELOAD_ID + " .js-course-title-element{" +
        "font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" +
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap" +
      "}\n" +
      "#" + PRELOAD_ID + " .course-status span{font-size:12px;color:#888}\n";
    (document.head || document.documentElement).appendChild(style);
  }

  // === DOM Construction ===
  function buildPreloadedList(courses) {
    const container = document.createElement("section");
    container.id = PRELOAD_ID;

    // Group courses by semester
    const groups = new Map();
    for (const course of courses) {
      const key = course.semester || "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(course);
    }

    for (const [semester, semCourses] of groups) {
      const termDiv = document.createElement("div");
      termDiv.className = "preload-term";
      const h3 = document.createElement("h3");
      h3.textContent = semester;
      termDiv.appendChild(h3);
      container.appendChild(termDiv);

      for (const course of semCourses) {
        const article = document.createElement("article");
        article.className = "element-card course-element-card";

        const details = document.createElement("div");
        details.className = "element-details summary";

        // Course ID
        if (course.courseId) {
          const idDiv = document.createElement("div");
          idDiv.className = "course-id";
          const idSpan = document.createElement("span");
          idSpan.textContent = course.courseId;
          idDiv.appendChild(idSpan);
          details.appendChild(idDiv);
        }

        // Course name as real link
        const link = document.createElement("a");
        link.href = course.href;
        link.className = "course-title ellipsis";
        const h4 = document.createElement("h4");
        h4.className = "js-course-title-element ellipsis";
        h4.textContent = course.courseName;
        link.appendChild(h4);
        details.appendChild(link);

        // Status
        if (course.status) {
          const statusDiv = document.createElement("div");
          statusDiv.className = "course-status";
          const statusSpan = document.createElement("span");
          statusSpan.textContent = course.status;
          statusDiv.appendChild(statusSpan);
          details.appendChild(statusDiv);
        }

        article.appendChild(details);
        container.appendChild(article);
      }
    }

    return container;
  }

  // === Cleanup ===
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
      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();
    }, FADE_MS);
  }

  function setupCleanupObserver() {
    if (cleanupObserver) return;
    cleanupObserver = new MutationObserver(function () {
      const cards = document.querySelectorAll(NATIVE_CARD_SELECTOR);
      for (let i = 0; i < cards.length; i++) {
        if (!cards[i].closest("#" + PRELOAD_ID)) {
          fadeOutAndRemove();
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
    const container = document.getElementById(PRELOAD_ID);
    if (container) container.remove();
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  }

  // === Injection ===
  function injectPreload() {
    const courses = loadCachedCourses();
    if (!courses || courses.length === 0) return;

    injectStyles();
    const container = buildPreloadedList(courses);

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
