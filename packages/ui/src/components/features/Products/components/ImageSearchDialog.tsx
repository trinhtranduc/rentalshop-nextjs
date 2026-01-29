'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  LoadingIndicator,
  Badge,
} from '@rentalshop/ui';
import { Image as ImageIcon, Upload, X, Search, AlertCircle, Loader2 } from 'lucide-react';
import { searchProductsByImage } from '@rentalshop/utils';
import { useProductTranslations } from '@rentalshop/hooks';
import { useToast } from '@rentalshop/ui';
import type { Product } from '@rentalshop/types';
import { SearchResultsTable } from './SearchResultsTable';

interface ImageSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchResult: (products: Product[]) => void;
  onAddToCart?: (product: Product) => void;
  onViewProduct?: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
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
  onAddToCart,
  onViewProduct,
  onEditProduct,
  categoryId,
}: ImageSearchDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<Product & { similarity: number }>>([]);
  const [queryImageUrl, setQueryImageUrl] = useState<string | null>(null);
  const [searchProgress, setSearchProgress] = useState<{
    stage: 'compressing' | 'searching' | 'loading';
    percentage: number;
  }>({ stage: 'compressing', percentage: 0 });
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
    setSearchProgress({ stage: 'compressing', percentage: 0 });

    try {
      const response = await searchProductsByImage(selectedFile, {
        limit: 20,
        minSimilarity: 0.5, // Reduced from 0.7 to 0.5 for better results
        categoryId,
        onProgress: (progress: { stage: string; percentage: number }) => {
          setSearchProgress({
            stage: progress.stage as 'compressing' | 'searching' | 'loading',
            percentage: progress.percentage
          });
        }
      } as any);

      if (response.success && response.data) {
        const products = response.data.products || [];
        setSearchResults(products);
        setQueryImageUrl(response.data.queryImage);
        
        if (products.length > 0) {
          toastSuccess(
            t('imageSearch.success'), 
            t('imageSearch.successFound', { count: response.data.products.length })
          );
          // Call callback with results
          onSearchResult(products);
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
      <DialogContent className="w-[90vw] max-w-5xl h-[85vh] max-h-[800px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            {t('imageSearch.title')}
          </DialogTitle>
          <DialogDescription>
            {t('imageSearch.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 space-y-4">
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
              {(!searchResults || searchResults.length === 0) && !isSearching && (
                <Button
                  onClick={handleSearch}
                  className="w-full"
                  disabled={!selectedFile}
                >
                  <Search className="w-4 h-4 mr-2" />
                  {t('imageSearch.searchButton')}
                </Button>
              )}

              {/* Loading State with Progress */}
              {isSearching && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="flex items-center gap-3 w-full max-w-md">
                    <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-2">
                        {searchProgress.stage === 'compressing' && '🗜️ Compressing image...'}
                        {searchProgress.stage === 'searching' && '🔍 Searching similar products...'}
                        {searchProgress.stage === 'loading' && '📦 Loading results...'}
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${searchProgress.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-text-tertiary">
                    This may take a few seconds... Please wait.
                  </p>
                </div>
              )}

              {/* Search Results - Table View (matches /products page) */}
              {searchResults && searchResults.length > 0 && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {t('imageSearch.foundResults', { count: searchResults.length })}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        Similarity Search
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClear}
                    >
                      {t('imageSearch.searchAnother')}
                    </Button>
                  </div>

                  {/* Search Results Table - Same style as ProductTable */}
                  <SearchResultsTable
                    products={searchResults}
                    onProductAction={(action, productId) => {
                      const product = searchResults.find(p => p.id === productId);
                      if (!product) return;
                      
                      if (action === 'view' && onViewProduct) {
                        onViewProduct(product);
                      } else if (action === 'edit' && onEditProduct) {
                        onEditProduct(product);
                      } else if (action === 'rent' && onAddToCart) {
                        onAddToCart(product);
                      }
                    }}
                    onAddToCart={onAddToCart}
                    onViewProduct={onViewProduct}
                    onEditProduct={onEditProduct}
                  />
                </div>
              )}

              {/* No Results */}
              {!isSearching && (!searchResults || searchResults.length === 0) && queryImageUrl && (
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
