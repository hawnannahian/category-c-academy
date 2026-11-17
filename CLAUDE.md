# Category C Academy — development rules

Installable PWA in plain HTML/CSS/JS: `index.html`, `app.js`, `app.css`, `sw.js`, `manifest.webmanifest`, content in `*.json`. Not a native app: do not convert to SwiftUI.

## Architecture
- Preserve the existing PWA architecture and the HTML/CSS/JS structure.
- Reuse existing components and functionality before writing new ones.
- No new dependencies unless unavoidable.
- Never alter learning content or JSON data (`chapters`, `questions`, `vocab`, `book-text`) unless asked.
- Keep offline mode working: when adding or renaming assets, update `sw.js` caching and bump its cache version.
- No unrelated refactors or redesigns; touch only files the task needs.

## Design & accessibility
- Premium Apple-inspired iOS look: system font stack, clean hierarchy, native-feeling controls.
- Responsive for iPhone and iPad, portrait and landscape.
- Respect safe areas (`env(safe-area-inset-*)`) and minimum 44px touch targets.
- Semantic HTML, real `<button>`/`<a>` controls, labels/ARIA where needed; must work with VoiceOver.
- Text scales with user settings (rem units); honour `prefers-reduced-motion`.

## Tooling
- **Ponytail**: development workflow, code review and safe implementation practices.
- **UI UX Pro Max**: only when UI/UX work is requested. Follow Apple HIG and accessibility principles, use only guidance compatible with this architecture; no React, Tailwind, shadcn/ui or new dependencies unless explicitly approved.
- **Graphify**: use only if installed and available; never assume it exists or make workflows depend on it.
- Never claim a skill is active unless it was actually invoked; report which tools were used in each implementation.

## Lessons learned (see docs/app-building-lessons.md)
- New elements are accessed null-safely: an older cached `index.html` can meet a newer `app.js` (GitHub Pages ignores `?v=`).
- Keep original photos byte-for-byte; every question must have its photo (checked by `tools/check-questions.js`).
- A photo frame with `overflow:hidden` inside a fixed-height flex/grid can collapse to 0px; give rows/items an explicit minimum.
- Match Bengali text by structure, not literal strings: files mix precomposed and decomposed য়.
- Every bug fix gets a test that fails before and passes after; prefer small, unstacked PRs.
- When the user asks for a prompt for a new app, start from the prompt in `docs/app-building-lessons.md`.

## Before finishing
- Run available tests and a headless browser check (Playwright/Chromium is preinstalled).
- Review `git diff` before completing work.
