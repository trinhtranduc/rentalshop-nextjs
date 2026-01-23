'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Card,
  CardContent,
  Badge,
  LoadingIndicator,
} from '@rentalshop/ui';
import { Image as ImageIcon, Upload, X, Search, AlertCircle } from 'lucide-react';
import { searchProductsByImage } from '@rentalshop/utils';
import { useProductTranslations } from '@rentalshop/hooks';
import { useToast } from '@rentalshop/ui';
import type { Product } from '@rentalshop/types';

interface ImageSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchResult: (products: Product[]) => void;
  categoryId?: number;
}

/**
 * Image Search Dialog Component
 * 
 * Allows users to upload an image and search for similar products
 */
export function ImageSearchDialog({
  open,
  onOpenChange,
  onSearchResult,
  categoryId,
}: ImageSearchDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<Product & { similarity: number }>>([]);
  const [queryImageUrl, setQueryImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toastSuccess, toastError } = useToast();
  const t = useProductTranslations();

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toastError(t('imageSearch.error'), t('imageSearch.errorInvalidFile'));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toastError(t('imageSearch.error'), t('imageSearch.errorFileSize'));
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSearchResults([]);
    setQueryImageUrl(null);
  }, [toastError]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      // Simulate file input change
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileSelect({ target: { files: dataTransfer.files } } as any);
      }
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!selectedFile) {
      toastError(t('imageSearch.error'), t('imageSearch.errorNoImage'));
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const response = await searchProductsByImage(selectedFile, {
        limit: 20,
        minSimilarity: 0.7,
        categoryId,
      });

      if (response.success && response.data) {
        setSearchResults(response.data.products);
        setQueryImageUrl(response.data.queryImage);
        
        if (response.data.products.length > 0) {
          toastSuccess(
            t('imageSearch.success'), 
            t('imageSearch.successFound', { count: response.data.products.length })
          );
          // Call callback with results
          onSearchResult(response.data.products);
        } else {
          toastError(t('imageSearch.noResults'), t('imageSearch.noResultsHint'));
        }
      } else {
        toastError(t('imageSearch.error'), response.message || t('imageSearch.errorSearchFailed'));
      }
    } catch (error: any) {
      console.error('Image search error:', error);
      toastError(t('imageSearch.error'), error.message || t('imageSearch.errorSearchFailed'));
    } finally {
      setIsSearching(false);
    }
  }, [selectedFile, categoryId, toastSuccess, toastError, onSearchResult, t]);

  // Handle clear
  const handleClear = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSearchResults([]);
    setQueryImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle close
  const handleClose = useCallback(() => {
    handleClear();
    onOpenChange(false);
  }, [handleClear, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            {t('imageSearch.title')}
          </DialogTitle>
          <DialogDescription>
            {t('imageSearch.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          {!previewUrl && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto mb-4 text-text-tertiary" />
              <p className="text-sm font-medium mb-2">
                {t('imageSearch.uploadPlaceholder')}
              </p>
              <p className="text-xs text-text-tertiary">
                {t('imageSearch.uploadHint')}
              </p>
            </div>
          )}

          {/* Preview and Results */}
          {previewUrl && (
            <div className="space-y-4">
              {/* Preview Image */}
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-64 object-contain rounded-lg border border-border"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleClear}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Search Button */}
              {searchResults.length === 0 && !isSearching && (
                <Button
                  onClick={handleSearch}
                  className="w-full"
                  disabled={!selectedFile}
                >
                  <Search className="w-4 h-4 mr-2" />
                  {t('imageSearch.searchButton')}
                </Button>
              )}

              {/* Loading State */}
              {isSearching && (
                <div className="flex flex-col items-center justify-center py-8">
                  <LoadingIndicator size="lg" />
                  <p className="mt-4 text-sm text-text-tertiary">
                    {t('imageSearch.searching')}
                  </p>
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {t('imageSearch.foundResults', { count: searchResults.length })}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClear}
                    >
                      {t('imageSearch.searchAnother')}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map((product) => (
                      <Card
                        key={product.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          // Handle product click - could navigate to product detail
                          console.log('Product clicked:', product.id);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Product Image */}
                            {product.images && (
                              <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                                <img
                                  src={Array.isArray(product.images) 
                                    ? product.images[0] 
                                    : typeof product.images === 'string'
                                    ? product.images
                                    : ''}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                                  }}
                                />
                                {/* Similarity Badge */}
                                <Badge
                                  className="absolute top-2 right-2"
                                  variant="default"
                                >
                                  {t('imageSearch.similarity', { percent: Math.round(product.similarity * 100) })}
                                </Badge>
                              </div>
                            )}

                            {/* Product Info */}
                            <div>
                              <h4 className="font-medium text-sm line-clamp-2 mb-1">
                                {product.name}
                              </h4>
                              {product.rentPrice && (
                                <p className="text-xs text-text-tertiary">
                                  {new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: 'VND',
                                  }).format(product.rentPrice)}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {!isSearching && searchResults.length === 0 && queryImageUrl && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="w-12 h-12 text-text-tertiary mb-4" />
                  <p className="text-sm font-medium mb-2">{t('imageSearch.noResults')}</p>
                  <p className="text-xs text-text-tertiary">
                    {t('imageSearch.noResultsHint')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
