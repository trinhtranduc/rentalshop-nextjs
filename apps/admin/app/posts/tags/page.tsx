'use client';

import React, { useState, useEffect } from 'react';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  TagList,
  useToast,
  Button,
  ConfirmationDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { postsApi } from '@rentalshop/utils';
import { generateSlug } from '@rentalshop/utils';
import type { PostTag } from '@rentalshop/types';

export default function TagsPage() {
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [tags, setTags] = useState<PostTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<PostTag | null>(null);
  const [editingTag, setEditingTag] = useState<PostTag | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  // Fetch tags
  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      try {
        const response = await postsApi.getTags();
        if (response.success && response.data) {
          setTags(response.data);
        }
      } catch (error) {
        toastError('Failed to load tags');
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter tags by search
  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase()) ||
    tag.slug.toLowerCase().includes(search.toLowerCase())
  );

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name && !editingTag) {
      const generatedSlug = generateSlug(formData.name);
      setFormData((prev) => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.name, editingTag]);

  const handleCreate = () => {
    setEditingTag(null);
    setFormData({
      name: '',
      slug: '',
    });
    setShowFormDialog(true);
  };

  const handleEdit = (tag: PostTag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      slug: tag.slug,
    });
    setShowFormDialog(true);
  };

  const handleDelete = (tag: PostTag) => {
    setTagToDelete(tag);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!tagToDelete) return;

    try {
      const response = await postsApi.deleteTag(tagToDelete.id);
      if (response.success) {
        toastSuccess('Tag deleted successfully');
        setTags(tags.filter((t) => t.id !== tagToDelete.id));
      } else {
        toastError('Failed to delete tag');
      }
    } catch (error) {
      toastError('Failed to delete tag');
    } finally {
      setShowDeleteDialog(false);
      setTagToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTag) {
        const response = await postsApi.updateTag(editingTag.id, formData);
        if (response.success && response.data) {
          toastSuccess('Tag updated successfully');
          setTags(tags.map((t) => (t.id === editingTag.id ? response.data! : t)));
          setShowFormDialog(false);
          setEditingTag(null);
        } else {
          toastError('Failed to update tag');
        }
      } else {
        const response = await postsApi.createTag(formData);
        if (response.success && response.data) {
          toastSuccess('Tag created successfully');
          setTags([...tags, response.data]);
          setShowFormDialog(false);
          setFormData({
            name: '',
            slug: '',
          });
        } else {
          toastError('Failed to create tag');
        }
      }
    } catch (error) {
      toastError('Failed to save tag');
    }
  };

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Tags</PageTitle>
      </PageHeader>
      <PageContent>
        <TagList
          tags={filteredTags}
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
          title="Delete Tag"
          description={`Are you sure you want to delete "${tagToDelete?.name}"? This action cannot be undone.`}
        />

        {/* Create/Edit Dialog */}
        <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTag ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Tag name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="tag-slug"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowFormDialog(false);
                    setEditingTag(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTag ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageContent>
    </PageWrapper>
  );
}
