/**
 * The six groups of the admin side menu (#815). Pure (no icons), so it can be tested without React.
 * The role filter runs on the menu items first; the groups only decide how the result is laid out.
 */
export const NAV_GROUPS = ['Overview', 'Merchants & Plans', 'Shop data', 'Content', 'Growth', 'System'] as const;
export type NavGroup = (typeof NAV_GROUPS)[number];

/** Items in group order; a group with no visible item (after the role filter) is dropped. */
export function groupNavItems<T extends { group?: NavGroup }>(items: T[]): { label: NavGroup; items: T[] }[] {
  return NAV_GROUPS.map((label) => ({ label, items: items.filter((item) => item.group === label) })).filter((g) => g.items.length > 0);
}
