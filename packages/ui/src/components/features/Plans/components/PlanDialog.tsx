'use client'

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@rentalshop/ui';
import { PlanForm } from '@rentalshop/ui';
import type { 
  PlanCreateInput, 
  PlanUpdateInput,
  Plan
} from '@rentalshop/types';

interface PlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  plan?: Plan;
  onSubmit: (data: PlanCreateInput | PlanUpdateInput) => Promise<void>;
  loading?: boolean;
}

export const PlanDialog: React.FC<PlanDialogProps> = ({
  open,
  onOpenChange,
  mode,
  plan,
  onSubmit,
  loading = false
}) => {
  const getDialogTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create New Plan';
      case 'edit':
        return 'Edit Plan';
      case 'view':
        return 'Plan Details';
      default:
        return 'Plan';
    }
  };

  const getDialogDescription = () => {
    switch (mode) {
      case 'create':
        return 'Create a new subscription plan for merchants';
      case 'edit':
        return 'Update the plan information and settings';
      case 'view':
        return 'View plan details and configuration';
      default:
        return '';
    }
  };

  const handleSubmit = async (data: PlanCreateInput | PlanUpdateInput) => {
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting plan:', error);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <PlanForm
          initialData={plan}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
          mode={mode === 'view' ? 'edit' : mode}
          hideHeader={true}
          title={getDialogTitle()}
          submitText={mode === 'create' ? 'Create Plan' : mode === 'edit' ? 'Update Plan' : 'Save Changes'}
        />
      </DialogContent>
    </Dialog>
  );
};
