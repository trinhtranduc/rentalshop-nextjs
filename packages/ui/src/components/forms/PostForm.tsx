'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  useToast,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui';
import { RichTextEditor, PostContent } from '../features/Posts';
import { generateSlug, uploadImage, getAuthToken, type UploadProgress } from '@rentalshop/utils';
import { X, Upload, Image as ImageIcon, Loader2, Eye } from 'lucide-react';
import type { PostCreateInput, PostUpdateInput, PostCategory, PostTag } from '@rentalshop/types';

interface PostFormProps {
  initialData?: Partial<PostCreateInput>;
  categories?: PostCategory[];
  tags?: PostTag[];
  onSubmit: (data: PostCreateInput | PostUpdateInput) => void;
  onCancel?: () => void;
  loading?: boolean;
  mode?: 'create' | 'edit';
}

export function PostForm({
  initialData = {},
  categories = [],
  tags = [],
  onSubmit,
  onCancel,
  loading = false,
  mode = 'create',
}: PostFormProps) {
  const { toastError, toastSuccess } = useToast();
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    slug: initialData.slug || '',
    content: initialData.content || '',
    excerpt: initialData.excerpt || '',
    seoTitle: initialData.seoTitle || '',
    seoDescription: initialData.seoDescription || '',
    seoKeywords: initialData.seoKeywords || '',
    status: initialData.status || ('DRAFT' as 'DRAFT' | 'PUBLISHED'),
    categoryIds: initialData.categoryIds || [],
    tagIds: initialData.tagIds || [],
    featuredImage: initialData.featuredImage || '',
  });

  const [selectedCategories, setSelectedCategories] = useState<number[]>(formData.categoryIds);
  const [selectedTags, setSelectedTags] = useState<number[]>(formData.tagIds);
  const [tagSearch, setTagSearch] = useState('');
  const [filteredTags, setFilteredTags] = useState(tags);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Clear invalid slug on mount if in create mode
  useEffect(() => {
    if (mode === 'create' && formData.slug && !formData.title) {
      // If slug exists but title is empty, clear the slug
      setFormData((prev) => ({ ...prev, slug: '' }));
    }
  }, [mode]);

  // Auto-generate slug from title (only in create mode and if slug hasn't been manually edited)
  useEffect(() => {
    if (mode === 'create' && formData.title && !slugManuallyEdited) {
      const generatedSlug = generateSlug(formData.title);
      // Always update slug if it hasn't been manually edited
      // This ensures slug always matches the title in create mode
      if (generatedSlug && formData.slug !== generatedSlug) {
      setFormData((prev) => ({ ...prev, slug: generatedSlug }));
      }
    }
  }, [formData.title, mode, slugManuallyEdited]);

  // Filter tags based on search
  useEffect(() => {
    if (tagSearch.trim()) {
      setFilteredTags(
        tags.filter((tag) =>
          tag.name.toLowerCase().includes(tagSearch.toLowerCase())
        )
      );
    } else {
      setFilteredTags(tags);
    }
  }, [tagSearch, tags]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toastError('Title is required');
      return;
    }

    if (!formData.slug.trim()) {
      toastError('Slug is required');
      return;
    }

    if (!formData.content.trim()) {
      toastError('Content is required');
      return;
    }

    onSubmit({
      ...formData,
      categoryIds: selectedCategories,
      tagIds: selectedTags,
    });
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toastError('Invalid file type. Please upload an image.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toastError('Image size must be less than 5MB.');
      return;
    }

    setUploadingImage(true);
    setUploadProgress({ loaded: 0, total: file.size, percentage: 0, stage: 'uploading' });

    try {
      const token = await getAuthToken();
      if (!token) {
        toastError('Authentication required. Please log in.');
        return;
      }

      const result = await uploadImage(file, token, {
        folder: 'blog',
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        enableCompression: true,
        compressionQuality: 0.8,
        maxSizeMB: 2, // Max 2MB after compression
        onProgress: (progress: UploadProgress) => {
          setUploadProgress(progress);
        },
      });

      if (result.success && result.data?.url) {
        setFormData((prev) => ({ ...prev, featuredImage: result.data!.url }));
        toastSuccess('Image uploaded successfully!');
      } else {
        toastError(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toastError('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      setUploadProgress(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'Create Post' : 'Edit Post'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter post title"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium mb-2">Slug *</label>
            <Input
              value={formData.slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                setFormData((prev) => ({ ...prev, slug: e.target.value }));
              }}
              placeholder="url-friendly-slug"
              required
            />
            <p className="text-xs text-text-tertiary mt-1">
              {slugManuallyEdited 
                ? 'Slug manually edited. It will not auto-update when title changes.'
                : 'Auto-generated from title. You can edit it manually.'}
            </p>
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm font-medium mb-2">Featured Image</label>
            
            {/* Image Preview */}
            {formData.featuredImage && (
              <div className="mb-3 relative inline-block">
                <img
                  src={formData.featuredImage}
                  alt="Featured image preview"
                  className="w-full max-w-md h-48 object-cover rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, featuredImage: '' }))}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Upload Button */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </>
                )}
              </Button>
              
              {/* Manual URL Input */}
              <div className="flex-1">
                <Input
                  value={formData.featuredImage}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, featuredImage: e.target.value }))
                  }
                  placeholder="Or enter image URL..."
                  disabled={uploadingImage}
                />
              </div>
            </div>

            {/* Upload Progress */}
            {uploadProgress && uploadingImage && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-action-primary h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  {uploadProgress.percentage}% uploaded
                </p>
              </div>
            )}

            <p className="text-xs text-text-tertiary mt-1">
              Upload an image or paste an image URL. Max size: 5MB. Recommended: 1920x1080px
            </p>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium mb-2">Excerpt</label>
            <Textarea
              value={formData.excerpt}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
              }
              placeholder="Short description for previews"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-text-tertiary mt-1">
              {formData.excerpt.length}/500 characters
            </p>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium mb-2">Content *</label>
            <RichTextEditor
              content={formData.content}
              onChange={(content) =>
                setFormData((prev) => ({ ...prev, content }))
              }
              placeholder="Start writing your post..."
            />
          </div>
        </CardContent>
      </Card>

      {/* SEO Section */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">SEO Title</label>
            <Input
              value={formData.seoTitle}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, seoTitle: e.target.value }))
              }
              placeholder="SEO optimized title (max 60 characters)"
              maxLength={60}
            />
            <p className="text-xs text-text-tertiary mt-1">
              {formData.seoTitle.length}/60 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">SEO Description</label>
            <Textarea
              value={formData.seoDescription}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, seoDescription: e.target.value }))
              }
              placeholder="SEO meta description (max 160 characters)"
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-text-tertiary mt-1">
              {formData.seoDescription.length}/160 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">SEO Keywords</label>
            <Input
              value={formData.seoKeywords}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, seoKeywords: e.target.value }))
              }
              placeholder="keyword1, keyword2, keyword3"
              maxLength={255}
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories & Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Categories & Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Categories */}
          <div>
            <label className="block text-sm font-medium mb-2">Categories</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedCategories.map((categoryId) => {
                const category = categories.find((c) => c.id === categoryId);
                return category ? (
                  <Badge
                    key={categoryId}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => toggleCategory(categoryId)}
                  >
                    {category.name}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ) : null;
              })}
            </div>
            <Select
              value=""
              onValueChange={(value) => {
                const categoryId = parseInt(value);
                if (categoryId && !selectedCategories.includes(categoryId)) {
                  toggleCategory(categoryId);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((c) => !selectedCategories.includes(c.id))
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedTags.map((tagId) => {
                const tag = tags.find((t) => t.id === tagId);
                return tag ? (
                  <Badge
                    key={tagId}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => toggleTag(tagId)}
                  >
                    {tag.name}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ) : null;
              })}
            </div>
            <Input
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Search tags..."
              className="mb-2"
            />
            <Select
              value=""
              onValueChange={(value) => {
                const tagId = parseInt(value);
                if (tagId && !selectedTags.includes(tagId)) {
                  toggleTag(tagId);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tag" />
              </SelectTrigger>
              <SelectContent>
                {filteredTags
                  .filter((t) => !selectedTags.includes(t.id))
                  .map((tag) => (
                    <SelectItem key={tag.id} value={tag.id.toString()}>
                      {tag.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Status & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Select
              value={formData.status}
              onValueChange={(value: 'DRAFT' | 'PUBLISHED') =>
                setFormData((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(true)}
                disabled={!formData.title || !formData.content}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : mode === 'create' ? 'Create Post' : 'Update Post'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Featured Image */}
            {formData.featuredImage && (
              <img
                src={formData.featuredImage}
                alt={formData.title}
                className="w-full h-auto rounded-lg"
              />
            )}

            {/* Title */}
            <h1 className="text-3xl font-bold">{formData.title || 'Untitled Post'}</h1>

            {/* Meta Information */}
            <div className="flex items-center gap-4 text-sm text-text-tertiary">
              <span>
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              {selectedCategories.length > 0 && (
                <div className="flex items-center gap-2">
                  <span>Categories:</span>
                  <div className="flex gap-1">
                    {selectedCategories.map((categoryId) => {
                      const category = categories.find((c) => c.id === categoryId);
                      return category ? (
                        <Badge key={categoryId} variant="outline">
                          {category.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              {selectedTags.length > 0 && (
                <div className="flex items-center gap-2">
                  <span>Tags:</span>
                  <div className="flex gap-1">
                    {selectedTags.map((tagId) => {
                      const tag = tags.find((t) => t.id === tagId);
                      return tag ? (
                        <Badge key={tagId} variant="secondary">
                          {tag.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Excerpt */}
            {formData.excerpt && (
              <p className="text-lg text-text-secondary italic">{formData.excerpt}</p>
            )}

            {/* Content */}
            {formData.content ? (
              <PostContent content={formData.content} />
            ) : (
              <p className="text-text-tertiary italic">No content yet...</p>
            )}

            {/* SEO Information */}
            {(formData.seoTitle || formData.seoDescription || formData.seoKeywords) && (
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">SEO Information</h3>
                <div className="space-y-2 text-sm">
                  {formData.seoTitle && (
                    <div>
                      <span className="font-medium">SEO Title:</span> {formData.seoTitle}
                    </div>
                  )}
                  {formData.seoDescription && (
                    <div>
                      <span className="font-medium">SEO Description:</span> {formData.seoDescription}
                    </div>
                  )}
                  {formData.seoKeywords && (
                    <div>
                      <span className="font-medium">SEO Keywords:</span> {formData.seoKeywords}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
