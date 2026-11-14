# QA report — initials-only pass

## Automated checks

- `npm test`: see `INITIALS-ONLY-REPORT.md` for the final current run.
- Headless browser checks cover initials on the stock, ETF and mutual-fund rows, no images in public list rows, the removed endpoint 404s, and absence of logo admin screens.
- `tests/marks.test.js` checks the supplied initials golden table and rejects the removed entity image system in app code, data and pages.

## Visual checks

The requested FD list, Mutual funds results, Stocks list, and My total island captures are generated at 390 px and 1280 px in both themes in `outputs/initials-only-screenshots`.

## Unverified

- Deployed Netlify Blob documents and historical admin entries could not be inspected or removed from this local workspace. The repository no longer reads or writes entity logo data.
- Live MFapi, deployed Netlify, Gemini, native sharing, and browser print preview were not checked.
