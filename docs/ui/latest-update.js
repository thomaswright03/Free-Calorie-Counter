// What the latest round of changes did, shown in Settings → Latest Update.
// Each round REPLACES this file's contents: the date, a summary of this
// round only, and this round's visible changes (6 at most). Earlier rounds
// are in the git history, not here. A unit test fails if the date is older
// than the newest commit that touched docs/, or the list grows past 6.

export const LATEST_UPDATE = {
  date: '2026-10-22',
  summary:
    'This round is about keeping your data safe. You can now delete everything the app saved on your phone from Settings, and the app blocks scripts from anywhere else. Backups can only bring back real photos. Behind the scenes, the build tools are locked to exact versions, weekly update checks are on, and there is a security contact in SECURITY.md.',
  /** What you can see in the app, listed first. */
  frontend: [
    'Settings: a new “Delete all my data…” button removes every day, goal, setting and photo from this browser, after you confirm.',
    'Restoring a backup now only accepts photos in common image types (JPEG, PNG, WebP, GIF, HEIC); other files, or files whose contents aren’t really an image, are rejected.',
  ],
};
