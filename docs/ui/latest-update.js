// What the latest round of changes did, shown in Settings → Latest Update.
// Each round REPLACES this file's contents: the date, a summary of this
// round only, and this round's visible changes (6 at most). Earlier rounds
// are in the git history, not here. A unit test fails if the date is older
// than the newest commit that touched docs/, or the list grows past 6.

export const LATEST_UPDATE = {
  date: '2026-10-23',
  summary:
    'A new look. The whole app has been redesigned, with new colours, a new typeface and much more movement. Everything works the same way and nothing you logged changes.',
  /** What you can see in the app, listed first. */
  frontend: [
    'Dark mode is now a deep midnight blue lit by soft lime and violet light that drifts slowly behind the app. Light mode is warm paper with pastel light.',
    'Today’s total sits inside a ring that fills toward your daily goal, and sparks fly off it when the total changes.',
    'Each meal has its own colourful picture: a sunrise for breakfast, the sun for lunch, the moon for dinner and more for snacks.',
    'The tabs have icons, and the highlight springs from tab to tab.',
    'Graphs glow under their lines, and the line draws itself in when a graph first shows.',
    'The Home Screen walkthrough has the new look too. If your phone is set to reduce motion, nothing moves.',
  ],
};
