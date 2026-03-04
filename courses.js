(function () {
  "use strict";

  // === Constants ===
  const STORAGE_KEY = "ntulearn-ext-courses";
  const HIDDEN_KEY = "ntulearn-ext-hidden";
  const COURSES_PAGE_PATH = "/ultra/course";
  const POPOVER_SELECTOR = '[data-test-id="course-switcher-popover"]';
  // Courses page uses AngularJS article cards, not <a href> links
  const COURSE_CARD_SELECTOR = "article.course-element-card";
  const P = "ntulearn-ext"; // CSS class prefix
  const SMALL_WORDS = new Set([
    "a", "an", "and", "at", "by", "for", "from", "in", "of", "on", "or",
    "the", "to", "with",
  ]);

  // === Icons (inline SVG) ===
  const ICON_EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const ICON_EYE_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  // === CSS ===
  const BR = "8px"; // shared border-radius
  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      ${POPOVER_SELECTOR} {
        border-radius: ${BR} !important;
      }
      .${P}-wrapper {
        padding: 10px;
      }
      .${P}-search {
        width: 100%;
        padding: 10px 14px;
        margin-bottom: 6px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: ${BR} !important;
        background: rgba(0,0,0,0.2);
        color: inherit;
        font-size: 14px;
        font-family: inherit;
        outline: none;
        box-sizing: border-box;
      }
      .${P}-search:focus {
        border-color: rgba(255,255,255,0.25);
        background: rgba(0,0,0,0.3);
      }
      .${P}-search::placeholder {
        color: rgba(255,255,255,0.5);
      }
      .${P}-list {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 300px;
        overflow-y: auto;
      }
      .${P}-item {
        margin: 0;
        padding: 0;
      }
      .${P}-item-row {
        display: flex;
        align-items: center;
        border-radius: ${BR};
        transition: background 0.15s;
      }
      .${P}-item-row:hover {
        background: rgba(255,255,255,0.08);
      }
      .${P}-item-row a {
        flex: 1;
        min-width: 0;
        display: block;
        padding: 10px 14px;
        text-decoration: none;
        color: inherit;
        outline: none;
      }
      .${P}-course-name {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 2px;
      }
      .${P}-course-meta span {
        font-size: 11px;
        opacity: 0.5;
        margin-right: 8px;
      }
      .${P}-no-results {
        padding: 20px 14px;
        text-align: center;
        opacity: 0.5;
        font-size: 14px;
      }
      .${P}-vis-btn {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        margin-right: 8px;
        background: none;
        border: none;
        border-radius: 6px;
        color: inherit;
        opacity: 0.3;
        cursor: pointer;
        transition: opacity 0.15s, background 0.15s;
      }
      .${P}-vis-btn:hover,
      .${P}-vis-btn:focus {
        opacity: 0.8;
        background: rgba(255,255,255,0.08);
        outline: none;
      }
      .${P}-item-hidden .${P}-item-row {
        opacity: 0.4;
      }
      .${P}-item-hidden .${P}-item-row:hover {
        opacity: 0.6;
      }
      .${P}-item-hidden .${P}-vis-btn {
        opacity: 0.5;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // === Data Layer ===
  function saveCourses(newCourses) {
    try {
      // Merge with existing cached courses (append, don't overwrite)
      const existing = loadCachedCourses() || [];
      const byHref = new Map();
      for (const c of existing) byHref.set(c.href, c);
      for (const c of newCourses) byHref.set(c.href, c);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ timestamp: Date.now(), courses: Array.from(byHref.values()) })
      );
    } catch (_) {}
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

  function loadHidden() {
    try {
      const raw = localStorage.getItem(HIDDEN_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (_) {
      return new Set();
    }
  }

  function saveHidden(hiddenSet) {
    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(hiddenSet)));
    } catch (_) {}
  }

  function scrapeCourses() {
    const cards = document.querySelectorAll(COURSE_CARD_SELECTOR);
    const courses = [];
    const seen = new Set();

    cards.forEach(function (card) {
      const courseId = card.getAttribute("data-course-id");
      if (!courseId || seen.has(courseId)) return;
      seen.add(courseId);

      const nameEl = card.querySelector("h4.js-course-title-element");
      const idEl = card.querySelector(".course-id span");
      const statusEl = card.querySelector(".course-status span");

      // Find the term heading: walk backwards from this card's parent
      // to find the preceding h3 term header
      let term = "";
      const prev = card.closest("[ng-repeat-end]");
      if (prev) {
        let termHeader = prev.previousElementSibling;
        while (termHeader && !termHeader.querySelector("h3")) {
          termHeader = termHeader.previousElementSibling;
        }
        if (termHeader) {
          const h3 = termHeader.querySelector("h3");
          if (h3) term = h3.textContent.trim();
        }
      }

      courses.push({
        href: location.origin + "/ultra/courses/" + courseId + "/outline",
        courseId: idEl ? idEl.textContent.trim() : "",
        courseName: nameEl ? nameEl.textContent.trim() : "",
        status: statusEl ? statusEl.textContent.trim() : "",
        semester: term,
      });
    });

    return courses;
  }

  // === Formatting ===
  function toTitleCase(text) {
    return text
      .split(/(\s+|-)/g)
      .map(function (part, i) {
        if (/^\s+$/.test(part) || part === "-") return part;
        // Keep codes with digits as-is (e.g. TG07, I, II)
        if (/\d/.test(part)) return part;
        const lower = part.toLowerCase();
        if (i > 0 && SMALL_WORDS.has(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join("");
  }

  function formatCourseName(raw) {
    // Parse "CODE(DATE):NAME" or "CODE(DATE):NAME - GROUP"
    const match = raw.match(/^([^(]+)\([^)]*\):\s*(.+)$/);
    if (!match) return { code: "", title: raw };
    const code = match[1].trim().replace(/_/g, "/");
    let title = match[2].trim();
    // Convert ALL CAPS to title case, leave mixed case as-is
    if (title === title.toUpperCase()) {
      title = toTitleCase(title);
    }
    return { code: code, title: title };
  }

  // === Search ===
  function getWords(text) {
    return text.split(/[\s/:,\-()]+/).filter(Boolean);
  }

  function acronym(words) {
    return words.map(function (w) { return w[0].toLowerCase(); }).join("");
  }

  function startsWithAny(words, q) {
    for (let i = 0; i < words.length; i++) {
      if (words[i].startsWith(q)) return true;
    }
    return false;
  }

  function matchesCourse(course, q) {
    if (!q) return true;
    // Word-start matching (avoids "pp" matching "approaches")
    const nameWords = getWords(course.courseName.toLowerCase());
    const idWords = getWords(course.courseId.toLowerCase());
    if (startsWithAny(nameWords, q)) return true;
    if (startsWithAny(idWords, q)) return true;
    if (q.length >= 2) {
      // Full acronym (e.g. "taml" matches Teaching And Managing Learners)
      if (acronym(nameWords).includes(q)) return true;
      // Filtered acronym (e.g. "tml" skipping stop words)
      const filtered = nameWords.filter(function (w) { return !SMALL_WORDS.has(w); });
      if (acronym(filtered).includes(q)) return true;
    }
    return false;
  }

  // === UI Layer ===
  function buildDropdownUI(container, courses) {
    container.innerHTML = "";
    const hidden = loadHidden();

    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Search courses\u2026";
    search.className = P + "-search";

    const list = document.createElement("ul");
    list.className = P + "-list";
    list.setAttribute("role", "menu");

    function render(query) {
      list.innerHTML = "";
      const q = query.toLowerCase();
      const matched = courses.filter(function (c) {
        return matchesCourse(c, q);
      });

      // Sort: visible courses in original order, then hidden at bottom
      const visibleCourses = matched.filter(function (c) { return !hidden.has(c.href); });
      const hiddenCourses = matched.filter(function (c) { return hidden.has(c.href); });
      const sorted = visibleCourses.concat(hiddenCourses);

      if (sorted.length === 0) {
        const msg = document.createElement("li");
        msg.className = P + "-no-results";
        msg.textContent = "No courses found";
        list.appendChild(msg);
        return;
      }

      sorted.forEach(function (course) {
        const isHidden = hidden.has(course.href);
        const li = document.createElement("li");
        li.className = P + "-item" + (isHidden ? " " + P + "-item-hidden" : "");

        const row = document.createElement("div");
        row.className = P + "-item-row";

        const a = document.createElement("a");
        a.href = course.href;
        a.setAttribute("role", "menuitem");

        const fmt = formatCourseName(course.courseName);

        const name = document.createElement("div");
        name.className = P + "-course-name";
        name.textContent = fmt.code
          ? fmt.code + ": " + fmt.title
          : fmt.title;

        const meta = document.createElement("div");
        meta.className = P + "-course-meta";
        if (course.semester) {
          const sem = document.createElement("span");
          sem.textContent = course.semester;
          meta.appendChild(sem);
        }
        if (course.status) {
          const s = document.createElement("span");
          s.textContent = course.status;
          meta.appendChild(s);
        }

        a.appendChild(name);
        a.appendChild(meta);

        const btn = document.createElement("button");
        btn.className = P + "-vis-btn";
        btn.innerHTML = isHidden ? ICON_EYE_OFF : ICON_EYE;
        btn.title = isHidden ? "Show in list" : "Hide from list";
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (hidden.has(course.href)) {
            hidden.delete(course.href);
          } else {
            hidden.add(course.href);
          }
          saveHidden(hidden);
          render(search.value);
        });

        row.appendChild(a);
        row.appendChild(btn);
        li.appendChild(row);
        list.appendChild(li);
      });
    }

    search.addEventListener("input", function () {
      render(search.value);
    });

    const wrapper = document.createElement("div");
    wrapper.className = P + "-wrapper";
    wrapper.appendChild(search);
    wrapper.appendChild(list);
    container.appendChild(wrapper);
    render("");

    setTimeout(function () {
      search.focus();
    }, 0);
  }

  // === Dropdown Override ===
  const handledPopovers = new WeakSet();

  function handlePopover(popover) {
    if (handledPopovers.has(popover)) return;

    const courses = loadCachedCourses();
    if (!courses || courses.length === 0) return;

    // Find the content area below the header.
    // The header is the first child div (contains h1, "View all" link, close button).
    // The content area is the second child div (contains "Recent courses" and the list).
    let contentArea = popover.querySelector('ul[role="menu"]');
    if (contentArea) contentArea = contentArea.parentElement;
    if (!contentArea) return; // Children not rendered yet — retry on next mutation
    handledPopovers.add(popover);
    buildDropdownUI(contentArea, courses);
  }

  function scanForPopover() {
    const popover = document.querySelector(POPOVER_SELECTOR);
    if (popover) handlePopover(popover);
  }

  // === Course Scraping on /ultra/course ===
  let scrapeTimeout = null;
  let scrapingObserver = null;

  function scheduleScrape() {
    clearTimeout(scrapeTimeout);
    scrapeTimeout = setTimeout(function () {
      const courses = scrapeCourses();
      if (courses.length > 0) {
        saveCourses(courses);
      }
    }, 500);
  }

  function startScrapingObserver() {
    if (scrapingObserver || !document.body) return;
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
    const p = location.pathname;
    return p === COURSES_PAGE_PATH || p === COURSES_PAGE_PATH + "/";
  }

  function onNavigate() {
    if (isCoursesPage()) {
      startScrapingObserver();
    } else {
      stopScrapingObserver();
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
    injectStyles();

    const observer = new MutationObserver(scanForPopover);
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
