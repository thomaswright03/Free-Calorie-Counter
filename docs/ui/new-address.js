// Free Calorie Counter is moving from thomaswright03.github.io to its own
// address, so no other site can share its browser storage. Data is kept per
// address and doesn't move by itself, so the copy at the old address asks
// people to save a backup to import at the new one (see backup-reminder.js).

export const NEW_ADDRESS = 'https://calories.wright-ai-solutions.com/';

/**
 * The new address when this copy runs at the old one, otherwise null.
 * @param {{ hostname: string }} [where]
 * @returns {URL | null}
 */
export function movingTo(where = location) {
  return /\.github\.io$/.test(where.hostname) ? new URL(NEW_ADDRESS) : null;
}
