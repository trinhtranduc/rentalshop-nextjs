'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  useToast,
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
} from '@rentalshop/ui';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, UserCheck, UserX, FileText } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth, useDedupedApi } from '@rentalshop/hooks';
import { usersApi } from '@rentalshop/utils';

// ============================================================================
// TYPES
// ============================================================================

interface Author {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  _count?: {
    posts?: number;
  };
}

interface AuthorsDataResponse {
  users: Author[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

// ============================================================================
// AUTHORS PAGE
// ============================================================================

export default function AuthorsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toastSuccess } = useToast();

  // Only ADMIN can manage authors
  const canManageAuthors = user?.role === 'ADMIN';

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  // URL params
  const search = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');

  // Filters - always filter by ARTICLE role
  const filters = useMemo(() => ({
    role: 'ARTICLE' as const,
    q: search || undefined,
    search: search || undefined,
    page,
    limit,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
    _pathname: pathname,
  }), [search, page, limit, pathname]);

  // Data fetching
  const { data, loading, error, refetch } = useDedupedApi<AuthorsDataResponse>({
    filters,
    fetchFn: async (filtersWithPath: any) => {
      const { _pathname, ...apiFilters } = filtersWithPath;
      const response = await usersApi.searchUsers(apiFilters);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch authors');
      }

      const apiData = response.data as any;
      let usersData: Author[];
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

      return {
        users: usersData,
        total,
        page: pageNum,
        limit: limitNum,
        hasMore,
        totalPages,
      };
    },
    enabled: canManageAuthors,
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
      } else if (value && value !== '') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    const newURL = `${pathname}?${params.toString()}`;
    router.push(newURL, { scroll: false });
  }, [pathname, router, searchParams]);

  // Handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateURL({ q: e.target.value, page: 1 });
  }, [updateURL]);

  const handleOpenAdd = () => {
    setFormData({ firstName: '', lastName: '', email: '', phone: '', password: '' });
    setShowAddDialog(true);
  };

  const handleOpenEdit = (author: Author) => {
    setSelectedAuthor(author);
    setFormData({
      firstName: author.firstName,
      lastName: author.lastName,
      email: author.email,
      phone: author.phone || '',
      password: '',
    });
    setShowEditDialog(true);
  };

  const handleOpenDelete = (author: Author) => {
    setSelectedAuthor(author);
    setShowDeleteConfirm(true);
  };

  const handleToggleActive = async (author: Author) => {
    try {
      if (author.isActive) {
        await usersApi.deactivateUser(author.id);
        toastSuccess('Đã vô hiệu hóa tác giả');
      } else {
        await usersApi.activateUser(author.id);
        toastSuccess('Đã kích hoạt tác giả');
      }
      refetch();
    } catch (err) {
      console.error('Error toggling author status:', err);
    }
  };

  const handleCreateAuthor = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.password) return;

    try {
      setIsSubmitting(true);
      const response = await usersApi.createUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password,
        role: 'ARTICLE',
      } as any);

      if (response.success) {
        toastSuccess('Tạo tác giả thành công');
        setShowAddDialog(false);
        refetch();
      }
    } catch (err) {
      console.error('Error creating author:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAuthor = async () => {
    if (!selectedAuthor || !formData.email || !formData.firstName || !formData.lastName) return;

    try {
      setIsSubmitting(true);
      const updateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await usersApi.updateUser(selectedAuthor.id, updateData);

      if (response.success) {
        toastSuccess('Cập nhật tác giả thành công');
        setShowEditDialog(false);
        setSelectedAuthor(null);
        refetch();
      }
    } catch (err) {
      console.error('Error updating author:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAuthor = async () => {
    if (!selectedAuthor) return;

    try {
      const response = await usersApi.deleteUser(selectedAuthor.id);
      if (response.success) {
        toastSuccess('Đã xóa tác giả');
        setShowDeleteConfirm(false);
        setSelectedAuthor(null);
        refetch();
      }
    } catch (err) {
      console.error('Error deleting author:', err);
    }
  };

  // Access control
  if (!canManageAuthors) {
    return (
      <PageWrapper>
        <div className="text-center py-12">
          <p className="text-gray-500">Bạn không có quyền truy cập trang này.</p>
        </div>
      </PageWrapper>
    );
  }

  const authors = data?.users || [];
  const totalAuthors = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý tác giả</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý danh sách người viết bài ({totalAuthors} tác giả)
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Thêm tác giả
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Tìm kiếm theo tên, email..."
            defaultValue={search}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
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
            <p className="text-red-500">Lỗi khi tải dữ liệu. Vui lòng thử lại.</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-2">
              Thử lại
            </Button>
          </div>
        ) : authors.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Chưa có tác giả nào.</p>
            <Button onClick={handleOpenAdd} variant="outline" className="mt-3 gap-2">
              <Plus className="w-4 h-4" />
              Thêm tác giả đầu tiên
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tên</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">SĐT</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {authors.map((author) => (
                <tr key={author.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {author.firstName} {author.lastName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{author.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{author.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={author.isActive ? 'default' : 'secondary'}>
                      {author.isActive ? 'Hoạt động' : 'Vô hiệu'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(author.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(author)}
                        title="Chỉnh sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(author)}
                        title={author.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                      >
                        {author.isActive ? (
                          <UserX className="w-4 h-4 text-orange-500" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-green-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDelete(author)}
                        title="Xóa"
                      >
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
              Trang {page} / {totalPages} ({totalAuthors} tác giả)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateURL({ page: page - 1 })}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateURL({ page: page + 1 })}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Author Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm tác giả mới</DialogTitle>
            <DialogDescription>
              Tạo tài khoản cho tác giả viết bài. Tác giả chỉ có quyền quản lý bài viết.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">Họ *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Nguyễn"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Tên *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Văn A"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="author@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="0901234567"
              />
            </div>
            <div>
              <Label htmlFor="password">Mật khẩu *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Tối thiểu 6 ký tự"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleCreateAuthor}
                disabled={isSubmitting || !formData.email || !formData.firstName || !formData.lastName || !formData.password}
              >
                {isSubmitting ? 'Đang tạo...' : 'Tạo tác giả'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Author Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa tác giả</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin tác giả. Để trống mật khẩu nếu không muốn thay đổi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-firstName">Họ *</Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-lastName">Tên *</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Số điện thoại</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-password">Mật khẩu mới (bỏ trống nếu không đổi)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Để trống nếu không thay đổi"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleUpdateAuthor}
                disabled={isSubmitting || !formData.email || !formData.firstName || !formData.lastName}
              >
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
        title="Xóa tác giả"
        description={`Bạn có chắc chắn muốn xóa tác giả "${selectedAuthor?.firstName} ${selectedAuthor?.lastName}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={handleDeleteAuthor}
      />
    </PageWrapper>
  );
}
