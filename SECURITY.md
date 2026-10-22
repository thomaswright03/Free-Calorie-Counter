# Security

Free Calorie Counter keeps all data on the user's own device and has no server or accounts.
To report a vulnerability, email thomas@wrightaisolutions.com with the details. Please don't open a public issue for it.

## Own web origin

Since 2026-10-22 the app is served from `https://calories.wright-ai-solutions.com/`, an origin of its own, so no other site can read its `localStorage` or IndexedDB. The old address, `thomaswright03.github.io/Free-Calorie-Counter/`, redirects there. Data saved at the old address stays with it, so the copy there asked people to save a backup to import at the new one (`docs/ui/new-address.js`).

GitHub Pages cannot send `frame-ancestors`, `X-Frame-Options` or `X-Content-Type-Options`; the CSP is set by `<meta>`. A header-capable host (also an origin move) fixes this.
