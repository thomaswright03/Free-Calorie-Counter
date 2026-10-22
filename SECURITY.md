# Security

Free Calorie Counter keeps all data on the user's own device and has no server or accounts.
To report a vulnerability, email thomas@wrightaisolutions.com with the details. Please don't open a public issue for it.

## Known risk: shared web origin

The app is served from `https://thomaswright03.github.io/Free-Calorie-Counter/`. Browser storage is scoped to the origin, not the path, so any other Pages site on the same account (currently `/Kenna/`) can read this app's `localStorage` and IndexedDB. Until the app has its own origin (a custom domain via `docs/CNAME`, which needs the owner's DNS): do not add other Pages sites or scripts to this account. Moving origins strands local data, so the move must ship with a "back up, then restore on the new address" notice.

GitHub Pages cannot send `frame-ancestors`, `X-Frame-Options` or `X-Content-Type-Options`; the CSP is set by `<meta>`. A header-capable host (also an origin move) fixes this.
