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
} from '../ui';
import { RichTextEditor, AIContentGenerator, SEOScoreCard } from '../features/Posts';
import { generateSlug, uploadImage, getAuthToken, type UploadProgress, aiApi } from '@rentalshop/utils';
import { X, Upload, Image as ImageIcon, Loader2, Sparkles, TrendingUp } from 'lucide-react';
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // AI features
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showSEOAnalysis, setShowSEOAnalysis] = useState(false);
  const [seoAnalysis, setSeoAnalysis] = useState<any>(null);
  const [analyzingSEO, setAnalyzingSEO] = useState(false);

  // Auto-generate slug from title
  useEffect(() => {
    if (mode === 'create' && formData.title && !formData.slug) {
      const generatedSlug = generateSlug(formData.title);
      setFormData((prev) => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.title, mode, formData.slug]);

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
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
              placeholder="url-friendly-slug"
              required
            />
            <p className="text-xs text-text-tertiary mt-1">
              Auto-generated from title. You can edit it manually.
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

      {/* AI Content Generator Dialog */}
      {showAIGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <AIContentGenerator
                onContentGenerated={(aiContent) => {
                  setFormData((prev) => ({
                    ...prev,
                    title: aiContent.title,
                    slug: aiContent.suggestedSlug,
                    content: aiContent.content,
                    excerpt: aiContent.excerpt,
                    seoTitle: aiContent.seoTitle || aiContent.title,
                    seoDescription: aiContent.metaDescription,
                    seoKeywords: aiContent.seoKeywords || aiContent.keywords.join(', '),
                  }));
                  setShowAIGenerator(false);
                  toastSuccess('AI content has been loaded into the form!');
                }}
                onCancel={() => setShowAIGenerator(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* SEO Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>SEO Settings</CardTitle>
            {formData.content && formData.title && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAnalyzeSEO}
                disabled={analyzingSEO}
              >
                {analyzingSEO ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Analyze SEO
                  </>
                )}
              </Button>
            )}
          </div>
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

      {/* SEO Analysis Results */}
      {showSEOAnalysis && seoAnalysis && (
        <SEOScoreCard analysis={seoAnalysis} />
      )}

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
    </form>
  );
}
