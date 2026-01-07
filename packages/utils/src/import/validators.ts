// ============================================================================
// IMPORT VALIDATORS - Validate Excel import data
// ============================================================================

import { z } from 'zod';
import type { CustomerCreateInput, ProductCreateInput } from '@rentalshop/types';

export interface ImportValidationError {
  row: number; // 1-based row number (Excel row number)
  field: string;
  message: string;
  value: any;
}

export interface ImportValidationResult<T> {
  valid: boolean;
  data: T[];
  errors: ImportValidationError[];
}

/**
 * Customer Excel column mapping
 */
export const CUSTOMER_COLUMN_MAPPING: Record<string, string[]> = {
  firstName: ['firstname', 'first_name', 'first name', 'ten'],
  lastName: ['lastname', 'last_name', 'last name', 'ho'],
  email: ['email', 'e-mail'],
  phone: ['phone', 'phone_number', 'phone number', 'so dien thoai', 'sdt'],
  address: ['address', 'dia chi'],
  city: ['city', 'thanh pho'],
  state: ['state', 'province', 'tinh'],
  zipCode: ['zipcode', 'zip_code', 'zip code', 'postal_code', 'postal code', 'ma buu dien'],
  country: ['country', 'quoc gia'],
  dateOfBirth: ['dateofbirth', 'date_of_birth', 'date of birth', 'dob', 'ngay sinh'],
  idNumber: ['idnumber', 'id_number', 'id number', 'cmnd', 'cccd'],
  idType: ['idtype', 'id_type', 'id type', 'loai giay to'],
  notes: ['notes', 'note', 'ghi chu', 'ghi chu']
};

/**
 * Product Excel column mapping
 */
export const PRODUCT_COLUMN_MAPPING: Record<string, string[]> = {
  name: ['name', 'product_name', 'product name', 'ten san pham'],
  description: ['description', 'desc', 'mo ta'],
  barcode: ['barcode', 'bar_code', 'bar code', 'ma vach'],
  categoryName: ['categoryname', 'category_name', 'category name', 'category', 'danh muc'],
  rentPrice: ['rentprice', 'rent_price', 'rent price', 'gia thue'],
  salePrice: ['saleprice', 'sale_price', 'sale price', 'gia ban'],
  costPrice: ['costprice', 'cost_price', 'cost price', 'gia von'],
  deposit: ['deposit', 'tien dat coc', 'dat coc'],
  stock: ['stock', 'quantity', 'so luong'],
  pricingType: ['pricingtype', 'pricing_type', 'pricing type', 'loai gia'],
  durationConfig: ['durationconfig', 'duration_config', 'duration config', 'cau hinh thoi gian']
};

/**
 * Customer validation schema for Excel import
 */
const customerExcelSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  dateOfBirth: z.string().optional(),
  idNumber: z.string().optional(),
  idType: z.enum(['passport', 'drivers_license', 'national_id', 'other']).optional(),
  notes: z.string().optional()
});

/**
 * Product validation schema for Excel import (before category mapping)
 */
const productExcelSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  barcode: z.string().optional(),
  categoryName: z.string().min(1, 'Category name is required'),
  rentPrice: z.number().min(0, 'Rent price must be non-negative'),
  salePrice: z.number().min(0, 'Sale price must be non-negative').optional(),
  costPrice: z.number().min(0, 'Cost price must be non-negative').optional(),
  deposit: z.number().min(0, 'Deposit must be non-negative'),
  stock: z.number().int().min(0, 'Stock must be a non-negative integer'),
  pricingType: z.enum(['FIXED', 'HOURLY', 'DAILY']).optional(),
  durationConfig: z.string().optional()
});

/**
 * Validate customer data from Excel
 */
export function validateCustomers(
  excelData: any[],
  merchantId: number
): ImportValidationResult<CustomerCreateInput> {
  const errors: ImportValidationError[] = [];
  const validData: CustomerCreateInput[] = [];

  excelData.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because Excel row 1 is header, data starts at row 2

    // Skip empty rows
    if (!row.firstName && !row.lastName && !row.email && !row.phone) {
      return;
    }

    const result = customerExcelSchema.safeParse(row);

    if (!result.success) {
      result.error.errors.forEach((error) => {
        errors.push({
          row: rowNumber,
          field: error.path.join('.'),
          message: error.message,
          value: error.path.reduce((obj: any, key) => obj?.[key], row)
        });
      });
      return;
    }

    // Additional validation: email format if provided
    if (result.data.email && result.data.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(result.data.email)) {
        errors.push({
          row: rowNumber,
          field: 'email',
          message: 'Invalid email format',
          value: result.data.email
        });
        return;
      }
    }

    // Convert to CustomerCreateInput
    validData.push({
      firstName: result.data.firstName,
      lastName: result.data.lastName,
      email: result.data.email || undefined,
      phone: result.data.phone || undefined,
      address: result.data.address || undefined,
      city: result.data.city || undefined,
      state: result.data.state || undefined,
      zipCode: result.data.zipCode || undefined,
      country: result.data.country || undefined,
      dateOfBirth: result.data.dateOfBirth || undefined,
      idNumber: result.data.idNumber || undefined,
      idType: result.data.idType || undefined,
      notes: result.data.notes || undefined,
      merchantId
    });
  });

  return {
    valid: errors.length === 0,
    data: validData,
    errors
  };
}

/**
 * Validate product data from Excel (before category mapping)
 */
export function validateProducts(
  excelData: any[],
  merchantId: number,
  outletId: number
): ImportValidationResult<Omit<ProductCreateInput, 'categoryId' | 'outletStock'>> {
  const errors: ImportValidationError[] = [];
  const validData: Omit<ProductCreateInput, 'categoryId' | 'outletStock'>[] = [];

  excelData.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because Excel row 1 is header, data starts at row 2

    // Skip empty rows
    if (!row.name) {
      return;
    }

    const result = productExcelSchema.safeParse(row);

    if (!result.success) {
      result.error.errors.forEach((error) => {
        errors.push({
          row: rowNumber,
          field: error.path.join('.'),
          message: error.message,
          value: error.path.reduce((obj: any, key) => obj?.[key], row)
        });
      });
      return;
    }

    // Additional validation: durationConfig if pricingType is HOURLY or DAILY
    if (result.data.pricingType === 'HOURLY' || result.data.pricingType === 'DAILY') {
      if (!result.data.durationConfig) {
        errors.push({
          row: rowNumber,
          field: 'durationConfig',
          message: 'Duration config is required for HOURLY and DAILY pricing types',
          value: result.data.durationConfig
        });
        return;
      }

      // Validate JSON structure
      try {
        const config = JSON.parse(result.data.durationConfig);
        if (!config.minDuration || !config.maxDuration || !config.defaultDuration) {
          errors.push({
            row: rowNumber,
            field: 'durationConfig',
            message: 'Duration config must have minDuration, maxDuration, and defaultDuration',
            value: result.data.durationConfig
          });
          return;
        }
      } catch (e) {
        errors.push({
          row: rowNumber,
          field: 'durationConfig',
          message: 'Duration config must be valid JSON',
          value: result.data.durationConfig
        });
        return;
      }
    }

    // Convert to ProductCreateInput (without categoryId and outletStock)
    // Note: pricingType, durationConfig, merchantId, and categoryName are not part of ProductCreateInput
    // They will be handled separately during product creation
    const productData: Omit<ProductCreateInput, 'categoryId' | 'outletStock'> = {
      name: result.data.name,
      description: result.data.description || undefined,
      barcode: result.data.barcode || undefined,
      rentPrice: result.data.rentPrice,
      salePrice: result.data.salePrice || undefined,
      costPrice: result.data.costPrice || undefined,
      deposit: result.data.deposit,
      totalStock: result.data.stock
      // Note: pricingType, durationConfig, merchantId, and categoryName are validated
      // but not included in ProductCreateInput - they will be handled during import processing
    };
    validData.push(productData);
  });

  return {
    valid: errors.length === 0,
    data: validData as any,
    errors
  };
}

