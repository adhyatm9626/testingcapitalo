# Capitalo

Capitalo is an educational investment calculator for Indian users. It uses static HTML, CSS, ES modules, and Netlify Functions. The public site has no visitor accounts, analytics, tracking, or live market-price feeds.

## Deploy

Deploy the project folder to Netlify. There is no build step. Configure the environment variables listed by name in `.env.example`. `@netlify/blobs` is the only declared dependency.

## Project layout

- `index.html`: public shell and hash-route entry point.
- `assets/css/app.css`: Capitalo Lite responsive styles.
- `assets/js/strings.js`: bundled English UI copy.
- `assets/js/router.js`: hash navigation and lazy screen loading.
- `assets/js/screens/`: screen modules loaded when a route opens.
- `assets/img/` and `assets/fonts/`: supplied brand assets and bundled fonts.
- `data/`: bundled manual data and provider registry.
- `netlify/functions/`: modern Request/Response Netlify Functions.
- `admin/`: unlinked admin interface.
- `tests/`: Node test suite.

## Data notes

Manual FD, bullion, and catalogue snapshots are reference data until an editor verifies and dates them. MFapi.in is proxied through `/api/mf/*` unless `MFAPI_DISABLED=true`; live full-list access was not verified for this handoff. The Nifty 100 names list is recorded as permitted by the Capitalo team and is names-only. No prices, index values, FX rates, or live metals feeds are connected.

`sw.js` only clears old caches and unregisters itself; it does not provide offline support.

## Reports

See `AUDIT.md`, `QA-REPORT.md`, and `STAGE-0.md` through `STAGE-D.md` for status, evidence, and known gaps.
