/**
 * Top-bar breadcrumb (#960), built from the shell nav model so pages need no code of their own:
 * menu item › active sub-item › the rest of the path (known words get a label, anything else is an id `#…`).
 */
import { SHELL_NAV_ITEMS, activeNavChild, isNavActive } from './nav';

export interface Crumb {
  /** Key in the `common` namespace; when absent, `label` is shown as is (ids). */
  labelKey?: string;
  label?: string;
  /** Link target; the last crumb (the current page) has none. */
  href?: string;
}

/** Signed-in pages that are not in the menu. */
const OTHER_ROOTS: Array<{ href: string; labelKey: string }> = [
  { href: '/notifications', labelKey: 'shell.crumbs.notifications' },
  { href: '/subscription', labelKey: 'shell.crumbs.subscription' },
  { href: '/plans', labelKey: 'shell.crumbs.plans' },
];

/** Path words with a label of their own (`shell.crumbs.<value>`). */
const WORDS: Record<string, string> = {
  create: 'create',
  add: 'add',
  edit: 'edit',
  import: 'import',
  labels: 'labels',
  orders: 'orders',
  permissions: 'permissions',
  'role-permissions': 'rolePermissions',
  related: 'related',
  'bank-accounts': 'bankAccounts',
  attendance: 'attendance',
};

/** Parents whose `/{id}` has no page of its own (only children like `/outlets/5/bank-accounts`). */
const ID_WITHOUT_PAGE = ['/outlets'];

function cleanPath(pathname: string | null | undefined): string {
  if (!pathname) return '';
  const path = pathname.split(/[?#]/)[0];
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function buildBreadcrumb(pathname: string | null | undefined): Crumb[] {
  const path = cleanPath(pathname);
  if (!path) return [];

  const item = SHELL_NAV_ITEMS.find((i) => isNavActive(path, i.href));
  const root = item
    ? { href: item.href, labelKey: `shell.nav.${item.key}` }
    : OTHER_ROOTS.find((r) => isNavActive(path, r.href));
  if (!root) return [];

  const crumbs: Crumb[] = [{ labelKey: root.labelKey, href: root.href }];
  let base = root.href;

  const child = item ? activeNavChild(item, path) : undefined;
  if (item && child) {
    crumbs.push({ labelKey: `shell.nav.${item.key}Sub.${child.key}`, href: child.href });
    base = child.href;
  }

  for (const segment of path.slice(base.length).split('/').filter(Boolean)) {
    const parent = base;
    base = `${base}/${segment}`;
    const word = WORDS[segment];
    crumbs.push(
      word
        ? { labelKey: `shell.crumbs.${word}`, href: base }
        : { label: `#${decode(segment)}`, href: ID_WITHOUT_PAGE.includes(parent) ? undefined : base },
    );
  }

  // The current page is never a link.
  const last = crumbs[crumbs.length - 1];
  crumbs[crumbs.length - 1] = { ...last, href: undefined };
  return crumbs;
}

interface KeyLike {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  target?: { tagName?: string; isContentEditable?: boolean } | null;
}

/** "/" opens search, unless the user is typing in a field or holds a modifier. */
export function isSearchShortcut(e: KeyLike): boolean {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return false;
  const el = e.target;
  if (!el) return true;
  return !el.isContentEditable && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName || '');
}
