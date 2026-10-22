// What the latest round of changes did, shown in Settings → Latest Update.
// Each round REPLACES this file's contents: the date, a summary of this
// round only, and this round's visible changes (6 at most). Earlier rounds
// are in the git history, not here. A unit test fails if the date is older
// than the newest commit that touched docs/, or the list grows past 6.

export const LATEST_UPDATE = {
  date: '2026-10-22',
  summary:
    'This round is about keeping your data safe. Free Calorie Counter is moving to its own address, calories.wright-ai-solutions.com, so no other website can share its storage on your phone; Today asks you to save a backup to bring with you. You can now delete everything the app saved from Settings, the app blocks scripts from anywhere else, backups only bring back real photos, the app opens about two seconds sooner on a slow connection, and dark is now the default theme.',
  /** What you can see in the app, listed first. */
  frontend: [
    'Today: “Free Calorie Counter is moving to calories.wright-ai-solutions.com” asks you to save a backup, which you then import at the new address (Settings → Import Backup).',
    'Settings: a new “Delete all my data…” button removes every day, goal, setting and photo from this browser, after you confirm.',
    'Restoring a backup now only accepts photos in common image types (JPEG, PNG, WebP, GIF, HEIC); other files, or files whose contents aren’t really an image, are rejected.',
    'The first visit on a slow connection opens about two seconds sooner.',
    'The app is now dark until you pick a theme. Light and System are still in Settings → Appearance, and a theme you already picked is kept.',
  ],
};
