// What the latest round of changes did, shown in Settings → Latest Update.
// Each round REPLACES this file's contents: the date, a summary of this
// round only, and this round's visible changes (6 at most). Earlier rounds
// are in the git history, not here. A unit test fails if the date is older
// than the newest commit that touched docs/, or the list grows past 6.

export const LATEST_UPDATE = {
  date: '2026-10-23',
  summary:
    'The Home Screen walkthrough’s “Our mission” step now has our one-minute video: why Free Calorie Counter is free, why nothing you log leaves your phone, and a tour of what it does.',
  /** What you can see in the app, listed first. */
  frontend: [
    'The “Our mission” step of the Home Screen walkthrough shows the mission video. Tap its picture to watch it, with sound and captions; Close or Escape puts it away.',
    'On a phone set to reduce motion the video waits for its play control instead of starting on its own.',
  ],
};
