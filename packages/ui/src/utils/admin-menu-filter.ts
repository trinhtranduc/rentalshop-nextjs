/**
 * Filter admin sidebar / navigation items by user role.
 */

export interface AdminMenuItemLike {
  label: string;
  href: string;
  subItems?: AdminMenuItemLike[];
}

const BLOG_PREFIX = '/posts';

function isBlogPath(href: string): boolean {
  return href === BLOG_PREFIX || href.startsWith(`${BLOG_PREFIX}/`);
}

/**
 * ARTICLE role: blog CMS only (posts, categories, tags).
 */
export function filterAdminMenuByRole<T extends AdminMenuItemLike>(
  items: T[],
  userRole?: string
): T[] {
  if (!userRole) return items;

  if (userRole === 'ARTICLE') {
    return items
      .filter((item) => item.href === BLOG_PREFIX)
      .map((item) => ({
        ...item,
        subItems: item.subItems?.filter((sub) => isBlogPath(sub.href)),
      }));
  }

  if (userRole === 'MERCHANT') {
    return items.filter((item) => !isBlogPath(item.href) && item.href !== '/request-logs');
  }

  if (userRole === 'OUTLET_ADMIN') {
    return items.filter(
      (item) =>
        !isBlogPath(item.href) &&
        item.href !== '/request-logs' &&
        item.href !== '/subscriptions' &&
        item.href !== '/plans' &&
        item.href !== '/payments' &&
        item.href !== '/merchants'
    );
  }

  if (userRole === 'OUTLET_STAFF') {
    return items.filter(
      (item) =>
        !isBlogPath(item.href) &&
        item.href !== '/request-logs' &&
        item.href !== '/users' &&
        item.href !== '/subscriptions' &&
        item.href !== '/plans' &&
        item.href !== '/payments' &&
        item.href !== '/merchants'
    );
  }

  return items;
}

export function isArticleOnlyAdminPath(pathname: string): boolean {
  if (pathname === '/login') return true;
  return isBlogPath(pathname);
}
