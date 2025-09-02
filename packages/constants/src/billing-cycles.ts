// ============================================================================
// BILLING CYCLE CONSTANTS
// ============================================================================

export interface BillingCycleOption {
  value: string;
  label: string;
  months: number;
  description: string;
}

export const BILLING_CYCLES: BillingCycleOption[] = [
  {
    value: 'monthly',
    label: 'Monthly',
    months: 1,
    description: 'Billed every month'
  },
  {
    value: 'quarterly',
    label: 'Quarterly (3 Months)',
    months: 3,
    description: 'Billed every 3 months'
  },
  {
    value: 'semi_annual',
    label: 'Semi-Annual (6 Months)',
    months: 6,
    description: 'Billed every 6 months'
  },
  {
    value: 'annual',
    label: 'Annual (12 Months)',
    months: 12,
    description: 'Billed every 12 months'
  }
];

export const BILLING_CYCLE_MAP = {
  monthly: { label: 'Monthly', months: 1, discount: 0 },
  quarterly: { label: 'Quarterly', months: 3, discount: 5 }, // 5% discount
  semi_annual: { label: 'Semi-Annual', months: 6, discount: 10 }, // 10% discount
  annual: { label: 'Annual', months: 12, discount: 20 } // 20% discount
};

export const getBillingCycleOption = (cycle: string): BillingCycleOption | undefined => {
  return BILLING_CYCLES.find(option => option.value === cycle);
};

export const getBillingCycleMonths = (cycle: string): number => {
  const option = getBillingCycleOption(cycle);
  return option ? option.months : 1;
};

export const getBillingCycleDiscount = (cycle: string): number => {
  return BILLING_CYCLE_MAP[cycle as keyof typeof BILLING_CYCLE_MAP]?.discount || 0;
};

export const calculateDiscountedPrice = (basePrice: number, cycle: string): number => {
  const discount = getBillingCycleDiscount(cycle);
  const months = getBillingCycleMonths(cycle);
  const totalPrice = basePrice * months;
  const discountAmount = totalPrice * (discount / 100);
  return totalPrice - discountAmount;
};

export const formatBillingCycle = (cycle: string): string => {
  const option = getBillingCycleOption(cycle);
  return option ? option.label : cycle;
};

export const getBillingCycleDescription = (cycle: string): string => {
  const option = getBillingCycleOption(cycle);
  return option ? option.description : '';
};
