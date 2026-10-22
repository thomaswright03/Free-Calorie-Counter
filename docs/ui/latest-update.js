// What the latest round of changes did, shown in Settings → Latest Update.
// Each round REPLACES this file's contents: the date, a summary of this
// round only, and this round's visible changes (6 at most). Earlier rounds
// are in the git history, not here. A unit test fails if the date is older
// than the newest commit that touched docs/, or the list grows past 6.

export const LATEST_UPDATE = {
  date: '2026-10-22',
  summary:
    'This round tidied Today and the App status page. Today now shows 0 for a day with nothing logged, and offers a Set a daily goal link when you have no goal yet. The status page explains its warnings more clearly. The link is now big enough to tap easily, and it reliably puts the cursor in the goal field.',
  /** What you can see in the app, listed first. */
  frontend: [
    'Today: a “Set a daily goal” link appears under the total when no goal is set. It opens Settings with the goal field ready to type in.',
    'The “Set a daily goal” link has a large tap area (at least 44 by 44 pixels), so it is easy to hit on a phone.',
    'Today: a day with nothing logged now shows 0 instead of a dash.',
    'Settings › App status: the “Offline cache” and “Storage persistence” warnings now say plainly what is wrong and what it means.',
  ],
};
