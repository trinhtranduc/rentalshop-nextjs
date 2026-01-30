'use client';

import React, { useState, useEffect } from 'react';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  CategoryList,
  useToast,
  Button,
  ConfirmationDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  Label,
} from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { postsApi } from '@rentalshop/utils';
import { generateSlug } from '@rentalshop/utils';
import type { PostCategory } from '@rentalshop/types';

export default function CategoriesPage() {
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<PostCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<PostCategory | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    isActive: true,
  });

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const response = await postsApi.getCategories();
        if (response.success && response.data) {
          setCategories(response.data);
        }
      } catch (error) {
        toastError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter categories by search
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase()) ||
    cat.slug.toLowerCase().includes(search.toLowerCase())
  );

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name && !editingCategory) {
      const generatedSlug = generateSlug(formData.name);
      setFormData((prev) => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.name, editingCategory]);

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      isActive: true,
    });
    setShowFormDialog(true);
  };

  const handleEdit = (category: PostCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      isActive: category.isActive ?? true,
    });
    setShowFormDialog(true);
  };

  const handleDelete = (category: PostCategory) => {
    setCategoryToDelete(category);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await postsApi.deleteCategory(categoryToDelete.id);
      if (response.success) {
        toastSuccess('Category deleted successfully');
        setCategories(categories.filter((c) => c.id !== categoryToDelete.id));
      } else {
        toastError('Failed to delete category');
      }
    } catch (error) {
      toastError('Failed to delete category');
    } finally {
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        const response = await postsApi.updateCategory(editingCategory.id, formData);
        if (response.success && response.data) {
          toastSuccess('Category updated successfully');
          setCategories(
            categories.map((c) => (c.id === editingCategory.id ? response.data! : c))
          );
          setShowFormDialog(false);
          setEditingCategory(null);
        } else {
          toastError('Failed to update category');
        }
      } else {
        const response = await postsApi.createCategory(formData);
        if (response.success && response.data) {
          toastSuccess('Category created successfully');
          setCategories([...categories, response.data]);
          setShowFormDialog(false);
          setFormData({
            name: '',
            slug: '',
            description: '',
            isActive: true,
          });
        } else {
          toastError('Failed to create category');
        }
      }
    } catch (error) {
      toastError('Failed to save category');
    }
  };

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Categories</PageTitle>
      </PageHeader>
      <PageContent>
        <CategoryList
          categories={filteredCategories}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreate={handleCreate}
          search={search}
          onSearchChange={setSearch}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={confirmDelete}
          type="danger"
          title="Delete Category"
          description={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`}
        />

        {/* Create/Edit Dialog */}
        <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Category name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="category-slug"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Category description"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowFormDialog(false);
                    setEditingCategory(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageContent>
    </PageWrapper>
  );
}
