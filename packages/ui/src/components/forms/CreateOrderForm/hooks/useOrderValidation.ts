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

    if (!formData.customerId) {
      errors.customerId = 'Customer selection is required';
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
        const days = calculateRentalDays(formData.pickupPlanAt, formData.returnPlanAt);
        if (days < BUSINESS.MIN_RENTAL_DAYS) {
          errors.returnPlanAt = `Rental must be at least ${BUSINESS.MIN_RENTAL_DAYS} day`;
        } else if (days > BUSINESS.MAX_RENTAL_DAYS) {
          errors.returnPlanAt = `Rental cannot exceed ${BUSINESS.MAX_RENTAL_DAYS} days`;
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
    const hasCustomer = formData.customerId;
    
    if (formData.orderType === 'RENT') {
      return hasProducts && hasCustomer && formData.pickupPlanAt && formData.returnPlanAt;
    } else {
      return hasProducts && hasCustomer;
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
