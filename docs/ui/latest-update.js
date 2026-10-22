// What the latest round of changes did, shown in Settings → Latest Update.
// Each round REPLACES this file's contents: the date, a summary of this
// round only, and this round's visible changes (6 at most). Earlier rounds
// are in the git history, not here. A unit test fails if the date is older
// than the newest commit that touched docs/, or the list grows past 6.

export const LATEST_UPDATE = {
  date: '2026-10-22',
  summary:
    'Each meal and snack can now be logged one food at a time, and Free Calorie Counter adds them up for you. Typing the meal’s total yourself works just as before, and everything you logged earlier is unchanged. Dark is now the default theme, and new phone users are walked through adding the app to their Home Screen first.',
  /** What you can see in the app, listed first. */
  frontend: [
    'New on a phone: an animated walkthrough, with our mission, shows you how to add Free Calorie Counter to your Home Screen (where your days are kept) before you start, on iPhone and Android.',
    'Log Meal: pick “Food by food” to add each food (a name if you like, and its calories); the meal’s total is the sum, shown as you go. “Type the total” is still there, and typing a total replaces that meal’s foods.',
    'Each food has a remove button, with Undo for a few seconds; a food typed but not added yet is added when you tap Save and close.',
    'Today: a meal logged food by food lists its foods under its total.',
    'Backups include each meal’s foods, and backups made before this still import.',
    'The app is now dark until you pick a theme. Light and System are still in Settings → Appearance, and a theme you already picked is kept.',
  ],
};
