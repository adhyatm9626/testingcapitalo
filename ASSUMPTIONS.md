# Initials-only assumptions

- The `capitalo-complete-source.zip` project remains the app baseline; supplied FD, gold/silver, bond, ETF, mutual-fund and Nifty 100 data remain unchanged.
- Company entities use initials tiles computed from the full displayed issuer or fund house name. NAV data does not include logo files.
- The Capitalo wordmark, home brand tile and favicon are brand assets and remain. Entity images, third-party image sources, and logo administration have been removed.
- Browser tests use local fixtures. They verify the UI and 404 behavior but do not query deployed Netlify Blobs. Existing remote Blob state cannot be inspected or purged from this workspace.
- Requested screenshots are headless Chrome captures at 390 px and 1280 px, in light and dark themes.
