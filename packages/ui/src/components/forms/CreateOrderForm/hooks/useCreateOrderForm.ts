/**
 * Custom hook for managing CreateOrderForm state and logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@rentalshop/ui';
import { customersApi, handleApiError, convertLocalDateToUTCDatetime } from '@rentalshop/utils';
import { BUSINESS, VALIDATION } from '@rentalshop/constants';
import type { 
  OrderFormData, 
  OrderItemFormData, 
  ValidationErrors,
  CreateOrderFormProps 
} from '../types';

// ---- Pricing option helpers (multi-option products) ----
const deriveRentalDays = (start?: string, end?: string): number => {
  if (!start || !end) return 1;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return 1;
  const days = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 1;
};

const getItemOptions = (item: OrderItemFormData): Array<{ id?: number; type: string; price: number; isDefault?: boolean }> =>
  (item.product?.pricingOptions as any[]) || [];

const getPreferredPricingOption = <T extends { type: string; isDefault?: boolean }>(options: T[]): T | null =>
  // Respect merchant default first (may be DAILY). Fall back to FIXED, then first option.
  options.find(option => option.isDefault) ||
  options.find(option => option.type === 'FIXED') ||
  options[0] ||
  null;

const resolveItemOption = (item: OrderItemFormData) => {
  const opts = getItemOptions(item);
  if (opts.length === 0) return null;
  if (item.selectedPricingOptionId != null) {
    const found = opts.find(o => o.id === item.selectedPricingOptionId);
    if (found) return found;
  }
  if (item.pricingType) {
    const matchingType = opts.find(option => option.type === item.pricingType);
    if (matchingType) return matchingType;
  }
  return getPreferredPricingOption(opts);
};

const resolveItemPricingType = (item: OrderItemFormData): string => {
  const opt = resolveItemOption(item);
  if (opt) return opt.type;
  return (item.pricingType || item.product?.pricingType || 'FIXED') as string;
};

const computeLineTotal = (item: OrderItemFormData, orderType: 'RENT' | 'SALE', days: number): number => {
  const qty = item.quantity || 1;
  const unit = item.unitPrice || 0;
  if (orderType === 'RENT' && resolveItemPricingType(item) === 'DAILY') {
    return unit * qty * Math.max(1, days);
  }
  return unit * qty;
};

/** Map API/order item → form item, preserving daily/hourly pricing snapshot. */
const mapInitialOrderItem = (item: any): OrderItemFormData => {
  const rentPrice = item.product?.rentPrice ?? item.unitPrice ?? 0;
  const salePrice = item.product?.salePrice ?? rentPrice;
  const pricingOptions = item.product?.pricingOptions ?? [];
  const pricingType = item.pricingType ?? item.product?.pricingType ?? 'FIXED';

  return {
    id: item.id,
    productId: item.product?.id || item.productId || 0,
    product: {
      id: item.product?.id || item.productId || 0,
      name: item.product?.name || item.productName || 'Unknown Product',
      description: item.product?.description || '',
      images: item.product?.images || item.productImages || null,
      barcode: item.product?.barcode || item.productBarcode || '',
      rentPrice,
      salePrice,
      deposit: item.deposit ?? 0,
      pricingType: item.product?.pricingType ?? null,
      pricingOptions,
      outletStock: item.product?.outletStock || [],
      stock: item.product?.stock,
      available: item.product?.available,
      renting: item.product?.renting,
    },
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice || 0,
    totalPrice: item.totalPrice || 0,
    rentalDays: item.rentalDays || 1,
    deposit: item.deposit ?? 0,
    notes: item.notes || '',
    selectedPricingOptionId:
      item.pricingOptionId ??
      pricingOptions.find((option: any) => option.type === pricingType)?.id ??
      null,
    pricingType,
  };
};

export const useCreateOrderForm = (props: CreateOrderFormProps) => {
  const {
    outlets = [],
    products = [],
    isEditMode = false,
    initialOrder,
    merchantId
  } = props;

  // Form state
  const [formData, setFormData] = useState<OrderFormData>(() => {
    // Initialize with existing order data if in edit mode
    if (isEditMode && initialOrder) {
      return {
        orderType: initialOrder.orderType || 'RENT',
        customerId: parseInt(initialOrder.customerId) || undefined,
        outletId: initialOrder.outletId || outlets[0]?.id || undefined,
        pickupPlanAt: initialOrder.pickupPlanAt ? new Date(initialOrder.pickupPlanAt).toISOString().split('T')[0] : '',
        returnPlanAt: initialOrder.returnPlanAt ? new Date(initialOrder.returnPlanAt).toISOString().split('T')[0] : '',
        subtotal: initialOrder.subtotal || 0,
        taxAmount: initialOrder.taxAmount || 0,
        discountType: initialOrder.discountType || 'amount',
        discountValue: initialOrder.discountValue || BUSINESS.DEFAULT_DISCOUNT,
        discountAmount: initialOrder.discountAmount || BUSINESS.DEFAULT_DISCOUNT,
        depositAmount: initialOrder.depositAmount || BUSINESS.DEFAULT_DEPOSIT,
        securityDeposit: initialOrder.securityDeposit || 0,
        lateFee: initialOrder.lateFee || 0,
        damageFee: initialOrder.damageFee || 0,
        totalAmount: initialOrder.totalAmount || 0,
        notes: initialOrder.notes || '',
        orderItems: [],
      };
    }
    
    // Default values for create mode
    return {
      orderType: 'RENT',
      customerId: undefined,
      outletId: outlets[0]?.id || undefined,
      pickupPlanAt: '',
      returnPlanAt: '',
      subtotal: 0,
      taxAmount: 0,
      discountType: 'amount',
      discountValue: BUSINESS.DEFAULT_DISCOUNT,
      discountAmount: BUSINESS.DEFAULT_DISCOUNT,
      depositAmount: BUSINESS.DEFAULT_DEPOSIT,
      securityDeposit: 0,
      lateFee: 0,
      damageFee: 0,
      totalAmount: 0,
      notes: '',
      orderItems: [],
    };
  });

  const [orderItems, setOrderItems] = useState<OrderItemFormData[]>(() => {
    // Initialize with existing order items if in edit mode
    if (isEditMode && initialOrder?.orderItems) {
      return initialOrder.orderItems.map(mapInitialOrderItem);
    }
    return [];
  });

  // Use a ref to track the current orderItems state to avoid stale closures
  const orderItemsRef = useRef<OrderItemFormData[]>(orderItems);
  
  // Update the ref whenever orderItems state changes
  useEffect(() => {
    orderItemsRef.current = orderItems;
  }, [orderItems]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast notifications
  const { toastSuccess, toastError } = useToast();

  // Calculate totals when order items change
  useEffect(() => {
    const days = deriveRentalDays(formData.pickupPlanAt, formData.returnPlanAt);
    const subtotal = orderItems.reduce((sum, item) => sum + computeLineTotal(item, formData.orderType, days), 0);

    // Calculate discount amount with validation
    let discountAmount = 0;
    if (formData.discountType === 'percentage') {
      // For percentage: limit to max 100%
      const discountPercent = Math.min(100, Math.max(0, formData.discountValue));
      discountAmount = subtotal * discountPercent / 100;
    } else {
      // For amount: limit to max subtotal (cannot exceed subtotal)
      discountAmount = Math.min(subtotal, Math.max(0, formData.discountValue));
    }
    
    // Ensure totalAmount is never negative
    const totalAmount = Math.max(0, subtotal - discountAmount);
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      discountAmount,
      totalAmount
    }));
  }, [orderItems, formData.discountType, formData.discountValue, formData.pickupPlanAt, formData.returnPlanAt, formData.orderType]);

  // Calculate deposit amount for rent orders
  // Deposit = sum of (deposit per unit * quantity) for each item
  // Auto-calculate when items change, user can manually override depositAmount
  useEffect(() => {
    if (formData.orderType === 'RENT') {
      const calculatedDeposit = orderItems.reduce((sum, item) => {
        // item.deposit is deposit per unit, multiply by quantity
        return sum + ((item.deposit ?? 0) * (item.quantity || 1));
      }, 0);
      
      // Auto-update depositAmount when items change
      // User can manually change depositAmount and it will be sent to backend as-is
      setFormData(prev => ({
        ...prev,
        depositAmount: calculatedDeposit,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        depositAmount: 0,
      }));
    }
  }, [orderItems, formData.orderType]);

  // Update unitPrice of all order items when orderType changes
  useEffect(() => {
    if (orderItems.length > 0) {
      const updatedItems = orderItems.map(item => {
        const rentPrice = item.product.rentPrice ?? 0;
        const salePrice = item.product.salePrice ?? rentPrice; // Fallback to rentPrice if salePrice not available
        
        // Use salePrice for SALE orders, rentPrice for RENT orders
        const newUnitPrice = formData.orderType === 'RENT' ? rentPrice : salePrice;
        
        return {
          ...item,
          unitPrice: newUnitPrice,
          totalPrice: newUnitPrice * item.quantity,
        };
      });
      
      setOrderItems(updatedItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.orderType]); // Only trigger when orderType changes

  // Initialize form data when initialOrder changes (for edit mode)
  useEffect(() => {
    if (isEditMode && initialOrder) {
      // Update form data with initial order values
      setFormData(prev => ({
        ...prev,
        orderType: initialOrder.orderType || 'RENT',
        customerId: initialOrder.customerId || undefined,
        outletId: initialOrder.outletId || outlets[0]?.id || undefined,
        pickupPlanAt: initialOrder.pickupPlanAt ? new Date(initialOrder.pickupPlanAt).toISOString().split('T')[0] : '',
        returnPlanAt: initialOrder.returnPlanAt ? new Date(initialOrder.returnPlanAt).toISOString().split('T')[0] : '',
        subtotal: initialOrder.subtotal || 0,
        taxAmount: initialOrder.taxAmount || 0,
        discountType: initialOrder.discountType || 'amount',
        discountValue: initialOrder.discountValue || BUSINESS.DEFAULT_DISCOUNT,
        discountAmount: initialOrder.discountAmount || BUSINESS.DEFAULT_DISCOUNT,
        depositAmount: initialOrder.depositAmount || BUSINESS.DEFAULT_DEPOSIT,
        securityDeposit: initialOrder.securityDeposit || 0,
        lateFee: initialOrder.lateFee || 0,
        damageFee: initialOrder.damageFee || 0,
        totalAmount: initialOrder.totalAmount || 0,
        notes: initialOrder.notes || '',
      }));

      // Update order items (must keep pricingType / pricingOptionId or daily rental resets to FIXED)
      if (initialOrder.orderItems) {
        const initialOrderItems: OrderItemFormData[] = initialOrder.orderItems.map(mapInitialOrderItem);
        
        setOrderItems(initialOrderItems);
        
        // Calculate deposit amount from order items after they're set
        if (initialOrder.orderType === 'RENT') {
          // Calculate: deposit per unit * quantity for each item
          const totalDeposit = initialOrderItems.reduce((sum, item) => {
            return sum + ((item.deposit ?? 0) * (item.quantity || 1));
          }, 0);
          setFormData(prev => ({
            ...prev,
            depositAmount: totalDeposit,
          }));
        }
      }
    }
  }, [isEditMode, initialOrder, outlets]);

  // Order GET does not include product.pricingOptions — hydrate from products list so
  // the "Cách tính giá" selector still works in edit mode.
  useEffect(() => {
    if (!products.length) return;

    setOrderItems(prev => {
      if (!prev.length) return prev;

      let changed = false;
      const hydrated = prev.map(item => {
        const hasOptions = ((item.product?.pricingOptions as any[])?.length ?? 0) > 0;
        if (hasOptions) return item;

        const liveProduct = products.find(p => p.id === item.productId) as any;
        const liveOptions = liveProduct?.pricingOptions as any[] | undefined;
        if (!liveOptions?.length) return item;

        changed = true;
        const pricingType = item.pricingType ?? liveProduct?.pricingType ?? 'FIXED';
        return {
          ...item,
          product: {
            ...item.product,
            pricingType: liveProduct?.pricingType ?? item.product?.pricingType ?? null,
            pricingOptions: liveOptions,
            salePrice: liveProduct?.salePrice ?? item.product?.salePrice,
            rentPrice: liveProduct?.rentPrice ?? item.product?.rentPrice,
          },
          selectedPricingOptionId:
            item.selectedPricingOptionId ??
            liveOptions.find((option: any) => option.type === pricingType)?.id ??
            null,
          pricingType,
        };
      });

      return changed ? hydrated : prev;
    });
  }, [products, orderItems.length]);

  // Add product to order
  const addProductToOrder = useCallback((product: any) => {
    const productIdNumber = product.id;
    const existingItem = orderItems.find(item => item.productId === productIdNumber);
    
    if (existingItem) {
      // Update quantity if product already exists
      const updatedItems = orderItems.map(item =>
        item.productId === productIdNumber
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      setOrderItems(updatedItems);
    } else {
      // Add new product
      const rentPrice = product.rentPrice ?? 0;
      const salePrice = product.salePrice ?? rentPrice; // Fallback to rentPrice if salePrice not available
      const deposit = product.deposit ?? 0;

      // Resolve default pricing option (RENT only) — use merchant isDefault
      // so DAILY-default products create daily lines (not forced FIXED).
      const pricingOptions = (product.pricingOptions as any[]) || [];
      const defaultOption = getPreferredPricingOption(pricingOptions);
      const isRent = formData.orderType === 'RENT';

      // Use salePrice for SALE orders; for RENT use the default option's price (falls back to rentPrice)
      const unitPrice = isRent ? (defaultOption ? defaultOption.price : rentPrice) : salePrice;

      const newItem: OrderItemFormData = {
        productId: productIdNumber,
        product: {
          id: productIdNumber,
          name: product.name,
          description: product.description || '',
          images: product.images || null,
          barcode: product.barcode || '',
          rentPrice: rentPrice,
          salePrice: salePrice, // Store salePrice for later use
          deposit: deposit,
          pricingType: product.pricingType ?? null,
          pricingOptions: pricingOptions,
          // Store outletStock to ensure stock info is always available
          outletStock: product.outletStock || [],
          stock: product.stock,
          available: product.available,
          renting: product.renting,
        },
        quantity: BUSINESS.DEFAULT_QUANTITY,
        unitPrice: unitPrice,
        totalPrice: unitPrice * BUSINESS.DEFAULT_QUANTITY,
        deposit: deposit,
        notes: '',
        selectedPricingOptionId: isRent ? (defaultOption?.id ?? null) : null,
        pricingType: isRent ? (defaultOption?.type || (product.pricingType as string) || 'FIXED') : 'FIXED',
      };
      const newOrderItems = [...orderItems, newItem];
      setOrderItems(newOrderItems);
    }
  }, [orderItems, formData.orderType]);

  // Remove product from order
  const removeProductFromOrder = useCallback((productId: number) => {
    setOrderItems(orderItems.filter(item => item.productId !== productId));
  }, [orderItems]);

  // Update order item
  const updateOrderItem = useCallback((productId: number, field: keyof OrderItemFormData, value: string | number) => {
    const days = deriveRentalDays(formData.pickupPlanAt, formData.returnPlanAt);
    const updatedItems = orderItems.map(item => {
      if (item.productId === productId) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate totalPrice when quantity or unitPrice changes (DAILY uses days)
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.totalPrice = computeLineTotal(updatedItem, formData.orderType, days);
        }
        
        return updatedItem;
      }
      return item;
    });
    setOrderItems(updatedItems);
  }, [orderItems, formData.pickupPlanAt, formData.returnPlanAt, formData.orderType]);

  // Change selected pricing option by id (when product has configured options)
  const updateItemPricingOption = useCallback((productId: number, optionId: number) => {
    setOrderItems(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const opt = ((item.product?.pricingOptions as any[]) || []).find(o => o.id === optionId);
      if (!opt) return item;
      const days = deriveRentalDays(formData.pickupPlanAt, formData.returnPlanAt);
      const updated = { ...item, selectedPricingOptionId: optionId, pricingType: opt.type, unitPrice: opt.price };
      updated.totalPrice = computeLineTotal(updated, formData.orderType, days);
      return updated;
    }));
  }, [formData.pickupPlanAt, formData.returnPlanAt, formData.orderType]);

  // Switch FIXED (per rental) ↔ DAILY (per day) — same as mobile cart, even when
  // the product only has one configured option (or none).
  const updateItemPricingType = useCallback((productId: number, type: string) => {
    const normalizedType = (type || 'FIXED').toUpperCase();
    setOrderItems(prev => prev.map(item => {
      if (item.productId !== productId) return item;

      const opts = ((item.product?.pricingOptions as any[]) || []);
      const matchedOption = opts.find(
        (option: any) => (option.type || '').toUpperCase() === normalizedType
      );
      const days = deriveRentalDays(formData.pickupPlanAt, formData.returnPlanAt);
      const nextUnitPrice =
        matchedOption?.price ??
        (normalizedType === 'FIXED'
          ? (item.product?.rentPrice ?? item.unitPrice)
          : item.unitPrice);

      const updated: OrderItemFormData = {
        ...item,
        pricingType: normalizedType,
        selectedPricingOptionId: matchedOption?.id ?? null,
        unitPrice: nextUnitPrice,
        rentalDays: normalizedType === 'DAILY' ? Math.max(1, days) : 1,
      };
      updated.totalPrice = computeLineTotal(updated, formData.orderType, days);
      return updated;
    }));
  }, [formData.pickupPlanAt, formData.returnPlanAt, formData.orderType]);

  // Calculate rental days
  const calculateRentalDays = useCallback((startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  // Update rental dates and recalculate prices
  const updateRentalDates = useCallback((startDate: string, endDate: string) => {
    setFormData(prev => ({
      ...prev,
      pickupPlanAt: startDate,
      returnPlanAt: endDate,
    }));

    // Update order items with new dates and recalculate prices (per pricing type)
    const days = calculateRentalDays(startDate, endDate);
    const effectiveDays = days > 0 ? days : 1;
    const updatedItems = orderItems.map(item => {
      const isDaily = formData.orderType === 'RENT' && resolveItemPricingType(item) === 'DAILY';
      return {
        ...item,
        startDate,
        endDate,
        daysRented: days,
        rentalDays: isDaily ? effectiveDays : (item.rentalDays ?? 1),
        totalPrice: computeLineTotal(item, formData.orderType, effectiveDays),
      };
    });
    setOrderItems(updatedItems);
  }, [orderItems, calculateRentalDays, formData.orderType]);

  // Handle form submission
  const handleSubmit = useCallback(async (
    e: React.FormEvent,
    loyaltyRedeem?: { points: number }
  ) => {
    e.preventDefault();
    
    // Use the ref to get the latest orderItems state to avoid stale closure issues
    const currentOrderItems = orderItemsRef.current;
    
    if (isSubmitting) return;
    
    // Validate that we have order items
    if (!currentOrderItems || currentOrderItems.length === 0) {
      // This should be handled by the parent component with toast
      throw new Error('Please add at least one product to the order before submitting.');
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare API payload with proper types (send numeric IDs directly)
      // DRY: Use centralized utility function to convert local date to UTC datetime (matches mobile app format)
      const submitDays = deriveRentalDays(formData.pickupPlanAt, formData.returnPlanAt);
      const apiPayload = {
        orderType: formData.orderType,
        customerId: formData.customerId, // Send as number
        outletId: formData.outletId, // Send as number
        pickupPlanAt: formData.pickupPlanAt ? convertLocalDateToUTCDatetime(formData.pickupPlanAt) : undefined,
        returnPlanAt: formData.returnPlanAt ? convertLocalDateToUTCDatetime(formData.returnPlanAt) : undefined,
        subtotal: formData.subtotal,
        taxAmount: formData.taxAmount,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        discountAmount: formData.discountAmount,
        depositAmount: formData.depositAmount,
        securityDeposit: formData.securityDeposit,
        lateFee: formData.lateFee,
        damageFee: formData.damageFee,
        totalAmount: formData.totalAmount,
        notes: formData.notes,
        orderItems: currentOrderItems.map(item => {
          const isDaily = formData.orderType === 'RENT' && resolveItemPricingType(item) === 'DAILY';
          const lineDays = isDaily ? Math.max(1, submitDays) : 1;
          return {
            productId: item.productId, // Send as number
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: computeLineTotal(item, formData.orderType, submitDays),
            deposit: item.deposit ?? 0,
            notes: item.notes || '',
            rentDays: lineDays,
            pricingType: resolveItemPricingType(item),
            ...(item.selectedPricingOptionId != null ? { pricingOptionId: item.selectedPricingOptionId } : {}),
          };
        }),
        ...(loyaltyRedeem ? { loyaltyRedeem } : {}),
      };
      
      // Add order ID for edit mode
      if (isEditMode && initialOrder?.id) {
        (apiPayload as any).id = initialOrder.id;
      }
      
      props.onSubmit?.(apiPayload as any);
    } catch (error) {
      // Re-throw the error so the parent can handle it with toast
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isEditMode, initialOrder, props, isSubmitting]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    if (isEditMode && initialOrder) {
      // Reset to initial order data for edit mode
      setFormData({
        orderType: initialOrder.orderType || 'RENT',
        customerId: parseInt(initialOrder.customerId) || undefined,
        outletId: initialOrder.outletId || outlets[0]?.id || undefined,
        pickupPlanAt: initialOrder.pickupPlanAt ? new Date(initialOrder.pickupPlanAt).toISOString().split('T')[0] : '',
        returnPlanAt: initialOrder.returnPlanAt ? new Date(initialOrder.returnPlanAt).toISOString().split('T')[0] : '',
        subtotal: initialOrder.subtotal || 0,
        taxAmount: initialOrder.taxAmount || 0,
        discountType: 'amount',
        discountValue: BUSINESS.DEFAULT_DISCOUNT,
        discountAmount: initialOrder.discountAmount || BUSINESS.DEFAULT_DISCOUNT,
        depositAmount: initialOrder.depositAmount || BUSINESS.DEFAULT_DEPOSIT,
        securityDeposit: initialOrder.securityDeposit || 0,
        lateFee: initialOrder.lateFee || 0,
        damageFee: initialOrder.damageFee || 0,
        totalAmount: initialOrder.totalAmount || 0,
        notes: initialOrder.notes || '',
        orderItems: [],
      });
      
      console.log('🔍 useCreateOrderForm: Mapping orderItems from initialOrder:', {
        orderItemsCount: initialOrder.orderItems?.length,
        firstItem: initialOrder.orderItems?.[0],
        firstItemProduct: initialOrder.orderItems?.[0]?.product,
        firstItemProductName: initialOrder.orderItems?.[0]?.productName,
        firstItemHasProduct: !!initialOrder.orderItems?.[0]?.product,
        firstItemHasProductName: !!initialOrder.orderItems?.[0]?.productName
      });

      const mappedItems = initialOrder.orderItems.map(mapInitialOrderItem);
      setOrderItems(mappedItems);
    } else {
      // Reset to default values for create mode
      setFormData({
        orderType: 'RENT',
        customerId: undefined,
        outletId: outlets[0]?.id || undefined,
        pickupPlanAt: '',
        returnPlanAt: '',
        subtotal: 0,
        taxAmount: 0,
        discountType: 'amount',
        discountValue: BUSINESS.DEFAULT_DISCOUNT,
        discountAmount: BUSINESS.DEFAULT_DISCOUNT,
        depositAmount: BUSINESS.DEFAULT_DEPOSIT,
        securityDeposit: 0,
        lateFee: 0,
        damageFee: 0,
        totalAmount: 0,
        notes: '',
        orderItems: [],
      });
      
      setOrderItems([]);
    }
  }, [isEditMode, initialOrder, outlets]);

  return {
    // State
    formData,
    setFormData,
    orderItems,
    setOrderItems,
    isSubmitting,
    
    // Actions
    addProductToOrder,
    removeProductFromOrder,
    updateOrderItem,
    updateItemPricingOption,
    updateItemPricingType,
    updateRentalDates,
    handleSubmit,
    resetForm,
    
    // Utilities
    calculateRentalDays,
  };
};
