import React, { useState, useEffect } from 'react';
import { 
  MerchantListHeader,
  MerchantFilters,
  MerchantTable,
  MerchantPagination,
  MerchantPlanDialog
} from './components';
import type { Merchant, Plan, PlanVariant } from '@rentalshop/types';

interface MerchantFiltersData {
  search: string;
  status: string;
  plan: string;
}

interface MerchantsData {
  merchants: Merchant[];
  total: number;
  currentPage: number;
  totalPages: number;
  stats: {
    totalMerchants: number;
    activeMerchants: number;
    trialAccounts: number;
    totalRevenue: number;
  };
}

interface MerchantsProps {
  data: MerchantsData;
  filters: MerchantFiltersData;
  onFiltersChange: (filters: MerchantFiltersData) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  onMerchantAction: (action: string, merchantId: number) => void;
  onPageChange: (page: number) => void;
  onSort?: (column: string) => void;
}

export function Merchants({ 
  data, 
  filters, 
  onFiltersChange, 
  onSearchChange,
  onClearFilters,
  onMerchantAction, 
  onPageChange,
  onSort
}: MerchantsProps) {
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planVariants, setPlanVariants] = useState<PlanVariant[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Load plans when component mounts
  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoadingPlans(true);
      const { plansApi, planVariantsApi } = await import('@rentalshop/utils');
      
      // Load plans and variants in parallel
      const [plansResponse, variantsResponse] = await Promise.all([
        plansApi.getPlans(),
        planVariantsApi.getPlanVariants()
      ]);
      
      console.log('Plans API Response:', plansResponse);
      console.log('Plan Variants API Response:', variantsResponse);
      
      if (plansResponse.success && plansResponse.data) {
        setPlans(plansResponse.data.plans || []);
        console.log('Plans loaded:', plansResponse.data.plans?.length || 0);
      }
      
      if (variantsResponse.success && variantsResponse.data) {
        setPlanVariants(variantsResponse.data.variants || []);
        console.log('Plan variants loaded:', variantsResponse.data.variants?.length || 0);
      } else {
        console.error('Plan variants API failed:', variantsResponse);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleMerchantAction = (action: string, merchantId: number) => {
    if (action === 'change-plan') {
      const merchant = data.merchants.find(m => m.id === merchantId);
      if (merchant) {
        setSelectedMerchant(merchant);
        setShowPlanDialog(true);
      }
    } else {
      onMerchantAction(action, merchantId);
    }
  };

  const handlePlanChange = async (planData: {
    planId: number;
    planVariantId?: number;
    reason?: string;
    effectiveDate?: string;
    notifyMerchant?: boolean;
  }) => {
    if (!selectedMerchant) return;

    try {
      const { merchantsApi } = await import('@rentalshop/utils');
      const response = await merchantsApi.updateMerchantPlan(selectedMerchant.id, planData);
      
      if (response.success) {
        // Refresh the merchants list
        window.location.reload(); // Simple refresh for now
      } else {
        throw new Error(response.message || 'Failed to update plan');
      }
    } catch (error) {
      console.error('Error changing plan:', error);
      throw error;
    }
  };

  const handleClosePlanDialog = () => {
    setShowPlanDialog(false);
    setSelectedMerchant(null);
  };

  return (
    <div className="space-y-6">
      <MerchantListHeader stats={data.stats} />
      
      <MerchantFilters 
        filters={filters}
        onFiltersChange={onFiltersChange}
        onSearchChange={onSearchChange}
        onClearFilters={onClearFilters}
      />      
      
      <MerchantTable 
        merchants={data.merchants}
        onMerchantAction={handleMerchantAction}
        sortBy={filters.search ? 'name' : 'createdAt'}
        sortOrder="desc"
        onSort={onSort}
      />
      
      <MerchantPagination 
        currentPage={data.currentPage}
        totalPages={data.totalPages}
        total={data.total}
        onPageChange={onPageChange}
        startIndex={(data.currentPage - 1) * 10}
        endIndex={data.currentPage * 10}
      />

      {/* Plan Change Dialog */}
      {selectedMerchant && (
        <MerchantPlanDialog
          isOpen={showPlanDialog}
          onClose={handleClosePlanDialog}
          onConfirm={handlePlanChange}
          merchant={{
            id: selectedMerchant.id,
            name: selectedMerchant.name,
            email: selectedMerchant.email,
            currentPlan: (selectedMerchant as any).currentPlan,
            subscriptionStatus: selectedMerchant.subscriptionStatus
          }}
          plans={plans}
          planVariants={planVariants}
          loading={loadingPlans}
        />
      )}
    </div>
  );
}

export default Merchants;
