'use client'

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  useToast
} from '@rentalshop/ui';
import { PlanForm } from '../../../forms/PlanForm';
import { plansApi } from '@rentalshop/utils';
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
  planId?: number; // Optional: allow passing planId directly for auto-load
  onSubmit: (data: PlanCreateInput | PlanUpdateInput) => Promise<void>;
  loading?: boolean;
}

export const PlanDialog: React.FC<PlanDialogProps> = ({
  open,
  onOpenChange,
  mode,
  plan: initialPlan,
  planId,
  onSubmit,
  loading = false
}) => {
  const { toastError } = useToast();
  const [plan, setPlan] = useState<Plan | undefined>(initialPlan);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // Debug logs
  console.log('📝 PlanDialog render:', {
    open,
    mode,
    hasPlan: !!plan,
    planId: plan?.id || planId,
    planName: plan?.name
  });

  // Auto-load plan when in edit mode and planId is provided
  useEffect(() => {
    const loadPlan = async () => {
      // Only load if:
      // 1. Dialog is open
      // 2. In edit mode
      // 3. We have a planId (either from prop or from plan.id)
      // 4. We don't already have plan data (or we want to refresh)
      if (!open || mode !== 'edit') {
        return;
      }

      const targetPlanId = planId || initialPlan?.id;
      if (!targetPlanId) {
        console.log('⚠️ PlanDialog: No planId provided for edit mode');
        return;
      }

      // If we already have plan data and it matches the planId, skip loading
      if (plan && plan.id === targetPlanId) {
        console.log('✅ PlanDialog: Plan data already available, skipping load');
        return;
      }

      try {
        setLoadingPlan(true);
        console.log('🔄 PlanDialog: Loading plan with ID:', targetPlanId);
        
        const response = await plansApi.getPlanById(targetPlanId);
        
        if (response.success && response.data) {
          // Transform API response to ensure proper format
          const loadedPlan = transformPlanData(response.data);
          setPlan(loadedPlan);
          console.log('✅ PlanDialog: Plan loaded successfully:', loadedPlan);
        } else {
          throw new Error(response.error || 'Failed to load plan');
        }
      } catch (error) {
        console.error('❌ PlanDialog: Error loading plan:', error);
        toastError(
          'Failed to Load Plan',
          error instanceof Error ? error.message : 'An error occurred while loading the plan'
        );
        // Don't close dialog, just show error
      } finally {
        setLoadingPlan(false);
      }
    };

    loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, planId, initialPlan?.id]); // plan is intentionally excluded to avoid infinite loops

  // Reset plan when dialog closes
  useEffect(() => {
    if (!open) {
      // Reset to initial plan when dialog closes
      setPlan(initialPlan);
    }
    // Note: We don't update plan when initialPlan changes while dialog is open
    // because the first useEffect handles loading plan data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /**
   * Transform plan data from API to ensure proper format for PlanForm
   */
  const transformPlanData = (planData: any): Plan => {
    // Handle limits - can be object or JSON string
    let limits: any = {};
    if (planData.limits) {
      if (typeof planData.limits === 'string') {
        try {
          limits = JSON.parse(planData.limits);
        } catch (e) {
          console.error('Error parsing limits:', e);
          limits = {};
        }
      } else {
        limits = planData.limits;
      }
    }

    // Handle features - can be array or JSON string
    let features: string[] = [];
    if (planData.features) {
      if (typeof planData.features === 'string') {
        try {
          features = JSON.parse(planData.features || '[]');
        } catch (e) {
          console.error('Error parsing features:', e);
          features = [];
        }
      } else if (Array.isArray(planData.features)) {
        features = planData.features;
      }
    }

    // Check if this is a contact price plan (basePrice = 0 and description contains contact text)
    let basePrice: number | string = planData.basePrice ?? 0;
    const description = planData.description || '';
    if (basePrice === 0 && description) {
      const descLower = description.toLowerCase();
      if (descLower.includes('liên hệ') || descLower.includes('contact')) {
        // Keep basePrice as 0 but we'll detect it in PlanForm via description
        basePrice = 0;
      }
    }

    // Ensure all required fields are present
    return {
      id: planData.id,
      name: planData.name || '',
      description: description,
      basePrice: basePrice,
      currency: planData.currency || 'USD',
      trialDays: planData.trialDays ?? 0,
      limits: {
        outlets: limits.outlets ?? -1,
        users: limits.users ?? -1,
        products: limits.products ?? -1,
        customers: limits.customers ?? -1,
        orders: limits.orders ?? -1,
        allowWebAccess: limits.allowWebAccess ?? true,
        allowMobileAccess: limits.allowMobileAccess ?? true,
      },
      features: features,
      isActive: planData.isActive ?? true,
      isPopular: planData.isPopular ?? false,
      sortOrder: planData.sortOrder ?? 0,
      pricing: planData.pricing || {
        monthly: { price: planData.basePrice || 0, discount: 0, savings: 0 },
        quarterly: { price: (planData.basePrice || 0) * 3, discount: 0, savings: 0 },
        semi_annual: { price: (planData.basePrice || 0) * 6 * 0.95, discount: 5, savings: (planData.basePrice || 0) * 6 * 0.05 },
        annual: { price: (planData.basePrice || 0) * 12 * 0.90, discount: 10, savings: (planData.basePrice || 0) * 12 * 0.10 },
      },
      createdAt: planData.createdAt ? new Date(planData.createdAt) : new Date(),
      updatedAt: planData.updatedAt ? new Date(planData.updatedAt) : new Date(),
      ...(planData.deletedAt && { deletedAt: new Date(planData.deletedAt) }),
    };
  };

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

  // Show loading state while fetching plan
  const isLoading = loadingPlan || (mode === 'edit' && !plan && open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-action-primary"></div>
              <p className="text-text-secondary">Loading plan data...</p>
            </div>
          </div>
        ) : (
        <PlanForm
          initialData={plan}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
            mode={mode === 'view' ? 'edit' : mode} // PlanForm doesn't support 'view', use 'edit' instead
          hideHeader={true}
          title={getDialogTitle()}
            submitText={mode === 'create' ? 'Create Plan' : mode === 'edit' || mode === 'view' ? 'Update Plan' : 'Save Changes'}
        />
        )}
      </DialogContent>
    </Dialog>
  );
};
