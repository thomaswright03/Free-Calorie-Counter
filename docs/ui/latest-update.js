// What the latest round of changes did, shown in Settings → Latest Update.
// Each round REPLACES this file's contents: the date, a summary of this
// round only, and this round's visible changes (6 at most). Earlier rounds
// are in the git history, not here. A unit test fails if the date is older
// than the newest commit that touched docs/, or the list grows past 6.

export const LATEST_UPDATE = {
  date: '2026-10-22',
  summary:
    'This round brought the app to life with animations. Screens glide in from the side you tapped toward, numbers count up, graphs draw themselves, and buttons, messages and windows move smoothly. If your phone is set to Reduce Motion, all of it stays still.',
  /** What you can see in the app, listed first. */
  frontend: [
    'Screens slide in from the direction of the tab you tapped, with their cards arriving one after another, and the green highlight glides between tabs.',
    'Today’s calorie total counts up, a new bar under it fills toward your daily goal, and a meal you change or remove flashes so you can see what moved.',
    'Graphs draw their line from left to right and the dots land on it, and Compare’s bars grow into place.',
    'Buttons press in when tapped, messages slide up and fade away, windows and the photo viewer rise into view, and switching between light and dark fades smoothly.',
    'The What’s new tour fades in, its card springs between stops, and the highlight around each feature gently pulses.',
    'With Reduce Motion turned on (Settings › Accessibility › Motion on iPhone), none of this moves.',
  ],
};
