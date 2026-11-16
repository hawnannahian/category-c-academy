# Category C Academy — GitHub Pages

Static Bengali/Portuguese PWA for Category C study in Portugal. No paid plan, backend, login or external library is required.

## Publish
1. Create a **new public repository** named `category-c-academy` in GitHub. Do not use/overwrite your existing `driving-log-pro` repository.
2. Upload the *contents* of this folder to the repository root (so `index.html` is at root).
3. In Settings → Pages, select **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save.
4. Wait for the Pages deployment. Expected URL: `https://hawnannahian.github.io/category-c-academy/`.

## Features
- All 307 question blocks extracted from the 2026 study guide, with proposed answer text where present.
- Chapter filtering, search, reveal-answer study and random-access sequential practice.
- Vocabulary pages (book pages 26–35) searchable as source text.
- Local-device progress using browser storage.
- Installable PWA and offline cache after first successful visit.

## QA / important limitations
- The 307 extracted question blocks should be visually proofread against the original PDF before public launch. PDF text extraction can split accents, ligatures and line breaks.
- Vocabulary pages are included as searchable page text, not yet normalized into 133 individual flashcards.
- The quiz is a self-study reveal-answer mode, not a validated auto-scored multiple-choice test; source answer keys are the author's proposed answers, not official IMT keys.
- Images/diagrams from the PDF are not extracted into this first static release.
- This is not an official IMT publication or approved application. Verify current laws and official exam rules with IMT.
- The PDF identifies third-party question/image sources. Publish those source elements only within the scope of the rights/permissions you confirmed.

## Local preview
Open `index.html` through a local static server (service worker/PWA needs localhost or HTTPS). GitHub Pages supplies HTTPS automatically.
