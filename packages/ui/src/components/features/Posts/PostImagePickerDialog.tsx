'use client';

import React, { useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  useToast,
} from '../../ui';
import { getAuthToken, uploadImage, type UploadProgress } from '@rentalshop/utils';
import { Loader2, Upload } from 'lucide-react';

export interface PostImagePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with image URL from `POST /api/upload/image` (S3 / CloudFront). */
  onPick: (url: string) => void;
  title?: string;
}

export function PostImagePickerDialog({
  open,
  onOpenChange,
  onPick,
  title = 'Chèn ảnh',
}: PostImagePickerDialogProps) {
  const { toastError, toastSuccess } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) {
      toastError('Chọn file ảnh hợp lệ.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastError('Ảnh tối đa 5MB.');
      return;
    }

    const token = await getAuthToken();
    if (!token) {
      toastError('Vui lòng đăng nhập.');
      return;
    }

    setUploading(true);
    setUploadProgress({
      loaded: 0,
      total: 100,
      percentage: 0,
      stage: 'preparing',
    });

    try {
      const result = await uploadImage(file, token, {
        folder: 'blog',
        maxFileSize: 5 * 1024 * 1024,
        maxSizeMB: 2,
        enableCompression: true,
        compressionQuality: 0.8,
        onProgress: setUploadProgress,
      });

      if (result.success && result.data?.url) {
        onPick(result.data.url);
        onOpenChange(false);
        toastSuccess('Đã tải ảnh lên');
      } else {
        toastError(result.error || 'Tải ảnh thất bại');
      }
    } catch (e) {
      console.error(e);
      toastError('Tải ảnh thất bại');
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Tải ảnh lên máy chủ (AWS S3 / CloudFront) rồi chèn vào nội dung hoặc ảnh đại diện.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full h-28 border-dashed"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Đang tải lên…
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Chọn ảnh từ máy
              </>
            )}
          </Button>
          {uploadProgress && uploading && (
            <div>
              <div className="w-full bg-bg-tertiary rounded-full h-2">
                <div
                  className="bg-action-primary h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-text-tertiary mt-1">{uploadProgress.percentage}%</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
