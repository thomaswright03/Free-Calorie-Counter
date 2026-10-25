// What the latest round of changes did, shown in Settings → Latest Update.
// Each round REPLACES this file's contents: the date, a summary of this
// round only, and this round's visible changes (6 at most). Earlier rounds
// are in the git history, not here. A unit test fails if the date is older
// than the newest commit that touched docs/, or the list grows past 6.

export const LATEST_UPDATE = {
  date: '2026-10-25',
  summary: 'Backups saved before the app was renamed now import as they are.',
  /** What you can see in the app, listed first. */
  frontend: [
    'Import Backup: a backup file saved by the app under its earlier name now imports, with every day it holds, instead of being refused as another app’s file.',
  ],
};
