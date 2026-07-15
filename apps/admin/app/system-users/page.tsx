'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ConfirmationDialog,
  Button,
  Input,
  Label,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@rentalshop/ui';
import { Plus, Search, Pencil, Trash2, UserCheck, UserX, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth, useDedupedApi } from '@rentalshop/hooks';
import { usersApi } from '@rentalshop/utils';

// ============================================================================
// TYPES
// ============================================================================

interface SystemUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface SystemUsersDataResponse {
  users: SystemUser[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

// System-level roles (not merchant-bound)
const SYSTEM_ROLES = [
  { value: 'ARTICLE', label: 'Blog / CMS Editor' },
  // Future roles can be added here:
  // { value: 'MARKETING', label: 'Marketing' },
  // { value: 'SUPPORT', label: 'Support Staff' },
];

// ============================================================================
// PAGE
// ============================================================================

export default function SystemUsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();

  // Only ADMIN can manage system users
  const canManage = user?.role === 'ADMIN';

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'ARTICLE',
  });

  // URL params
  const search = searchParams.get('q') || '';
  const roleFilter = searchParams.get('role') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');

  // Filters - system-level users only (ADMIN + ARTICLE, no merchantId)
  const filters = useMemo(() => ({
    q: search || undefined,
    search: search || undefined,
    role: roleFilter || 'ARTICLE', // Default filter to ARTICLE; ADMIN can change
    page,
    limit,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
    _pathname: pathname,
  }), [search, roleFilter, page, limit, pathname]);

  // Data fetching
  const { data, loading, error, refetch } = useDedupedApi<SystemUsersDataResponse>({
    filters,
    fetchFn: async (filtersWithPath: any) => {
      const { _pathname, ...apiFilters } = filtersWithPath;
      const response = await usersApi.searchUsers(apiFilters);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch system users');
      }

      const apiData = response.data as any;
      let usersData: SystemUser[];
      let total: number;
      let pageNum: number;
      let limitNum: number;
      let hasMore: boolean;
      let totalPages: number;

      if (Array.isArray(apiData)) {
        const pagination = (response as any).pagination || {};
        usersData = apiData;
        total = pagination.total || apiData.length;
        pageNum = pagination.page || 1;
        limitNum = pagination.limit || 25;
        totalPages = Math.ceil(total / limitNum);
        hasMore = pagination.hasMore !== undefined ? pagination.hasMore : pageNum < totalPages;
      } else {
        usersData = apiData.users || apiData.data || [];
        total = apiData.total || 0;
        pageNum = apiData.page || 1;
        limitNum = apiData.limit || 25;
        totalPages = apiData.totalPages || Math.ceil(total / limitNum);
        hasMore = apiData.hasMore !== undefined ? apiData.hasMore : pageNum < totalPages;
      }

      return { users: usersData, total, page: pageNum, limit: limitNum, hasMore, totalPages };
    },
    enabled: canManage,
    staleTime: 0,
    cacheTime: 300000,
    refetchOnMount: true,
  });

  // URL update helper
  const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'page') {
        const pageNum = typeof value === 'number' ? value : parseInt(String(value || '0'));
        if (pageNum > 1) params.set(key, pageNum.toString());
        else params.delete(key);
      } else if (value && value !== '' && value !== 'all') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  // Handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateURL({ q: e.target.value, page: 1 });
  }, [updateURL]);

  const handleRoleFilterChange = useCallback((value: string) => {
    updateURL({ role: value === 'all' ? undefined : value, page: 1 });
  }, [updateURL]);

  const handleOpenAdd = () => {
    setFormData({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'ARTICLE' });
    setShowAddDialog(true);
  };

  const handleOpenEdit = (u: SystemUser) => {
    setSelectedUser(u);
    setFormData({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone || '',
      password: '',
      role: u.role,
    });
    setShowEditDialog(true);
  };

  const handleOpenDelete = (u: SystemUser) => {
    setSelectedUser(u);
    setShowDeleteConfirm(true);
  };

  const handleToggleActive = async (u: SystemUser) => {
    try {
      if (u.isActive) {
        await usersApi.deactivateUser(u.id);
        toastSuccess('Đã vô hiệu hóa tài khoản');
      } else {
        await usersApi.activateUser(u.id);
        toastSuccess('Đã kích hoạt tài khoản');
      }
      refetch();
    } catch (err) {
      console.error('Error toggling user status:', err);
    }
  };

  const handleCreate = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.password) return;

    try {
      setIsSubmitting(true);
      const response = await usersApi.createUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password,
        role: formData.role,
      } as any);

      if (response.success) {
        toastSuccess('Tạo tài khoản thành công');
        setShowAddDialog(false);
        refetch();
      }
    } catch (err) {
      console.error('Error creating user:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser || !formData.email || !formData.firstName || !formData.lastName) return;

    try {
      setIsSubmitting(true);
      const updateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        role: formData.role,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await usersApi.updateUser(selectedUser.id, updateData);
      if (response.success) {
        toastSuccess('Cập nhật thành công');
        setShowEditDialog(false);
        setSelectedUser(null);
        refetch();
      }
    } catch (err) {
      console.error('Error updating user:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      const response = await usersApi.deleteUser(selectedUser.id);
      if (response.success) {
        toastSuccess('Đã xóa tài khoản');
        setShowDeleteConfirm(false);
        setSelectedUser(null);
        refetch();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  // Access control
  if (!canManage) {
    return (
      <PageWrapper>
        <div className="text-center py-12">
          <p className="text-gray-500">Bạn không có quyền truy cập trang này.</p>
        </div>
      </PageWrapper>
    );
  }

  const users = data?.users || [];
  const totalUsers = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const getRoleLabel = (role: string) => {
    const found = SYSTEM_ROLES.find(r => r.value === role);
    return found?.label || role;
  };

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <PageTitle>AnyRent Users</PageTitle>
            <p className="text-sm text-gray-500 mt-1">
              Quản lý tài khoản nội bộ hệ thống AnyRent ({totalUsers} tài khoản)
            </p>
          </div>
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            Thêm tài khoản
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm theo tên, email..."
              defaultValue={search}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter || 'ARTICLE'} onValueChange={handleRoleFilterChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Lọc theo role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả roles</SelectItem>
              {SYSTEM_ROLES.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
              <p className="mt-2 text-gray-500">Đang tải...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-500">Lỗi khi tải dữ liệu.</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-2">Thử lại</Button>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Chưa có tài khoản nào.</p>
              <Button onClick={handleOpenAdd} variant="outline" className="mt-3 gap-2">
                <Plus className="w-4 h-4" />
                Thêm tài khoản đầu tiên
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tên</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {u.firstName} {u.lastName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel(u.role)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? 'default' : 'secondary'}>
                        {u.isActive ? 'Hoạt động' : 'Vô hiệu'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(u)} title="Chỉnh sửa">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(u)} title={u.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}>
                          {u.isActive ? <UserX className="w-4 h-4 text-orange-500" /> : <UserCheck className="w-4 h-4 text-green-500" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDelete(u)} title="Xóa">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">
                Trang {page} / {totalPages} ({totalUsers} tài khoản)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateURL({ page: page - 1 })}>
                  Trước
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateURL({ page: page + 1 })}>
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageContent>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm tài khoản hệ thống</DialogTitle>
            <DialogDescription>
              Tạo tài khoản nội bộ cho nhân sự AnyRent (editor, marketing, staff...).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="add-firstName">Họ *</Label>
                <Input id="add-firstName" value={formData.firstName} onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} placeholder="Nguyễn" />
              </div>
              <div>
                <Label htmlFor="add-lastName">Tên *</Label>
                <Input id="add-lastName" value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} placeholder="Văn A" />
              </div>
            </div>
            <div>
              <Label htmlFor="add-email">Email *</Label>
              <Input id="add-email" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="user@anyrent.shop" />
            </div>
            <div>
              <Label htmlFor="add-phone">Số điện thoại</Label>
              <Input id="add-phone" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="0901234567" />
            </div>
            <div>
              <Label htmlFor="add-role">Role *</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData(prev => ({ ...prev, role: v }))}>
                <SelectTrigger id="add-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="add-password">Mật khẩu *</Label>
              <Input id="add-password" type="password" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} placeholder="Tối thiểu 6 ký tự" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Hủy</Button>
              <Button onClick={handleCreate} disabled={isSubmitting || !formData.email || !formData.firstName || !formData.lastName || !formData.password}>
                {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa tài khoản</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin. Để trống mật khẩu nếu không muốn thay đổi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-firstName">Họ *</Label>
                <Input id="edit-firstName" value={formData.firstName} onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="edit-lastName">Tên *</Label>
                <Input id="edit-lastName" value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <Input id="edit-email" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="edit-phone">Số điện thoại</Label>
              <Input id="edit-phone" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData(prev => ({ ...prev, role: v }))}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-password">Mật khẩu mới</Label>
              <Input id="edit-password" type="password" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} placeholder="Để trống nếu không thay đổi" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Hủy</Button>
              <Button onClick={handleUpdate} disabled={isSubmitting || !formData.email || !formData.firstName || !formData.lastName}>
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title="Xóa tài khoản"
        description={`Bạn có chắc chắn muốn xóa tài khoản "${selectedUser?.firstName} ${selectedUser?.lastName}" (${selectedUser?.email})? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
