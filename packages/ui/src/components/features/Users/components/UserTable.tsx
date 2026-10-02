import React from 'react';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../../ui/dropdown-menu';
import { User } from '@rentalshop/types';
import { Edit, Trash2, MoreVertical, UserCheck, UserX } from 'lucide-react';
import { useUsersTranslations, useTableSelection } from '@rentalshop/hooks';
import { UserBadges } from './UserProfile';

// Shop clock (Asia/Ho_Chi_Minh), independent of the browser timezone
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});
const fmtDateTime = (value?: string | Date | null) => (value ? dateTimeFormat.format(new Date(value)).replace(',', '') : '—');

interface UserTableProps {
  users: User[];
  onUserAction: (action: string, userId: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  onSelectionChange?: (selectedUserIds: number[]) => void;
}

export function UserTable({ 
  users, 
  onUserAction, 
  sortBy = 'createdAt', 
  sortOrder = 'desc',
  onSort,
  onSelectionChange
}: UserTableProps) {
  const t = useUsersTranslations();
  // Keyed by surface too: the phone list and the table each render a menu, and two open copies
  // made the hidden one treat a click in the visible one as "outside" and close it first
  const [openDropdownId, setOpenDropdownId] = React.useState<string | null>(null);

  const {
    allSelected,
    someSelected,
    handleToggleSelect,
    handleSelectAll,
    isSelected,
  } = useTableSelection(users, onSelectionChange);
  
  if (users.length === 0) {
    return (
      <Card className="shadow-sm border-border">
        <CardContent className="text-center py-12">
          <div className="text-text-tertiary">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium mb-2">{t('messages.noUsers')}</h3>
            <p className="text-sm">
              {t('messages.loadingUsers')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const name = (user: User) => [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
  const initials = (user: User) =>
    ((user.firstName?.[0] || '') + (user.lastName?.[0] || '') || user.email[0] || '?').toUpperCase();

  const actionsMenu = (user: User, surface: 'list' | 'table') => {
    const menuId = `${surface}-${user.id}`;
    return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          aria-label={`${t('fields.actions')}: ${name(user)}`}
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdownId(openDropdownId === menuId ? null : menuId);
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        open={openDropdownId === menuId}
        onOpenChange={(open: boolean) => setOpenDropdownId(open ? menuId : null)}
      >
        <DropdownMenuItem onClick={() => { onUserAction('edit', user.id); setOpenDropdownId(null); }}>
          <Edit className="h-4 w-4 mr-2" />
          {t('actions.editUser')}
        </DropdownMenuItem>
        {user.role !== 'ADMIN' && (
          <>
            <DropdownMenuItem onClick={() => { onUserAction(user.isActive ? 'deactivate' : 'activate', user.id); setOpenDropdownId(null); }}>
              {user.isActive ? <UserX className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
              {user.isActive ? t('actions.deactivate') : t('actions.activate')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { onUserAction('delete', user.id); setOpenDropdownId(null); }}
              className="text-action-danger focus:text-action-danger"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('actions.delete')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    );
  };

  const avatar = (user: User) => (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
        user.isActive ? 'bg-blue-50 text-blue-800' : 'bg-gray-100 text-gray-600'
      }`}
      aria-hidden="true"
    >
      {initials(user)}
    </span>
  );

  // The whole row opens the user; keyboard users get the name link
  const open = (user: User) => onUserAction('view', user.id);
  const th = 'px-4 py-2.5 text-left text-xs font-medium text-gray-600';

  return (
    <Card className="shadow-sm border-border flex flex-col h-full">
      <CardContent className="p-0 flex-1 overflow-hidden">
        {/* Phones: one card per person */}
        <ul className="divide-y divide-gray-100 overflow-auto h-full md:hidden">
          {users.map((user) => (
            <li key={user.id} className="flex items-center gap-3 px-4 py-3" onClick={() => open(user)}>
              {avatar(user)}
              <div className="min-w-0 flex-1">
                <button type="button" onClick={(e) => { e.stopPropagation(); open(user); }} className="block max-w-full truncate text-left text-sm font-semibold text-gray-900">
                  {name(user)}
                </button>
                <p className="truncate text-xs text-gray-600">{user.outlet?.name || user.merchant?.name || user.email}</p>
                <div className="mt-1"><UserBadges user={user} /></div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>{actionsMenu(user, 'list')}</div>
            </li>
          ))}
        </ul>

        {/* Tablet and up: table */}
        <div className="hidden md:block flex-1 overflow-auto h-full">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
              <tr>
                {onSelectionChange && (
                  <th className={`${th} w-12`}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => { if (input) input.indeterminate = someSelected; }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      aria-label={allSelected ? 'Deselect all' : 'Select all'}
                    />
                  </th>
                )}
                <th className={th}>{t('fields.name')}</th>
                <th className={th}>{t('fields.role')}</th>
                <th className={th}>{t('fields.outlet')}</th>
                <th className={`${th} hidden lg:table-cell`}>{t('fields.createdAt')}</th>
                <th className={`${th} w-12`}><span className="sr-only">{t('fields.actions')}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => open(user)}
                  className={`cursor-pointer transition-colors ${isSelected(user.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  {onSelectionChange && (
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected(user.id)}
                        onChange={() => handleToggleSelect(user.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        aria-label={name(user)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      {avatar(user)}
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); open(user); }}
                          className="block max-w-[16rem] truncate text-left font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                        >
                          {name(user)}
                        </button>
                        <p className="max-w-[16rem] truncate text-xs text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5"><UserBadges user={user} /></td>
                  <td className="px-4 py-2.5 text-gray-900">{user.outlet?.name || user.merchant?.name || '—'}</td>
                  <td className="hidden px-4 py-2.5 tabular-nums text-gray-700 lg:table-cell">{fmtDateTime(user.createdAt as any)}</td>
                  <td className="px-2 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>{actionsMenu(user, 'table')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
