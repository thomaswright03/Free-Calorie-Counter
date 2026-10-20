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

## Decisions
- Goal is a per-device pref (`fcc:dailyGoal`), not part of the entries blob.
- Units stay US-only (lbs); kg support not built.

## Checks
`npm run lint`, `typecheck`, `test:unit`, `npx playwright test --project=phone-app` all pass (Chromium).
WebKit job runs in CI only. Rebuild with `npm run build` after editing `docs/` (commits include `docs/build`).

## Open / next
- Real-iPhone run of RELEASE-CHECKLIST.md (Thomas); Record table is empty.
- Lawyer review: owner says done and approved (2026-10-20); reviewer name and review date still to record in REFERENCE.md → Legal. Contact email set; operator set to Wright AI Solutions (pending owner's confirmation).
- Thomas to approve the `/admin/status.json` exception (or ask for a CI-generated file).
- Optional: kg setting.
