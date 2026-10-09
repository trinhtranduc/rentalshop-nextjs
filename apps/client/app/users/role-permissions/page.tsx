'use client';

/**
 * Quyền theo vai trò (#542): read-only default permissions of Quản lý chi nhánh and Nhân viên, from
 * ROLE_PERMISSIONS (as the shared PermissionRoleView did). The extra per-staff permissions page is hidden from the menus.
 */
import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ROLE_PERMISSIONS } from '@rentalshop/auth';
import { useAuth } from '@rentalshop/hooks';
import { ShellIcon } from '../../components/shell/Icon';
import { cardClass, type T } from '../../orders/list/parts';
import { VIEWABLE_ROLES, canManagePermissions, permissionLabelKey, roleGrants, type ViewableRole } from '../permissions/permissions-model';
import { NoAccess, PageHead, pageClass } from '../permissions/parts';

const CHECK = 'M5 12.5l4.5 4.5L19 7.5';
const ROLE_TONE: Record<ViewableRole, 'admin' | 'staff'> = { OUTLET_ADMIN: 'admin', OUTLET_STAFF: 'staff' };

export default function RolePermissionsPage() {
  const t = useTranslations('users.web') as unknown as T;
  const { user } = useAuth();
  const [role, setRole] = useState<ViewableRole>('OUTLET_STAFF');
  const groups = useMemo(() => roleGrants(ROLE_PERMISSIONS as Partial<Record<string, readonly string[]>>, role), [role]);
  const grantedCount = groups.reduce((n, g) => n + g.items.filter((i) => i.granted).length, 0);

  if (user && !canManagePermissions(user.role)) return <NoAccess title={t('rolePermissions.title')} text={t('permissions.noAccess')} />;

  const pill = (on: boolean) =>
    `h-9 whitespace-nowrap rounded-full px-3.5 text-sm ${on ? 'bg-ar-ink font-semibold text-ar-page' : 'border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'}`;

  return (
    <div className={pageClass}>
      <PageHead
        back={t('title')}
        title={t('rolePermissions.title')}
        hint={t('rolePermissions.hint')}
      />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('rolePermissions.roleLabel')}>
        {VIEWABLE_ROLES.map((r) => (
          <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)} className={pill(role === r)}>
            {t(`roles.${ROLE_TONE[r]}`)}
          </button>
        ))}
        <span className="text-sm text-ar-muted">{t('rolePermissions.count', { count: grantedCount })}</span>
      </div>

      <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
        {groups.map((group) => (
          <section key={group.id} className={`${cardClass} overflow-hidden`} aria-labelledby={`role-group-${group.id}`}>
            <h2 id={`role-group-${group.id}`} className="m-0 border-b border-ar-subtle px-5 py-3 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted">
              {t(`permissions.groups.${group.id}`)}
            </h2>
            <ul className="m-0 list-none p-0">
              {group.items.map((item) => {
                const k = permissionLabelKey(item.key);
                return (
                  <li key={item.key} className="flex items-start gap-3 border-t border-ar-subtle px-5 py-2.5 first:border-t-0">
                    <span
                      className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full ${item.granted ? 'bg-ar-done-bg text-ar-done' : 'bg-ar-subtle text-ar-faint'}`}
                      role="img"
                      aria-label={item.granted ? t('rolePermissions.granted') : t('rolePermissions.notGranted')}
                    >
                      {item.granted ? <ShellIcon d={CHECK} size={14} /> : <span aria-hidden="true" className="block h-0.5 w-2.5 rounded bg-current" />}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className={`text-[15px] font-semibold ${item.granted ? 'text-ar-ink' : 'text-ar-muted'}`}>{t(`permissionKeys.${k}.label`)}</span>
                      <span className="text-sm text-ar-muted">{t(`permissionKeys.${k}.desc`)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
