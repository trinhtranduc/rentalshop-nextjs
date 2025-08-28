/**
 * Custom hook for managing CreateOrderForm state and logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToasts } from '@rentalshop/ui';
import { customersApi, handleApiError } from '@rentalshop/utils';
import { BUSINESS, VALIDATION } from '@rentalshop/constants';
import type { 
  OrderFormData, 
  OrderItemFormData, 
  ValidationErrors,
  CreateOrderFormProps 
} from '../types';

export const useCreateOrderForm = (props: CreateOrderFormProps) => {
  const {
    outlets = [],
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
      return initialOrder.orderItems.map((item: any) => ({
        productId: parseInt(item.productId) || 0,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        deposit: item.deposit || 0,
        notes: item.notes || '',
      }));
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
  const [showOrderPreview, setShowOrderPreview] = useState(false);

  // Toast notifications
  const { showSuccess, showError } = useToasts();

  // Calculate totals when order items change
  useEffect(() => {
    console.log('🔍 orderItems changed, recalculating totals. New orderItems:', orderItems);
    console.log('🔍 orderItems length:', orderItems?.length);
    
    const subtotal = orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discountAmount = formData.discountType === 'percentage' 
      ? (subtotal * formData.discountValue / 100)
      : formData.discountValue;
    const totalAmount = subtotal - discountAmount;
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      discountAmount,
      totalAmount
    }));
  }, [orderItems, formData.discountType, formData.discountValue]);

  // Calculate deposit amount for rent orders
  useEffect(() => {
    if (formData.orderType === 'RENT') {
      const totalDeposit = orderItems.reduce((sum, item) => sum + item.deposit, 0);
      setFormData(prev => ({
        ...prev,
        depositAmount: totalDeposit,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        depositAmount: 0,
      }));
    }
  }, [orderItems, formData.orderType]);

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
        discountAmount: initialOrder.discountAmount || BUSINESS.DEFAULT_DISCOUNT,
        depositAmount: initialOrder.depositAmount || BUSINESS.DEFAULT_DEPOSIT,
        securityDeposit: initialOrder.securityDeposit || 0,
        lateFee: initialOrder.lateFee || 0,
        damageFee: initialOrder.damageFee || 0,
        totalAmount: initialOrder.totalAmount || 0,
        notes: initialOrder.notes || '',
      }));

      // Update order items
      if (initialOrder.orderItems) {
        const initialOrderItems: OrderItemFormData[] = initialOrder.orderItems.map((item: any) => ({
          productId: parseInt(item.productId) || 0,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          deposit: item.deposit || 0,
          notes: item.notes || '',
        }));
        setOrderItems(initialOrderItems);
      }
    }
  }, [isEditMode, initialOrder, outlets]);

  // Add product to order
  const addProductToOrder = useCallback((product: any) => {
    console.log('🔍 addProductToOrder called with product:', product);
    console.log('🔍 Current orderItems before adding:', orderItems);
    
    const productIdNumber = product.id;
    const existingItem = orderItems.find(item => item.productId === productIdNumber);
    
    if (existingItem) {
      // Update quantity if product already exists
      console.log('🔍 Product already exists, updating quantity');
      const updatedItems = orderItems.map(item =>
        item.productId === productIdNumber
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      console.log('🔍 Updated items:', updatedItems);
      setOrderItems(updatedItems);
    } else {
      // Add new product
      console.log('🔍 Adding new product to order');
      const rentPrice = product.rentPrice ?? 0;
      const deposit = product.deposit ?? 0;
      
      const newItem: OrderItemFormData = {
        productId: productIdNumber,
        quantity: BUSINESS.DEFAULT_QUANTITY,
        unitPrice: formData.orderType === 'RENT' ? rentPrice : rentPrice,
        deposit: deposit,
        notes: '',
      };
      console.log('🔍 New item to add:', newItem);
      const newOrderItems = [...orderItems, newItem];
      console.log('🔍 New orderItems array:', newOrderItems);
      setOrderItems(newOrderItems);
    }
  }, [orderItems, formData.orderType]);

  // Remove product from order
  const removeProductFromOrder = useCallback((productId: number) => {
    setOrderItems(orderItems.filter(item => item.productId !== productId));
  }, [orderItems]);

  // Update order item
  const updateOrderItem = useCallback((productId: number, field: keyof OrderItemFormData, value: string | number) => {
    const updatedItems = orderItems.map(item => {
      if (item.productId === productId) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setOrderItems(updatedItems);
  }, [orderItems]);

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

    // Update order items with new dates and recalculate prices
    const days = calculateRentalDays(startDate, endDate);
    const updatedItems = orderItems.map(item => ({
      ...item,
      startDate,
      endDate,
      daysRented: days,
      totalPrice: item.unitPrice * days * item.quantity,
    }));
    setOrderItems(updatedItems);
  }, [orderItems, calculateRentalDays]);

  // Handle preview button click
  const handlePreviewClick = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setShowOrderPreview(true);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 handleSubmit called');
    
    // Use the ref to get the latest orderItems state to avoid stale closure issues
    const currentOrderItems = orderItemsRef.current;
    console.log('🔍 Current orderItems from ref:', currentOrderItems);
    console.log('🔍 Current orderItems length:', currentOrderItems?.length);
    console.log('🔍 orderItems type:', typeof currentOrderItems);
    console.log('🔍 orderItems array check:', Array.isArray(currentOrderItems));
    
    if (isSubmitting) return;
    
    // Validate that we have order items
    if (!currentOrderItems || currentOrderItems.length === 0) {
      console.error('❌ No order items found!');
      console.error('❌ currentOrderItems:', currentOrderItems);
      console.error('❌ currentOrderItems.length:', currentOrderItems?.length);
      // This should be handled by the parent component with toast
      throw new Error('Please add at least one product to the order before submitting.');
    }
    
    console.log('✅ Order items validation passed');
    setIsSubmitting(true);
    
    try {
      // Prepare API payload with proper types (send numeric IDs directly)
      const apiPayload = {
        orderType: formData.orderType,
        customerId: formData.customerId, // Send as number
        outletId: formData.outletId, // Send as number
        pickupPlanAt: formData.pickupPlanAt ? new Date(formData.pickupPlanAt).toISOString() : undefined,
        returnPlanAt: formData.returnPlanAt ? new Date(formData.returnPlanAt).toISOString() : undefined,
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
        orderItems: currentOrderItems.map(item => ({
          productId: item.productId, // Send as number
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          deposit: item.deposit,
          notes: item.notes,
        }))
      };
      
      console.log('🔍 Final API payload:', apiPayload);
      console.log('🔍 orderItems in payload:', apiPayload.orderItems);
      
      // Add order ID for edit mode
      if (isEditMode && initialOrder?.id) {
        (apiPayload as any).id = initialOrder.id;
      }
      
      console.log('🔍 Submitting order with payload:', apiPayload);
      props.onSubmit?.(apiPayload as any);
    } catch (error) {
      console.error('Error submitting order:', error);
      // Re-throw the error so the parent can handle it with toast
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isEditMode, initialOrder, props, isSubmitting]);

  // Handle order confirmation from preview
  const handleOrderConfirm = useCallback(async () => {
    console.log('🔍 handleOrderConfirm called');
    console.log('🔍 Current orderItems in handleOrderConfirm:', orderItems);
    console.log('🔍 orderItems length in handleOrderConfirm:', orderItems?.length);
    
    setShowOrderPreview(false);
    // Create a mock event for handleSubmit
    const mockEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleSubmit(mockEvent);
  }, [orderItems, handleSubmit]);

  return {
    // State
    formData,
    setFormData,
    orderItems,
    setOrderItems,
    isSubmitting,
    showOrderPreview,
    setShowOrderPreview,
    
    // Actions
    addProductToOrder,
    removeProductFromOrder,
    updateOrderItem,
    updateRentalDates,
    handlePreviewClick,
    handleOrderConfirm,
    handleSubmit,
    
    // Utilities
    calculateRentalDays,
  };
};
