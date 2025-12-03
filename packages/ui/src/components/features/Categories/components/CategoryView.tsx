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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold">
              {t('dialog.viewDetails')}
            </DialogTitle>
            <DialogDescription className="mt-1">
              {t('dialog.viewDescription')}
            </DialogDescription>
          </DialogHeader>
          {category && (
            <div className="px-6 py-4 overflow-y-auto">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('fields.name')}</Label>
                    <p className="text-sm font-semibold">{category.name}</p>
                  </div>
                  
                  {category.description && (
                    <div className="md:col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('fields.description')}</Label>
                      <p className="text-sm whitespace-pre-wrap">{category.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{tc('labels.createdAt')}</Label>
                    <p className="text-sm">
                      {category.createdAt 
                        ? formatDateWithLocale(category.createdAt, locale as 'en' | 'vi')
                        : tc('labels.unknown')
                      }
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{tc('labels.updatedAt')}</Label>
                    <p className="text-sm">
                      {category.updatedAt && category.updatedAt !== category.createdAt
                        ? formatDateWithLocale(category.updatedAt, locale as 'en' | 'vi')
                        : t('dialog.neverUpdated')
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold">
              {t('dialog.deleteTitle')}
            </DialogTitle>
            <DialogDescription className="mt-1">
              {t('dialog.deleteWarning')}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 overflow-y-auto">
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                {t('dialog.deleteConfirmation')} <strong>"{category?.name}"</strong>?
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
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
