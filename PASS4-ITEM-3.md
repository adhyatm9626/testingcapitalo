# Pass 4 — Item 3: fund browsing and stocks layout

## Root cause

The mutual-fund screen rendered the entire scheme set on arrival and did not provide category-based browsing. The stock screen used a plain list with duplicate page/section headings and a long row of industry chips. Loading feedback was text-first rather than a skeleton.

## Changes

- Rebuilt the mutual-fund page around the requested primary and secondary category cards, ten fund-house tiles, searchable all-houses sheet, and one Direct/Growth summary filter sheet.
- Results now wait for a category, fund house, or search; filters are shown as removable breadcrumbs; results are A–Z and paged at 25. ETFs are excluded unless search explicitly targets them.
- Added case-insensitive scheme-name category inference and exposed MFapi `scheme_category` on scheme detail where available.
- Reworked Stocks into marked, compact rows with Nifty group pills and one searchable Industries sheet. Removed the duplicate heading and replaced the loading flash with a skeleton.
- Added responsive styling and browser tests for arrival, category/house filtering, breadcrumb removal, ETF search, and stock rows.

## Verification

- `npm test`: 72 passed, 0 failed.
- Headless Chrome checked mutual-fund arrival and filtering and the Stocks row layout.
- No external MFapi session was used; test data is a deterministic local fixture.

## Files changed

`assets/css/app.css`, `assets/js/strings.js`, `assets/js/screens/mf.js`, `assets/js/screens/mf-detail.js`, `assets/js/screens/stocks.js`, `assets/js/router.js`, `netlify/functions/mf-query.mjs`, `tests/calculator-browser.test.js`, `tests/mf-browse.test.js`.
