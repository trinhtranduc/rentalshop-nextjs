/**
 * Filter admin sidebar / navigation items by user role.
 */

export interface AdminMenuItemLike {
  label: string;
  href: string;
  subItems?: AdminMenuItemLike[];
}

const BLOG_PREFIX = '/posts';
const MEDIA_PATH = '/media';
const SYSTEM_USERS_PATH = '/system-users';

function isBlogPath(href: string): boolean {
  return href === BLOG_PREFIX || href.startsWith(`${BLOG_PREFIX}/`) || href === MEDIA_PATH;
}

/**
 * ARTICLE role: blog CMS only (posts, categories, tags).
 * System Users (/system-users) is ADMIN-only.
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
    return items.filter((item) => !isBlogPath(item.href) && item.href !== '/request-logs' && item.href !== SYSTEM_USERS_PATH);
  }

  if (userRole === 'OUTLET_ADMIN') {
    return items.filter(
      (item) =>
        !isBlogPath(item.href) &&
        item.href !== '/request-logs' &&
        item.href !== '/subscriptions' &&
        item.href !== '/plans' &&
        item.href !== '/payments' &&
        item.href !== '/merchants' &&
        item.href !== SYSTEM_USERS_PATH
    );
  }

  if (userRole === 'OUTLET_STAFF' || userRole === 'OUTLET_MANAGER') {
    return items.filter(
      (item) =>
        !isBlogPath(item.href) &&
        item.href !== '/request-logs' &&
        item.href !== '/users' &&
        item.href !== '/subscriptions' &&
        item.href !== '/plans' &&
        item.href !== '/payments' &&
        item.href !== '/merchants' &&
        item.href !== SYSTEM_USERS_PATH
    );
  }

  return items;
}

export function isArticleOnlyAdminPath(pathname: string): boolean {
  if (pathname === '/login') return true;
  return isBlogPath(pathname); // Includes /posts/*, /media
}
