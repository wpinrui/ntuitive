(function () {
  "use strict";

  // === Constants ===
  const STORAGE_KEY = "ntulearn-ext-courses";
  const COURSES_PAGE_PATH = "/ultra/course";
  const POPOVER_SELECTOR = '[data-test-id="course-switcher-popover"]';
  const COURSE_LINK_SELECTOR = 'a[href*="/ultra/courses/"][href$="/outline"]';
  const P = "ntulearn-ext"; // CSS class prefix

  // === CSS ===
  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .${P}-search {
        width: 100%;
        padding: 10px 12px;
        margin-bottom: 8px;
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 6px;
        background: rgba(255,255,255,0.08);
        color: inherit;
        font-size: 14px;
        font-family: inherit;
        outline: none;
        box-sizing: border-box;
      }
      .${P}-search:focus {
        border-color: rgba(255,255,255,0.4);
        background: rgba(255,255,255,0.12);
      }
      .${P}-search::placeholder {
        color: rgba(255,255,255,0.5);
      }
      .${P}-list {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 400px;
        overflow-y: auto;
      }
      .${P}-item {
        margin: 0;
        padding: 0;
      }
      .${P}-item a {
        display: block;
        padding: 10px 12px;
        border-radius: 6px;
        text-decoration: none;
        color: inherit;
        transition: background 0.15s;
      }
      .${P}-item a:hover,
      .${P}-item a:focus {
        background: rgba(255,255,255,0.08);
        outline: none;
      }
      .${P}-course-name {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 2px;
      }
      .${P}-course-id {
        font-size: 12px;
        opacity: 0.6;
        margin-bottom: 4px;
      }
      .${P}-course-meta span {
        font-size: 11px;
        opacity: 0.5;
        margin-right: 8px;
      }
      .${P}-no-results {
        padding: 20px 12px;
        text-align: center;
        opacity: 0.5;
        font-size: 14px;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // === Data Layer ===
  function saveCourses(courses) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ timestamp: Date.now(), courses: courses })
      );
    } catch (_) {
      // localStorage full or unavailable
    }
  }

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

  function scrapeCourses() {
    const links = document.querySelectorAll(COURSE_LINK_SELECTOR);
    const courses = [];
    const seen = new Set();

    links.forEach(function (link) {
      const href = link.getAttribute("href");
      if (seen.has(href)) return;
      seen.add(href);

      const headings = link.querySelectorAll("h3");
      const spans = link.querySelectorAll("span");

      courses.push({
        href: href,
        courseId: headings[0] ? headings[0].textContent.trim() : "",
        courseName: headings[1] ? headings[1].textContent.trim() : "",
        status: spans[0] ? spans[0].textContent.trim() : "",
        semester: spans[1] ? spans[1].textContent.trim() : "",
      });
    });

    return courses;
  }

  // === UI Layer ===
  function buildDropdownUI(container, courses) {
    container.innerHTML = "";

    var search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Search courses\u2026";
    search.className = P + "-search";

    var list = document.createElement("ul");
    list.className = P + "-list";
    list.setAttribute("role", "menu");

    function render(query) {
      list.innerHTML = "";
      var q = query.toLowerCase();
      var filtered = courses.filter(function (c) {
        return (
          c.courseName.toLowerCase().includes(q) ||
          c.courseId.toLowerCase().includes(q)
        );
      });

      if (filtered.length === 0) {
        var msg = document.createElement("li");
        msg.className = P + "-no-results";
        msg.textContent = "No courses found";
        list.appendChild(msg);
        return;
      }

      filtered.forEach(function (course) {
        var li = document.createElement("li");
        li.className = P + "-item";

        var a = document.createElement("a");
        a.href = course.href;
        a.setAttribute("role", "menuitem");

        var name = document.createElement("div");
        name.className = P + "-course-name";
        name.textContent = course.courseName;

        var id = document.createElement("div");
        id.className = P + "-course-id";
        id.textContent = course.courseId;

        var meta = document.createElement("div");
        meta.className = P + "-course-meta";
        if (course.status) {
          var s = document.createElement("span");
          s.textContent = course.status;
          meta.appendChild(s);
        }
        if (course.semester) {
          var sem = document.createElement("span");
          sem.textContent = course.semester;
          meta.appendChild(sem);
        }

        a.appendChild(name);
        a.appendChild(id);
        a.appendChild(meta);
        li.appendChild(a);
        list.appendChild(li);
      });
    }

    search.addEventListener("input", function () {
      render(search.value);
    });

    container.appendChild(search);
    container.appendChild(list);
    render("");

    setTimeout(function () {
      search.focus();
    }, 0);
  }

  // === Dropdown Override ===
  var handledPopovers = new WeakSet();

  function handlePopover(popover) {
    if (handledPopovers.has(popover)) return;
    handledPopovers.add(popover);

    var courses = loadCachedCourses();
    if (!courses || courses.length === 0) return;

    // Find the content area below the header.
    // The header is the first child div (contains h1, "View all" link, close button).
    // The content area is the second child div (contains "Recent courses" and the list).
    var contentArea = popover.querySelector('ul[role="menu"]');
    if (contentArea) contentArea = contentArea.parentElement;
    if (!contentArea) return;

    buildDropdownUI(contentArea, courses);
  }

  function scanForPopover() {
    var popover = document.querySelector(POPOVER_SELECTOR);
    if (popover) handlePopover(popover);
  }

  // === Course Scraping on /ultra/course ===
  var scrapeTimeout = null;
  var scrapingObserver = null;

  function scheduleScrape() {
    clearTimeout(scrapeTimeout);
    scrapeTimeout = setTimeout(function () {
      var courses = scrapeCourses();
      if (courses.length > 0) {
        saveCourses(courses);
      }
    }, 500);
  }

  function startScrapingObserver() {
    if (scrapingObserver) return;
    scrapingObserver = new MutationObserver(scheduleScrape);
    scrapingObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
    scheduleScrape();
  }

  function stopScrapingObserver() {
    if (scrapingObserver) {
      scrapingObserver.disconnect();
      scrapingObserver = null;
    }
    clearTimeout(scrapeTimeout);
  }

  // === SPA Navigation Detection ===
  function isCoursesPage() {
    var p = location.pathname;
    return p === COURSES_PAGE_PATH || p === COURSES_PAGE_PATH + "/";
  }

  function onNavigate() {
    if (isCoursesPage()) {
      startScrapingObserver();
    } else {
      stopScrapingObserver();
    }
  }

  var _pushState = history.pushState;
  history.pushState = function () {
    var result = _pushState.apply(this, arguments);
    onNavigate();
    return result;
  };

  var _replaceState = history.replaceState;
  history.replaceState = function () {
    var result = _replaceState.apply(this, arguments);
    onNavigate();
    return result;
  };

  window.addEventListener("popstate", onNavigate);

  // === Bootstrap ===
  function start() {
    injectStyles();

    var observer = new MutationObserver(scanForPopover);
    observer.observe(document.body, { childList: true, subtree: true });
    scanForPopover();

    onNavigate();
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start);
  }
})();
