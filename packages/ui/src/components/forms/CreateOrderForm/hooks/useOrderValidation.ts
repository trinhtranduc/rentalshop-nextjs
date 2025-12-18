/**
 * Custom hook for order form validation
 */

import { useState, useCallback } from 'react';
import { BUSINESS, VALIDATION } from '@rentalshop/constants';
import type { 
  OrderFormData, 
  OrderItemFormData, 
  ValidationErrors 
} from '../types';

export const useOrderValidation = () => {
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Calculate rental days
  const calculateRentalDays = useCallback((startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  // Validate form
  const validateForm = useCallback((
    formData: OrderFormData, 
    orderItems: OrderItemFormData[]
  ): boolean => {
    const errors: ValidationErrors = {};

    if (!formData.customerId || formData.customerId <= 0) {
      errors.customerId = 'Customer selection is required';
    }

    if (!formData.outletId || formData.outletId <= 0) {
      errors.outletId = 'Outlet selection is required';
    }

    if (orderItems.length === 0) {
      errors.orderItems = 'At least one product is required';
    }

    if (formData.orderType === 'RENT') {
      if (!formData.pickupPlanAt) {
        errors.pickupPlanAt = 'Pickup date is required for rentals';
      }
      if (!formData.returnPlanAt) {
        errors.returnPlanAt = 'Return date is required for rentals';
      }
      if (formData.pickupPlanAt && formData.returnPlanAt) {
        // Check if return date is before pickup date (not allowed)
        const pickup = new Date(formData.pickupPlanAt);
        const return_ = new Date(formData.returnPlanAt);
        if (return_ < pickup) {
          errors.returnPlanAt = 'Return date cannot be before pickup date';
        } else {
          // Allow same day rental (days = 0) or minimum rental days
        const days = calculateRentalDays(formData.pickupPlanAt, formData.returnPlanAt);
          if (days > BUSINESS.MAX_RENTAL_DAYS) {
          errors.returnPlanAt = `Rental cannot exceed ${BUSINESS.MAX_RENTAL_DAYS} days`;
          }
          // Note: Same day rental (days = 0) is now allowed, so we don't check MIN_RENTAL_DAYS
        }
      }
    }

    if (formData.orderType === 'RENT' && formData.depositAmount < VALIDATION.MIN_DEPOSIT_AMOUNT) {
      errors.depositAmount = `Deposit amount cannot be less than ${VALIDATION.MIN_DEPOSIT_AMOUNT}`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [calculateRentalDays]);

  // Check if form is valid
  const isFormValid = useCallback((
    formData: OrderFormData, 
    orderItems: OrderItemFormData[]
  ): boolean => {
    const hasProducts = orderItems.length > 0;
    const hasCustomer = Boolean(formData.customerId && formData.customerId > 0);
    const hasOutlet = Boolean(formData.outletId && formData.outletId > 0);
    
    if (formData.orderType === 'RENT') {
      return hasProducts && hasCustomer && hasOutlet && Boolean(formData.pickupPlanAt) && Boolean(formData.returnPlanAt);
    } else {
      return hasProducts && hasCustomer && hasOutlet;
    }
  }, []);

  // Clear validation errors
  const clearValidationErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  // Set specific validation error
  const setValidationError = useCallback((field: keyof ValidationErrors, message: string) => {
    setValidationErrors(prev => ({
      ...prev,
      [field]: message
    }));
  }, []);

  // Clear specific validation error
  const clearValidationError = useCallback((field: keyof ValidationErrors) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  return {
    validationErrors,
    validateForm,
    isFormValid,
    clearValidationErrors,
    setValidationError,
    clearValidationError,
    calculateRentalDays,
  };
};
