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
import { useCategoriesTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { useLocale } from 'next-intl';
import { formatDateWithLocale } from '@rentalshop/utils';
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
  const t = useCategoriesTranslations();
  const tc = useCommonTranslations();
  const locale = useLocale();
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
                {t('dialog.viewDetails')}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {t('dialog.viewDescription')}
              </DialogDescription>
            </div>
          </DialogHeader>
          {category && (
            <div className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700">{t('fields.name')}</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                    <p className="text-gray-900 font-medium">{category.name}</p>
                  </div>
                </div>
                
                {category.description && (
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-gray-700">{t('fields.description')}</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                      <p className="text-gray-900 whitespace-pre-wrap">{category.description}</p>
                    </div>
                  </div>
                )}
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">{tc('labels.createdAt')}</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                    <p className="text-gray-900">
                      {category.createdAt 
                        ? formatDateWithLocale(category.createdAt, locale as 'en' | 'vi')
                        : tc('labels.unknown')
                      }
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">{tc('labels.updatedAt')}</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                    <p className="text-gray-900">
                      {category.updatedAt && category.updatedAt !== category.createdAt
                        ? formatDateWithLocale(category.updatedAt, locale as 'en' | 'vi')
                        : t('dialog.neverUpdated')
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
                  {tc('buttons.close')}
                </Button>
                <Button
                  type="button"
                  onClick={handleEdit}
                >
                  {t('actions.edit')}
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
            <DialogTitle>{t('dialog.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('dialog.deleteConfirmation')} <strong>"{category?.name}"</strong>?
            </p>
            <p className="text-sm text-gray-500">
              {t('dialog.deleteWarning')}
            </p>
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelDelete}
              >
                {tc('buttons.cancel')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
              >
                {t('actions.delete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
