# NTULearn Nav Fix — Design Doc

## Problems

### 1. Broken back-button navigation
NTULearn (Blackboard Ultra) is a SPA. Closing a document view pushes a
duplicate `/outline` onto the history stack instead of popping back to it.
This means the back button navigates to the document again, and repeated
closing accumulates junk history entries.

**Expected behaviour**
- Back on document → outline
- Back on outline → course list (`/ultra/course`)

### 2. Useless course dropdown
The "Courses" dropdown in the top nav only shows a handful of recent courses
with large thumbnail images, wasting space. It does not include all enrolled
courses and has no search functionality.

**Expected behaviour**
- Dropdown shows all enrolled courses (scraped from the "View all" page)
- Searchable by course name or ID
- Compact list layout (no thumbnails)

---

## URL Patterns
| Page | Pattern |
|------|---------|
| Course list | `/ultra/course` |
| Course outline | `/ultra/courses/{courseId}/outline` |
| Document view | `/ultra/courses/{courseId}/outline/file/{fileId}` (and similar sub-paths) |

---

## Approach

Content scripts injected on `ntulearn.ntu.edu.sg`.

### Back button fix strategy
NTULearn is a SPA, so navigation is JS-driven (`pushState`), not page loads.
The close button on a document view triggers a JS navigation to `/outline`,
pushing a duplicate entry.

**Preferred fix: monkey-patch `history.pushState`**
Intercept calls to `history.pushState` where:
- Current URL matches the document pattern
- Target URL matches the outline pattern
Replace the push with `history.back()` instead.

**Fallback: MutationObserver on close button**
If pushState interception is insufficient (e.g. the SPA uses `replaceState`
or a router abstraction), observe the DOM for the close button and attach
a click handler that calls `history.back()` and prevents default navigation.

Both strategies can run simultaneously.

### Course dropdown strategy
**Data collection:** When user visits the "View all" courses page
(`/ultra/course`), scrape all course names, IDs, links, status, and semester.
Cache in `localStorage` so data persists across SPA navigations and refreshes.

**Dropdown override:** MutationObserver detects the course switcher popover
(`[data-test-id="course-switcher-popover"]`). When it appears, replace its
contents with a searchable list of all courses.

**Graceful degradation:** If no cached data exists (user hasn't visited the
courses page yet), leave the original dropdown untouched.

---

## Implementation Notes

- **MutationObserver** needed regardless — SPA re-renders mean the close
  button may not exist on script load
- **Selector risk**: close button CSS selector may change on NTULearn updates;
  should be the primary maintenance surface
- No background script required
- No permissions beyond `activeTab` / host match for `ntulearn.ntu.edu.sg`

---

## Manifest

- **Version**: Manifest V3 (Chrome + Firefox compatible)
- **Files**: `manifest.json`, `content.js`, `courses.js`
- **Host permissions**: `https://ntulearn.ntu.edu.sg/*`

### Browser targets
| Browser | Distribution | Notes |
|---------|-------------|-------|
| Chrome | Chrome Web Store | $5 one-time dev fee |
| Firefox | Mozilla AMO | Free, manual code review |

Cross-browser delta expected to be minimal — MV3 is supported on both.
Test on both before submission.

---

## Risks
| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Close button selector changes | Medium | Keep selector isolated, easy to patch |
| SPA router bypasses pushState patch | Low | MutationObserver fallback covers this |
| NTULearn URL structure changes | Low | Pattern matching is loosely defined |
| Course list page DOM changes | Medium | Selectors isolated, easy to update |
| Course dropdown popover DOM changes | Medium | Detected via `data-test-id`, fairly stable |

---

## Out of Scope
- NTULearn UX fixes beyond navigation and course switching
- Userscript distribution
