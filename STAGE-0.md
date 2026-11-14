# Stage 0 — audit and critical fixes

**Status: Core critical fixes implemented; integrated live verification remains partial.**

Fixed the admin GET guard that rejected same-origin requests without an Origin header; repaired the home CTA scroll; made amount and contribution mode shared; retained exact one-step steppers; connected ETF calculate routes; bounded data requests with timeouts and retry states; replaced the short MF search path with browse filters and paging; published the team-approved stocks names list by default with an admin setting; and removed REITs from the app and data.

The 58-test suite passes. MFapi live list size, ETF matches, and deployed admin/data behavior could not be verified in this environment. See `QA-REPORT.md` for evidence and remaining checks.
