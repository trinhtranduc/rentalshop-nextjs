'use client'

import type { UserCreateInput, UserUpdateInput } from '@rentalshop/types';

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
  if (!phone.trim()) {
    return 'Phone number is required';
  }
  if (!/^[0-9]+$/.test(phone.trim())) {
    return 'Phone number must contain only numbers';
  }
  if (phone.trim().length < 8) {
    return 'Phone number must be at least 8 digits';
  }
  if (phone.trim().length > 15) {
    return 'Phone number must be less than 16 digits';
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

export const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
  if (password && password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
};

// Validation for user creation
export const validateUserCreateInput = (data: any): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Name validation (split from full name)
  const nameParts = data.name?.trim().split(' ') || [];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const firstNameError = validateName(firstName, 'First name');
  if (firstNameError) errors.firstName = firstNameError;

  const lastNameError = validateName(lastName, 'Last name');
  if (lastNameError) errors.lastName = lastNameError;

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

  // Merchant validation based on role
  if (data.role && (data.role === 'OUTLET_ADMIN' || data.role === 'OUTLET_STAFF') && !data.merchantId) {
    errors.merchantId = 'Merchant is required for this role';
  }

  // Outlet validation based on role
  if (data.role && (data.role === 'OUTLET_ADMIN' || data.role === 'OUTLET_STAFF') && !data.outletId) {
    errors.outletId = 'Outlet is required for this role';
  }

  // Password validation
  const passwordError = validatePassword(data.password || '');
  if (passwordError) errors.password = passwordError;

  // Confirm password validation
  const confirmPasswordError = validateConfirmPassword(data.password || '', data.confirmPassword || '');
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

  return errors;
};

// Validation for user updates
export const validateUserUpdateInput = (data: Partial<UserUpdateInput>): Record<string, string> => {
  const errors: Record<string, string> = {};

  // First Name validation
  const firstNameError = validateName(data.firstName || '', 'First name');
  if (firstNameError) errors.firstName = firstNameError;

  // Last Name validation
  const lastNameError = validateName(data.lastName || '', 'Last name');
  if (lastNameError) errors.lastName = lastNameError;

  // Email validation
  const emailError = validateEmail(data.email || '');
  if (emailError) errors.email = emailError;

  // Phone validation
  const phoneError = validatePhone(data.phone || '');
  if (phoneError) errors.phone = phoneError;

  return errors;
};
