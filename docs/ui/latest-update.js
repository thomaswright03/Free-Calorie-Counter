// What the latest round of changes did, shown in Settings → Latest Update.
// Update this file with every round: a unit test fails if its date is older
// than the newest commit that touched docs/.

export const LATEST_UPDATE = {
  date: '2026-10-20',
  summary:
    'You can now set a daily calorie goal and see how much of it is left. There is a Status page that checks the app is working on this device, the tour is now called the Quick tour, the weight box says pounds only, and the app no longer carries code for an older private app. The apple trend icon and favicon arrived in the round before.',
  /** What you can see in the app, listed first. */
  frontend: [
    'Settings has a new Daily calorie goal box. Leave it empty to turn the goal off.',
    'Today shows your calories as “of 2,000 goal · 500 left” (or “over”). History and Compare show each day against the goal.',
    'The goal is saved in backup files and comes back when you restore one. Older backups without a goal still restore.',
    'New Status page (Settings → App status): checks saving, photos, backup, offline use and storage, and shows Warning or Down if something is wrong.',
    'Settings has a Latest Update section (this one).',
    '“What’s new” is now the “Quick tour”, with wording that suits someone using the app for the first time.',
    'The weight box says “Pounds only”.',
    'The app icon and browser tab icon are the new apple trend logo.',
    'Settings → Free and private links to the new Privacy policy and Terms of service.',
  ],
};
