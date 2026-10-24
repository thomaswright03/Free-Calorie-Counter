// What the latest round of changes did, shown in Settings → Latest Update.
// Each round REPLACES this file's contents: the date, a summary of this
// round only, and this round's visible changes (6 at most). Earlier rounds
// are in the git history, not here. A unit test fails if the date is older
// than the newest commit that touched docs/, or the list grows past 6.

export const LATEST_UPDATE = {
  date: '2026-10-24',
  summary:
    'For someone new, our one-minute mission video now opens full screen by itself in the Home Screen walkthrough and plays with sound; Next appears when it ends.',
  /** What you can see in the app, listed first. */
  frontend: [
    'Walkthrough: tapping “Show me how” opens the mission video full screen, with sound and captions, and Next appears once it ends. On iPhone it plays in iPhone’s own full-screen player.',
    'Walkthrough: the “Our mission” step’s Next waits for the video. Once watched, the video doesn’t open by itself again, and its picture plays it again (Close or Escape puts it away).',
    'If the video can’t load (offline, say), the walkthrough says so and goes on without it.',
    'On a phone set to reduce motion the video waits for its play button instead of starting on its own.',
  ],
};
