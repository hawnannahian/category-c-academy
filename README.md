# Category C Academy — GitHub Pages

Static Bengali/Portuguese PWA for Category C study in Portugal. No paid plan, backend, login, external library or web font is required.

## Publish
1. Create a **new public repository** named `category-c-academy` in GitHub. Do not use/overwrite your existing `driving-log-pro` repository.
2. Upload the *contents* of this folder to the repository root (so `index.html` is at root).
3. In Settings → Pages, select **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save.
4. Wait for the Pages deployment. Expected URL: `https://hawnannahian.github.io/category-c-academy/`.

## Features
- All 307 question blocks extracted from the 2026 study guide, with proposed answer text where present.
- Chapter filtering, search, reveal-answer study and sequential practice.
- Timed mock exam: 20 random questions, 25 minutes, scored review.
- Wrong-answer review: questions answered wrongly (practice, study or exam) are collected on the Learn tab until answered correctly.
- 133 vocabulary cards (book pages 26–35) with search, topic filter and learned/unlearned tracking.
- 184 question photos, pre-cropped from the PDF into `photos/`.
- Local-device progress using browser storage.
- Installable PWA; app shell works offline after the first visit, and each photo is available offline once viewed.
- Text follows the iOS Text Size setting; VoiceOver-friendly controls.

## Maintenance
- `node tools/check-questions.js` — checks all questions parse with a valid answer and every photo exists.
- `python3 tools/extract-photos.py` — regenerates `photos/` from the PDF (needs poppler's `pdftoppm`).
- After changing any asset, bump the `?v=` query in `index.html` and `CACHE` in `sw.js`.

## Running tests
- `node tools/check-questions.js` runs on every pull request (GitHub Actions, `.github/workflows/check.yml`).
- Browser tests need Playwright with Chromium installed locally (there is no `package.json`): `node tests/run.js` runs all suites, or name some, e.g. `node tests/run.js photos wrong-answers`. They start their own local server on port 8765 (`PORT` to change).

## QA / important limitations
- The 307 extracted question blocks should be visually proofread against the original PDF before public launch. PDF text extraction can split accents, ligatures and line breaks.
- The quiz is a self-study reveal-answer mode, not a validated auto-scored multiple-choice test; source answer keys are the author's proposed answers, not official IMT keys.
- Only the photo beside each question is extracted; other diagrams in the PDF are not.
- This is not an official IMT publication or approved application. Verify current laws and official exam rules with IMT.
- The PDF identifies third-party question/image sources. Publish those source elements only within the scope of the rights/permissions you confirmed.

## Local preview
Open `index.html` through a local static server (service worker/PWA needs localhost or HTTPS). GitHub Pages supplies HTTPS automatically.
