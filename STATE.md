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
- Real-iPhone run of RELEASE-CHECKLIST.md: done 2026-10-21 on iPhone 14, iOS 18.7.2, all passed (row in the Record table).
- Lawyer review: done and approved per the owner (2026-10-20); the owner says reviewer name and date are not needed (2026-10-21), so don't ask again. Contact email set; operator set to Wright AI Solutions (confirmed by the owner, 2026-10-21).
- `/admin/status.json` exception: approved by Thomas 2026-10-21 (REFERENCE.md).
- Optional: kg setting.
