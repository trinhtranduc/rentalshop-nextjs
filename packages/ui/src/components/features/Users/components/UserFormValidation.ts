'use client'

import type { UserCreateInput, UserUpdateInput, UserRole } from '@rentalshop/types';
import type { TranslationFunction } from '@rentalshop/hooks';

// ============================================================================
// TYPE-SAFE FORM DATA INTERFACES (Matching UserForm.tsx)
// ============================================================================

interface UserCreateFormData {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  password: string;
  confirmPassword: string;
  merchantId: string;
  outletId: string;
}

interface UserUpdateFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  merchantId: string;
  outletId: string;
}

// Common validation rules that can be reused across forms
export const validateEmail = (email: string): string | null => {
  if (!email.trim()) {
    return 'Email is required';
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return 'Email is invalid';
  }
  return null;
};

export const validatePhone = (phone: string): string | null => {
  // Phone is optional - if empty, no validation needed
  if (!phone || !phone.trim()) {
    return null; // Phone is optional
  }
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < 8) {
    return 'Phone number must be at least 8 digits';
  }
  if (digitsOnly.length > 15) {
    return 'Phone number must be less than 16 digits';
  }
  
  // Allow common phone number formats
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]+$/;
  if (!phoneRegex.test(phone.trim())) {
    return 'Phone number contains invalid characters';
  }
  
  return null;
};

export const validateName = (name: string, fieldName: string = 'Name'): string | null => {
  if (!name.trim()) {
    return `${fieldName} is required`;
  }
  if (name.trim().length < 2) {
    return `${fieldName} must be at least 2 characters`;
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return null;
};

export const validateConfirmPassword = (password: string, confirmPassword: string, tv?: TranslationFunction): string | null => {
  if (password && password !== confirmPassword) {
    return tv ? tv('password.match') : 'Passwords do not match';
  }
  return null;
};

// Validation for user creation
export const validateUserCreateInput = (data: UserCreateFormData, tv?: TranslationFunction): Record<string, string> => {
  const errors: Record<string, string> = {};

  console.log('🔍 UserFormValidation: Validating create input:', data);

  // Name validation (split from full name)
  // firstName and lastName are optional - allow empty name
  const nameParts = data.name?.trim().split(' ') || [];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  console.log('🔍 UserFormValidation: Name parts:', { firstName, lastName });

  // firstName and lastName are optional - only validate if provided
  if (firstName) {
  const firstNameError = validateName(firstName, 'First name');
  if (firstNameError) errors.firstName = firstNameError;
  }

  // lastName is optional - only validate if provided
  if (lastName) {
    const lastNameError = validateName(lastName, 'Last name');
  if (lastNameError) errors.lastName = lastNameError;
  }

  // Email validation
  const emailError = validateEmail(data.email || '');
  if (emailError) errors.email = emailError;

  // Phone validation
  const phoneError = validatePhone(data.phone || '');
  if (phoneError) errors.phone = phoneError;

  // Role validation
  if (!data.role) {
    errors.role = 'Role is required';
  }

  // Smart validation based on role requirements
  if (data.role) {
    if (data.role === 'ADMIN') {
      // ADMIN can have any merchant/outlet or none - no validation needed
    } else if (data.role === 'MERCHANT') {
      // MERCHANT must have merchantId, no outletId
      if (!data.merchantId) {
        errors.merchantId = 'Merchant is required for this role';
      }
      if (data.outletId) {
        errors.outletId = 'Outlet should not be selected for merchant role';
      }
    } else if (data.role === 'OUTLET_ADMIN' || data.role === 'OUTLET_STAFF') {
      // OUTLET users must have both merchantId and outletId
      if (!data.merchantId) {
        errors.merchantId = 'Merchant is required for this role';
      }
      if (!data.outletId) {
        errors.outletId = 'Outlet is required for this role';
      }
    }
  }

  // Password validation
  const passwordError = validatePassword(data.password || '');
  if (passwordError) errors.password = passwordError;

  // Confirm password validation
  const confirmPasswordError = validateConfirmPassword(data.password || '', data.confirmPassword || '', tv);
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

  console.log('🔍 UserFormValidation: Validation errors:', errors);
  return errors;
};

// Validation for user updates
export const validateUserUpdateInput = (data: UserUpdateFormData): Record<string, string> => {
  const errors: Record<string, string> = {};

  console.log('🔍 UserFormValidation: Validating update input:', data);

  // First Name validation - optional
  if (data.firstName && data.firstName.trim()) {
    const firstNameError = validateName(data.firstName, 'First name');
  if (firstNameError) errors.firstName = firstNameError;
  }

  // Last Name validation - optional
  if (data.lastName && data.lastName.trim()) {
    const lastNameError = validateName(data.lastName, 'Last name');
  if (lastNameError) errors.lastName = lastNameError;
  }

  // Email validation
  const emailError = validateEmail(data.email || '');
  if (emailError) errors.email = emailError;

  // Phone validation
  const phoneError = validatePhone(data.phone || '');
  if (phoneError) errors.phone = phoneError;

  // Role validation
  if (!data.role) {
    errors.role = 'Role is required';
  }

  // Smart validation based on role requirements
  if (data.role) {
    if (data.role === 'ADMIN') {
      // ADMIN can have any merchant/outlet or none - no validation needed
    } else if (data.role === 'MERCHANT') {
      // MERCHANT must have merchantId, no outletId
      if (!data.merchantId) {
        errors.merchantId = 'Merchant is required for this role';
      }
      if (data.outletId) {
        errors.outletId = 'Outlet should not be selected for merchant role';
      }
    } else if (data.role === 'OUTLET_ADMIN' || data.role === 'OUTLET_STAFF') {
      // OUTLET users must have both merchantId and outletId
      if (!data.merchantId) {
        errors.merchantId = 'Merchant is required for this role';
      }
      if (!data.outletId) {
        errors.outletId = 'Outlet is required for this role';
      }
    }
  }

  // Note: No password validation in edit mode - password is not changed
  console.log('🔍 UserFormValidation: Update validation errors:', errors);
  return errors;
};
