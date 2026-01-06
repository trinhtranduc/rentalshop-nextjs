'use client';

import React, { useRef, useState } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/cn';

export interface FileUploadZoneProps {
  onFileSelect: (file: File) => void | Promise<void>; // Support both sync and async handlers
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  className?: string;
  disabled?: boolean;
}

export function FileUploadZone({
  onFileSelect,
  acceptedFileTypes = ['.xlsx', '.csv'],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  className,
  disabled = false
}: FileUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.some(type => fileExtension === type.toLowerCase())) {
      return `File type not supported. Please upload ${acceptedFileTypes.join(' or ')} files.`;
    }

    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(2);
      return `File size exceeds ${maxSizeMB}MB limit.`;
    }

    return null;
  };

  const handleFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
    await onFileSelect(file); // Support async handlers
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Card className={cn('border-2 border-dashed w-full', className)}>
      <CardContent className="p-8">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFileTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        {selectedFile ? (
          // File selected state
          <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <File className="w-5 h-5 text-text-secondary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              disabled={disabled}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          // Upload zone
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-12 text-center transition-colors',
              dragActive && !disabled
              ? 'border-action-primary bg-action-primary/10'
              : disabled
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
              : 'border-border hover:border-action-primary/50 cursor-pointer',
              error && 'border-red-500'
            )}
            onDragEnter={!disabled ? handleDrag : undefined}
            onDragLeave={!disabled ? handleDrag : undefined}
            onDragOver={!disabled ? handleDrag : undefined}
            onDrop={!disabled ? handleDrop : undefined}
            onClick={!disabled ? handleBrowseClick : undefined}
          >
            <Upload
              className={cn(
                'w-12 h-12 mx-auto mb-4',
                disabled ? 'text-gray-400' : 'text-text-secondary'
              )}
            />
            <p className="text-text-primary font-medium mb-2 text-base">
              {disabled ? 'Upload disabled' : 'Drag & drop your file here'}
            </p>
            <p className="text-text-secondary text-sm mb-5">
              or click to browse
            </p>
            <p className="text-xs text-text-secondary">
              Supported formats: {acceptedFileTypes.join(', ')}
            </p>
            {maxFileSize && (
              <p className="text-xs text-text-secondary mt-1">
                Max file size: {formatFileSize(maxFileSize)}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

