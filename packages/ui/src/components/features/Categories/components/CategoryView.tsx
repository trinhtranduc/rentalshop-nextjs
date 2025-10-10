'use client'

import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Label
} from '../../../ui';
import { Edit, Trash2, AlertTriangle } from 'lucide-react';
import type { Category } from '@rentalshop/types';

interface CategoryViewProps {
  category: Category | null;
  onClose: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export const CategoryView: React.FC<CategoryViewProps> = ({
  category,
  onClose,
  onEdit,
  onDelete
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!category) return null;

  const handleEdit = () => {
    onEdit(category);
    onClose();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(category);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <Dialog open={!!category} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Category Details
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                View category information and details
              </DialogDescription>
            </div>
          </DialogHeader>
          {category && (
            <div className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Category Name</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                    <p className="text-gray-900 font-medium">{category.name}</p>
                  </div>
                </div>
                
                {category.description && (
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-gray-700">Description</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                      <p className="text-gray-900 whitespace-pre-wrap">{category.description}</p>
                    </div>
                  </div>
                )}
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">Created</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                    <p className="text-gray-900">
                      {category.createdAt 
                        ? new Date(category.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'Unknown'
                      }
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">Last Updated</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                    <p className="text-gray-900">
                      {category.updatedAt && category.updatedAt !== category.createdAt
                        ? new Date(category.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'Never updated'
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={handleEdit}
                >
                  Edit Category
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete the category <strong>"{category?.name}"</strong>?
            </p>
            <p className="text-sm text-gray-500">
              This action cannot be undone. All products in this category will be affected.
            </p>
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelDelete}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
              >
                Delete Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
