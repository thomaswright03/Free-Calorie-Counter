// What the latest round of changes did, shown in Settings → Latest Update.
// Each round REPLACES this file's contents: the date, a summary of this
// round only, and this round's visible changes (6 at most). Earlier rounds
// are in the git history, not here. A unit test fails if the date is older
// than the newest commit that touched docs/, or the list grows past 6.

export const LATEST_UPDATE = {
  date: '2026-10-21',
  summary:
    'This round made the Status page easier to read and made releases safer. Times on the Status page now show your time zone, a check that can’t run says so in a plain sentence, the “Page not found” page shows the app’s icon, and a new version of the app only goes live after all of its tests pass.',
  /** What you can see in the app, listed first. */
  frontend: [
    'Status page times now include your time zone, like “Oct 21, 2026, 7:15 AM CDT”.',
    'If a Status page check can’t run, it says “This check couldn’t run on this device” and gives the browser’s reason, instead of a code name.',
    'The “Page not found” page shows the Free Calorie Counter icon in the browser tab.',
    'New versions go live only after every test has passed, so a broken change can’t reach your phone.',
  ],
};
