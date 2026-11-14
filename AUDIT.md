# Capitalo completion audit — 12 Nov 2026

## C0–C12 status

| Section | Status | Evidence and limits |
|---|---|---|
| C0 Audit and critical fixes | Done | Baseline recorded in `QA-REPORT.md`; regressions covered by tests below. |
| C1 Product and hard rules | Partial | Exact disclaimer, credit, English copy, no third-party logo hotlinks, and no live market feeds. Some manual catalogue values and provider freshness cannot be independently verified here. |
| C2 Stack and deployment | Done | Static HTML/CSS/ES modules and Netlify Functions; `@netlify/blobs` is the only declared dependency. Deployment and Blobs persistence were not exercised. |
| C3 Brand and fonts | Partial | Supplied local Capitalo brand assets and SF Pro files remain. Entity names use deterministic initials; entity logo assets and runtime requests were removed. Font web-hosting rights were not verified. |
| C4 Design system | Partial | Tokenized responsive styles and two permitted blur surfaces are covered by static checks. Only a phone-sized home view was visually inspected; full breakpoint, theme, and motion checks were not completed. |
| C5 App shell and navigation | Partial | Hash routes, shared amount/mode, home links and hero scroll exist. The home scroll was inspected in a local browser; other screen focus/layout behavior was not comprehensively checked. |
| C6 Calculators and My total | Done | SIP, one-time, FD and recurring-deposit formulas have golden tests. My total has add/update/remove/undo/persistence/horizon/rounding tests. |
| C7 Data and sources | Partial | Supplied FD seed and Nifty 100 CSV are preserved; stocks publish by default with a setting to turn them off. MFapi full-list live fetch/count and ETF scheme/NAV matches were not verified. Manual snapshots remain reference data. |
| C8 Admin | Partial | Modern function guards, login/session, schema, history, GET-without-Origin, site settings control and data counts are covered by unit tests. Entity logo routes and screens were removed. Deployed Blobs publish/rollback flows were not browser-tested. |
| C9 Ask Capitalo | Partial | Existing assistant guardrails and UI disclosure remain. No configured Gemini request was made. |
| C10 Share, print, footer | Partial | Share hash, print output, exact disclaimer and credit are implemented. Entity logo trademark copy was removed with entity imagery. Browser print preview and native share were not exercised. |
| C11 Removed features | Done | REIT feature/data removed from public app source, data, and strings. No price, index, FX, or metal feed was added. `sw.js` remains a one-purpose cleanup worker. |
| C12 Lessons learned | Done | Regression tests cover the earlier auth, routing, shared state, stepper, MF browse, timeout, data and layout issues listed in the supplied brief. |

## Source evidence

- Supplied `capitalo-fd-seed.json` and bundled `data/fd-banks.json` have the same SHA-256: `B839A3AF27A274B245B7EE33D8ACBE8D853F442779E2B14A81E74869CFFB3531`.
- Bundled `data/stocks-list.csv` matches the supplied `ind_nifty100list.csv` byte-for-byte (SHA-256 `0A53AD14C15E9EC258DC72117A8C0699546EC25F2D283C47D53412E2DE8A06FC`). It has 100 constituents with the expected columns.
- `data/providers.json` records the Nifty list as confirmed by the Capitalo team; this does not assert that NSE terms were independently verified.
- The MFapi live endpoint could not be reached from this environment. Filter/paging behavior is tested against synthetic response data; the final scheme count and fetch time are therefore unknown.
- ETF catalog matches are not confirmed against MFapi. Use `data/etf-catalogue.json` for the current recorded match status; no NAV result should be treated as independently validated by this audit.
- Capitalo wordmarks and favicon are retained as same-origin brand assets; the entity image directory and manifest are deleted.

See `QA-REPORT.md` for checks run and `STAGE-0.md` through `STAGE-D.md` for the stage summaries.
