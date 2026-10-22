# Security

Free Calorie Counter keeps all data on the user's own device and has no server or accounts.
To report a vulnerability, email thomas@wrightaisolutions.com with the details. Please don't open a public issue for it.

## Known risk: shared web origin

The app is served from `https://thomaswright03.github.io/Free-Calorie-Counter/`. Browser storage is scoped to the origin, not the path, so any other Pages site on the same account (one other is live today) can read this app's `localStorage` and IndexedDB.

**Decision (owner, 2026-10-22): move to `https://calories.wright-ai-solutions.com/`.** Storage doesn't follow a move, so the copy at the old address (`docs/ui/new-address.js`) asks anyone with saved data to save a backup to import at the new address, before the move. The move itself is two owner steps (REFERENCE.md, *Moving to the new address*): a DNS record, then the custom domain in Settings → Pages, after which GitHub redirects the old address to the new one. Until then, don't add other Pages sites or scripts to this account.

GitHub Pages cannot send `frame-ancestors`, `X-Frame-Options` or `X-Content-Type-Options`; the CSP is set by `<meta>`. A header-capable host (also an origin move) fixes this.
