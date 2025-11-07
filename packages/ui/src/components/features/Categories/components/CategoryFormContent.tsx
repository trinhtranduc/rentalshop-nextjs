'use client'

import React, { useState, useEffect } from 'react';
import { 
  Button,
  Input,
  Textarea,
  Label
} from '@rentalshop/ui/base';
import { useCategoriesTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { Save, Loader2 } from 'lucide-react';
import type { Category } from '@rentalshop/types';

interface CategoryFormContentProps {
  category?: Category | null;
  onSave: (category: Category) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
  isSubmitting?: boolean;
}

export const CategoryFormContent: React.FC<CategoryFormContentProps> = ({
  category,
  onSave,
  onCancel,
  mode,
  isSubmitting: externalIsSubmitting
}) => {
  const t = useCategoriesTranslations();
  const tc = useCommonTranslations();
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use external isSubmitting if provided, otherwise use internal state
  const submitting = externalIsSubmitting !== undefined ? externalIsSubmitting : isSubmitting;

  // Initialize form data when editing
  useEffect(() => {
    if (category && mode === 'edit') {
      setFormData({
        name: category.name || '',
        description: category.description || ''
      });
    }
  }, [category, mode]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('validation.nameRequired');
    } else if (formData.name.trim().length < 2) {
      newErrors.name = t('validation.nameMinLength');
    } else if (formData.name.trim().length > 50) {
      newErrors.name = t('validation.nameMaxLength');
    }

    if (formData.description && formData.description.trim().length > 200) {
      newErrors.description = t('validation.descriptionMaxLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (externalIsSubmitting === undefined) {
      setIsSubmitting(true);
    }

    try {
      // Prepare category data
      const categoryData: Partial<Category> = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined
      };

      // Call the onSave callback
      await onSave(categoryData as Category);
      
    } catch (error) {
      console.error('Error saving category:', error);
      // Error handling is done by the parent component
    } finally {
      if (externalIsSubmitting === undefined) {
        setIsSubmitting(false);
      }
    }
  };

  const handleCancel = () => {
    if (submitting) return; // Prevent cancellation while submitting
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">{t('fields.name')} *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder={t('fields.name')}
          className={errors.name ? 'border-red-500' : ''}
          disabled={submitting}
          required
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">{t('fields.description')}</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder={t('fields.description')}
          rows={3}
          className={errors.description ? 'border-red-500' : ''}
          disabled={submitting}
        />
        {errors.description && (
          <p className="text-sm text-red-500 mt-1">{errors.description}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {formData.description.length}/200 {t('validation.characters')}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={submitting}
        >
          {tc('buttons.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {tc('buttons.saving')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {mode === 'create' ? t('actions.create') : t('actions.update')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

