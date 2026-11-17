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

## Before finishing
- Run available tests and a headless browser check (Playwright/Chromium is preinstalled).
- Review `git diff` before completing work.
