// What the latest round of changes did, shown in Settings → Latest Update.
// Each round REPLACES this file's contents: the date, a summary of this
// round only, and this round's visible changes (6 at most). Earlier rounds
// are in the git history, not here. A unit test fails if the date is older
// than the newest commit that touched docs/, or the list grows past 6.

export const LATEST_UPDATE = {
  date: '2026-10-22',
  summary:
    'Security tightening. Backups larger than 200 MB are now refused with a message, and opening the app over a plain http address now sends you to the secure https address. Nothing you logged changes.',
  /** What you can see in the app, listed first. */
  frontend: [
    'Importing a backup larger than 200 MB is refused with a clear message instead of freezing the phone.',
    'Opening the app at an http:// address now moves you to the secure https:// address.',
    'If another website tries to show the app inside its own page, you now get a link to open it on its own instead.',
  ],
};
