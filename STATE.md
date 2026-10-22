# Free Calorie Counter: STATE

Free, private calorie and weight tracker. Static installable web app (`docs/`,
GitHub Pages), vanilla JS bundled by esbuild, all data in localStorage and
IndexedDB on the user's device. No account, server, ads or analytics.

## Done (fix round 1, 2026-10-20, after Excellence grade 69)
- Daily calorie goal: Settings box (500–10,000, empty clears), Today "of N goal · X left/over",
  History and Compare show it, saved in backup `settings.dailyGoal`, old backups still import.
  Code: `docs/core/goal.js`, `docs/ui/goal.js`.
- Status page `#/admin` (`docs/ui/screen-admin.js`), `/admin/` redirects to it; real on-device checks,
  Important/Key/Basic, JSON shown in page. `/admin/status.json` documented as an exception (REFERENCE.md).
- Settings "Latest Update" card (`docs/ui/latest-update.js`); unit test fails if older than newest docs/ commit.
  Update it every round.
- Removed the hidden legacy-app migration and legacy backup id; README server.js paragraph removed.
- Tour renamed "Quick tour"; weight box says "Pounds only" (kg not supported; stated in the UI).

## Fix round 2 (2026-10-21, after grade 80)
- Status JSON uses lowercase tier/status/overall; overall = worst of Important rows only.
- Backup export check builds a test file from real days and reads it back (Down if not); Latest update folded into Build and version row.
- Storage rows renamed in plain words; dates shown as "Oct 21, 2026"; Settings has its own App status card.

## Fix round 3 (2026-10-21, after grade 85)
- Pages deploy gated on tests: `deploy` job in `.github/workflows/test.yml` needs `test` and `webkit`, push to main only;
  deploys once Settings → Pages → Source is GitHub Actions, until then logs a notice and the branch deploy continues.
- Latest Update now replaces each round (summary and list for the latest round only, 6 items at most, unit test enforces).
- Status page times show the device time zone ("Oct 21, 2026, 7:15 AM CDT"); a check that throws says
  "This check couldn’t run on this device. The browser said: …" instead of the error's type name.
- `docs/404.html` has favicon and apple-touch-icon links, resolved from the site base at any depth.

## Owner items (the "Needs you" list): status on main
- Operator and contact: DONE. Wright AI Solutions, thomas@wrightaisolutions.com, Arizona law, on
  `docs/privacy.html` and `docs/terms.html` (PR #2, merged 2026-10-21).
- Real-iPhone release checklist: DONE. Row dated 2026-10-21 in the RELEASE-CHECKLIST.md Record table
  (iPhone 14, iOS 18.7.2, commit 44f4ed8, all passed), added in cadcd00, after 3597dcf.
- `/admin/status.json` exception: APPROVED by the owner 2026-10-21 (REFERENCE.md, Status page section).
- Branch protection on `main` and Pages source "GitHub Actions": repository settings only the owner can change.

## Own address (2026-10-22, owner chose calories.wrightaisolutions.com)
- Old-address copy shows a "moving" backup card on Today (`docs/ui/new-address.js`, `backup-reminder.js`); owner steps in REFERENCE.md *Moving to the new address*.
- Red main fixed: modulepreload for build/app.js (the CSP meta stopped Chromium preloading it, +2 s on slow 3G); erase-all, problem-log (CSP blocks inline test script) and Latest Update e2e tests updated.

## Decisions
- Goal is a per-device pref (`fcc:dailyGoal`), not part of the entries blob.
- Units stay US-only (lbs); kg support not built.

## Checks
`npm run lint`, `typecheck`, `test:unit`, `npx playwright test --project=phone-app` all pass (Chromium).
WebKit job runs in CI only. Rebuild with `npm run build` after editing `docs/` (commits include `docs/build`).

## Open / next
- Real-iPhone run of RELEASE-CHECKLIST.md: done 2026-10-21 on iPhone 14, iOS 18.7.2, all passed (row in the Record table).
- Lawyer review: done and approved per the owner (2026-10-20); the owner says reviewer name and date are not needed (2026-10-21), so don't ask again. Contact email set; operator set to Wright AI Solutions (confirmed by the owner, 2026-10-21).
- `/admin/status.json` exception: approved by Thomas 2026-10-21 (REFERENCE.md).
- Optional: kg setting.
- Excellence fix round 1 (2026-10-22): status-page Warning wording, empty Today total shows 0, "Set a daily goal" link on Today. Still owner-only: Pages source → GitHub Actions; branch protection for admins.
- Excellence fix round 2 (2026-10-22): goal link 44px tap area, goal focus via flag in ui/goal.js (no timer), Latest Update rewritten, its unit test compares commit order. All 164 e2e + 88 unit pass in Chromium.
- Security fix round 1 (2026-10-22, grade 82): meta CSP on all 4 pages (unit test checks inline-script hashes, test/unit/security.test.js); Actions pinned to SHAs; SECURITY.md + .github/dependabot.yml; backup photo types allow-listed (no SVG); Settings "Delete all my data…" (store.eraseAll, test/e2e/erase-all.spec.js). Still owner-only: Pages source, admin bypass.
- Security fix round 2 (2026-10-22, grade 81): backup import sniffs photo bytes (core/backup-format.js) and stores the sniffed type; Latest Update mentions SHA pinning/Dependabot/SECURITY.md; shared-origin risk documented in SECURITY.md + REFERENCE.md. Unit fixtures use real image headers. Local env lacks eslint/playwright/fake-indexeddb deps, so only unit tests ran (all pass except store-local-photos, missing fake-indexeddb). Still owner-only: own origin (docs/CNAME), admin bypass on branch protection.
