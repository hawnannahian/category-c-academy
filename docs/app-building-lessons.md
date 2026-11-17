# App-building lessons (Category C Academy)

Lessons from the issues met while building this PWA, and a ready-to-use prompt for the next app.

## What went wrong here, and why
| Issue | Root cause |
|---|---|
| Tabs stopped working after an update | GitHub Pages ignores `?v=`; a stale cached `index.html` met a newer `app.js` that called a method on a missing element |
| Blurry question photos | Photos were re-rendered at 180 dpi / q82 instead of keeping the PDF's original 451×300 JPEGs |
| 123 questions had no photo | A hand-maintained partial lookup table (184 of 307 ids) |
| Practice screen did not fit one screen | Page-level scroll layout; only the buttons were made sticky |
| Mock-exam photo squeezed to 0px | Photo frame with `overflow:hidden` inside a fixed-height grid (min size resolves to 0) |
| Code edits silently failed to match | Bengali য় stored precomposed in one file, decomposed in another |
| Merge order got complicated | Several PRs stacked on each other |

## Prompt for the next app
```
Build a mobile-first PWA (plain HTML/CSS/JS, no framework unless I approve) for <APP PURPOSE>.
Audience: <USERS>, mainly on iPhone, also Android. UI language: <LANGUAGE>.

NON-NEGOTIABLE RULES (learned from a previous project):

1. Updates and caching
- Put a content hash in every asset filename (app.3f9a.js); never rely on ?v= query strings.
- index.html must be network-first; other assets cache-first.
- The service worker installs with cache:'reload', calls skipWaiting/clients.claim,
  and the page auto-reloads once on controllerchange (except during an exam or other unsaved work).
- Code must tolerate a stale HTML page: never call methods on an element that might be missing
  (use optional chaining or guards). Add a test that loads an older page with the newer script.

2. Data and images
- Keep original images byte-for-byte; never downscale or re-compress them.
- Verify counts up front (for example, 307 questions = 307 images = 307 answers) and
  keep that check in an automated test.
- Never hand-maintain partial lookup tables; derive mappings from the source.
- Normalize all text to Unicode NFC (Bengali য় and similar characters).

3. Layout
- Design one-screen views from day one; test on the smallest phone (iPhone SE 375x667)
  with the longest real content.
- Use 100dvh with fallbacks, env(safe-area-inset-*) and a fixed bottom control bar.
- Images use object-fit:contain. A photo inside a fixed-height flex/grid must not collapse
  (watch overflow:hidden; use grid-auto-rows:max-content or min-height).
- All font sizes in rem; text scales with iOS Text Size (font:-apple-system-body).
- Touch targets at least 44px; respect prefers-reduced-motion; works with VoiceOver.

4. Design
- Follow Apple HIG: system font, inset-grouped lists, one chevron per row, clear hierarchy.
- Agree a reference screenshot and design tokens (colors, type scale) BEFORE building.

5. Testing and process
- Playwright tests and GitHub Actions CI from the first commit.
- Every bug fix gets a test that fails before the fix and passes after.
- Test devices: iPhone SE, iPhone 13, iPhone 14 Pro Max, Pixel 5, plus landscape.
- Small PRs, merged one at a time; no PRs stacked on other PRs.
- Before merging a visible change: real iPhone check plus screenshots.
- Report the root cause of every bug, the files changed and the test results.

Start by proposing a plan and file structure, and wait for my approval before coding.
```
