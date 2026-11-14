# Pass 4 — Item 1: calculators calculate

## Headless reproduction against the pre-fix source

Used Chrome headless with local data/API fixtures. This run was performed against the source ZIP from before Pass 4 changes.

| Type | What appeared on Calculate | Root cause |
|---|---|---|
| Mutual fund | Stayed on the results list; detail did not open; no console error | `pagedList` called row renderers without the row index. The row had `data-row-index="undefined"`, so the delegated Details action could not resolve the selected scheme. |
| ETF | Stayed on the ETF list; detail did not open; no console error | Same `pagedList` row-index loss prevented the delegated Calculate action from resolving its ETF. |
| IBJA gold | Stayed on the Gold list; no console error | Catalogue action is delegated through `pagedList`; row lookup failed because the renderer did not receive its index. |
| Silver | Stayed on the Silver list; no console error | Same catalogue row-index failure. |
| Bond / T-bill | Stayed on the Bonds list; no console error | Same catalogue row-index failure. |
| Stock | Reached the generic calculator; with amount, years, and return supplied, it calculated | The stock row used a direct handler and was not affected by the list delegation bug. The calculator started with no selected year and no return; the old generic validation hid results behind a broad missing-input message. |

## Changes

- `assets/js/ui.js` now passes the original row index to each paged-list renderer, restoring delegated item actions for mutual funds, ETFs, bullion, bonds, and other paged rows.
- `assets/js/screens/sip.js` now initializes five years (unless NAV history supplied a preferred 3/5/1-year period), shows year choices 1/3/5/10 and unselected example-return chips, recalculates on valid input changes, keeps Calculate as a fallback, lists exactly which inputs are missing, guards amounts above ₹100 crore, and keeps the chosen asset mark/name/source/date in the calculator header.
- ETF detail no longer silently turns an empty return into 0%; NAV history selects the first available 3/5/1-year return.
- Added an ETF type icon and the asset-header style. Cache-busted asset URLs were advanced to `2026-11-12p3`.
- Added `tests/calculator-browser.test.js`: six Chrome headless asset flows (fund, ETF, IBJA gold, silver, T-bill/bond, stock), live recalculation, fallback button, golden value checks, missing-field text, amount clamp, monthly schedule, and console-error checks.

## Verification

- `npm test`: **66 passed, 0 failed**.
- The six post-fix headless calculator flows passed using saved/local fixtures. Each shows three result numbers matching the one-time and monthly golden formulas, updates live when the return changes, and recalculates when Calculate is clicked.
- Live MFapi NAV history remains unverified. The headless tests use an isolated local fixture, not MFapi production data.
