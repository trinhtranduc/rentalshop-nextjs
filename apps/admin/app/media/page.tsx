'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  ConfirmationDialog,
  Button,
  Input,
  useToast,
} from '@rentalshop/ui';
import { Upload, Trash2, Image as ImageIcon, Copy, Check, X, RefreshCw } from 'lucide-react';
import { useAuth } from '@rentalshop/hooks';
import { authenticatedFetch, apiUrls } from '@rentalshop/utils';

// ============================================================================
// TYPES
// ============================================================================

interface MediaFile {
  key: string;
  url: string;
  name: string;
  size: number;
  lastModified?: string;
}

// ============================================================================
// PAGE
// ============================================================================

export default function MediaPage() {
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextToken, setNextToken] = useState<string | null>(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'ARTICLE';

  // Fetch media list
  const fetchMedia = useCallback(async (token?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '50' });
      if (token) params.set('continuationToken', token);

      const baseUrl = apiUrls.base;
      const response = await authenticatedFetch(`${baseUrl}/api/media?${params.toString()}`);
      const result = await response.json();

      if (result.success && result.data) {
        if (token) {
          setFiles(prev => [...prev, ...result.data.files]);
        } else {
          setFiles(result.data.files);
        }
        setHasMore(result.data.hasMore);
        setNextToken(result.data.nextToken);
      }
    } catch (err) {
      console.error('Error fetching media:', err);
      toastError('Lỗi khi tải danh sách media');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    if (canManage) {
      fetchMedia();
    }
  }, [canManage, fetchMedia]);

  // Upload files
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    try {
      setUploading(true);
      const formData = new FormData();
      for (let i = 0; i < fileList.length; i++) {
        formData.append('files', fileList[i]);
      }

      const baseUrl = apiUrls.base;
      const response = await authenticatedFetch(`${baseUrl}/api/media`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (result.success && result.data) {
        toastSuccess(`Đã upload ${result.data.totalUploaded} file`);
        if (result.data.errors?.length > 0) {
          toastError(`${result.data.totalFailed} file lỗi`);
        }
        fetchMedia(); // Refresh list
      } else {
        toastError('Upload thất bại');
      }
    } catch (err) {
      console.error('Error uploading:', err);
      toastError('Lỗi khi upload file');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete selected files
  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;

    try {
      const keys = Array.from(selectedFiles);
      const baseUrl = apiUrls.base;
      const response = await authenticatedFetch(`${baseUrl}/api/media`, {
        method: 'DELETE',
        body: JSON.stringify({ keys }),
      });
      const result = await response.json();

      if (result.success) {
        toastSuccess(`Đã xóa ${result.data.totalDeleted} file`);
        setSelectedFiles(new Set());
        setShowDeleteConfirm(false);
        fetchMedia(); // Refresh list
      } else {
        toastError('Xóa thất bại');
      }
    } catch (err) {
      console.error('Error deleting:', err);
      toastError('Lỗi khi xóa file');
    }
  };

  // Copy URL to clipboard
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Toggle selection
  const toggleSelect = (key: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.key)));
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!canManage) {
    return (
      <PageWrapper>
        <div className="text-center py-12">
          <p className="text-gray-500">Bạn không có quyền truy cập trang này.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <PageTitle>Media Library</PageTitle>
            <p className="text-sm text-gray-500 mt-1">
              Quản lý hình ảnh cho bài viết ({files.length} file)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedFiles.size > 0 && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Xóa ({selectedFiles.size})
              </Button>
            )}
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Đang upload...' : 'Upload'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        </div>
      </PageHeader>

      <PageContent>
        {/* Toolbar */}
        {files.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
              {selectedFiles.size === files.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => fetchMedia()} className="gap-1">
              <RefreshCw className="w-3 h-3" />
              Làm mới
            </Button>
          </div>
        )}

        {/* Grid */}
        {loading && files.length === 0 ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
            <p className="mt-2 text-gray-500">Đang tải...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-lg">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Chưa có hình ảnh nào</p>
            <p className="text-sm text-gray-400 mb-4">Upload hình ảnh JPG, PNG, WebP hoặc GIF (tối đa 5MB)</p>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Upload hình ảnh đầu tiên
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {files.map((file) => {
                const isSelected = selectedFiles.has(file.key);
                return (
                  <div
                    key={file.key}
                    className={`relative group rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                      isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleSelect(file.key)}
                  >
                    {/* Image */}
                    <div className="aspect-square bg-gray-50 relative">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info overlay on hover */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs text-white truncate">{file.name}</p>
                      <p className="text-xs text-gray-300">{formatSize(file.size)}</p>
                    </div>

                    {/* Copy URL button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyUrl(file.url);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                      title="Copy URL"
                    >
                      {copiedUrl === file.url ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-600" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="text-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => nextToken && fetchMedia(nextToken)}
                  disabled={loading}
                >
                  {loading ? 'Đang tải...' : 'Tải thêm'}
                </Button>
              </div>
            )}
          </>
        )}
      </PageContent>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title="Xóa hình ảnh"
        description={`Bạn có chắc chắn muốn xóa ${selectedFiles.size} hình ảnh đã chọn? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={handleDeleteSelected}
      />
    </PageWrapper>
  );
}
