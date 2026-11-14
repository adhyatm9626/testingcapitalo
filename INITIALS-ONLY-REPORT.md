# Initials-only entity marks — completion report

## Assumptions and limits

- The supplied project source remains the baseline. Existing market/reference datasets were not changed for this request.
- Capitalo wordmarks, home brand tile, and favicon are brand assets; these remain first-party and same-origin. All entity logos and public third-party image requests were removed.
- The local workspace has no deployed Netlify/Blobs access. Repository code no longer reads or writes entity logo data, but existing remote Blob objects and historical entries could not be inspected or purged here.

## Changes made

- Deleted the `assets/img/logos/` folder and manifest, logo fetch/asset/data functions, the Admin Logos/import interfaces and routes, logo-source data, build/import scripts, checklist/import reports, and the logo importer test. Removed the package script and logo/trademark copy.
- Simplified `EntityMark` to one deterministic initials tile for banks, foreign banks, corporate FDs, fund houses, ETFs, and stocks. The purple gradient hashes the full name. Gold, silver, bonds, government instruments, and Post Office retain the inline SVG marks in 44 px tiles.
- Updated FD, mutual-fund, ETF, stock, calculator, planner, island, compare, tools, and print surfaces to use `EntityMark`. Print keeps the Capitalo wordmark.
- Set CSP `img-src` to `'self' data:`. Added source-level checks for remote image URLs, the deleted entity asset path, and image creation in `EntityMark`.

## Removed files

- `assets/img/logos/` (including `manifest.json`)
- `assets/js/entity-mark.js`
- `admin/logo-manager.js`, `admin/logo-import.js`, `admin/logo-tools.js`
- `netlify/functions/logos.mjs`, `netlify/functions/asset.mjs`, `netlify/functions/logo-fetch.mjs`
- `data/logo-sources.json`, `data/logo-import-dev-report.json`
- `scripts/build-logos.mjs`, `scripts/build-logo-checklist.mjs`, `scripts/import-returnx-logos-once.mjs`, `scripts/resize-logo-once.py`
- `LOGO_CHECKLIST.csv`, `LOGO_IMPORT_REPORT.md`, `tests/logo-import.test.js`

## Verification

- `npm test`: 75 passed, 0 failed.
- `node --test tests/calculator-browser.test.js` with screenshot output enabled: 13 passed, 0 failed. This includes six calculator cases, row marks and no entity images, removed routes (404), no Admin Logos/import screens, and screenshot capture.
- `tests/marks.test.js`: all 33 supplied initials examples pass. Browser row checks cover expected initials for a stock (`ABB`), ETF (`NI`), and mutual fund (`HDFC`), plus exactly 44 px marks without row images.
- Captured 20 headless Chrome screenshots: FD list, Mutual funds arrival/results, Stocks list, and My total island, at 390 px and 1280 px in light and dark themes.

## Main changed files

`assets/js/ui.js`, `assets/css/app.css`, `assets/js/island.js`, `assets/js/island-core.js`, `assets/js/screens/fd.js`, `assets/js/screens/fd-detail.js`, `assets/js/screens/mf.js`, `assets/js/screens/mf-detail.js`, `assets/js/screens/etf.js`, `assets/js/screens/compare.js`, `assets/js/screens/sip.js`, `assets/js/screens/stocks.js`, `assets/js/screens/tools.js`, `assets/js/screens/planner.js`, `assets/js/catalogue.js`, `admin/index.html`, `admin/admin.css`, `admin/admin.js`, `netlify/functions/admin.mjs`, `netlify.toml`, `package.json`, `index.html`, `assets/js/strings.js`, `tests/calculator-browser.test.js`, `tests/marks.test.js`, `tests/strings.test.js`, and the pass/audit reports. The source archive contains all updated project files.
