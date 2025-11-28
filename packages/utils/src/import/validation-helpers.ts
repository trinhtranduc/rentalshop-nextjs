/**
 * Generic Validation Helpers
 * Reusable validation functions to reduce code duplication
 */

import type { ImportValidationError } from './validator';

export type EntityType = 'customer' | 'product' | 'order';

export type ValidationRule = {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'array' | 'object';
  minLength?: number;
  min?: number;
  max?: number;
  enum?: any[];
  custom?: (value: any, data: any) => string | null; // Returns error message or null
  nested?: ValidationRule[]; // For nested objects/arrays
};

export type ValidationConfig = {
  entity: EntityType;
  rules: ValidationRule[];
  merchantIdField?: string; // Field name for merchantId validation
};

/**
 * Create a validation error
 */
function createError(
  row: number,
  entity: EntityType,
  field: string,
  error: string,
  value: any
): ImportValidationError {
  return { row, entity, field, error, value };
}

/**
 * Validate a single field based on rules
 */
function validateField(
  value: any,
  rule: ValidationRule,
  row: number,
  entity: EntityType,
  fieldPath: string,
  fullData: any
): ImportValidationError[] {
  const errors: ImportValidationError[] = [];

  // Required check
  if (rule.required && (value === undefined || value === null || value === '')) {
    errors.push(createError(row, entity, fieldPath, `${rule.field} is required`, value));
    return errors; // Don't check other rules if required field is missing
  }

  // Skip validation if field is optional and not provided
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return errors;
  }

  // Type check
  if (rule.type) {
    if (rule.type === 'string' && typeof value !== 'string') {
      errors.push(createError(row, entity, fieldPath, `${rule.field} must be a string`, value));
      return errors;
    }
    if (rule.type === 'number' && typeof value !== 'number') {
      errors.push(createError(row, entity, fieldPath, `${rule.field} must be a number`, value));
      return errors;
    }
    if (rule.type === 'array' && !Array.isArray(value)) {
      errors.push(createError(row, entity, fieldPath, `${rule.field} must be an array`, value));
      return errors;
    }
    if (rule.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
      errors.push(createError(row, entity, fieldPath, `${rule.field} must be an object`, value));
      return errors;
    }
  }

  // String-specific validations
  if (rule.type === 'string' && typeof value === 'string') {
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(
        createError(
          row,
          entity,
          fieldPath,
          `${rule.field} must be at least ${rule.minLength} characters`,
          value
        )
      );
    }
    if (value.trim() === '' && rule.required) {
      errors.push(createError(row, entity, fieldPath, `${rule.field} cannot be empty`, value));
    }
  }

  // Number-specific validations
  if (rule.type === 'number' && typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      errors.push(
        createError(row, entity, fieldPath, `${rule.field} must be at least ${rule.min}`, value)
      );
    }
    if (rule.max !== undefined && value > rule.max) {
      errors.push(
        createError(row, entity, fieldPath, `${rule.field} must be at most ${rule.max}`, value)
      );
    }
  }

  // Enum validation
  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(
      createError(
        row,
        entity,
        fieldPath,
        `${rule.field} must be one of: ${rule.enum.join(', ')}`,
        value
      )
    );
  }

  // Custom validation
  if (rule.custom) {
    const customError = rule.custom(value, fullData);
    if (customError) {
      errors.push(createError(row, entity, fieldPath, customError, value));
    }
  }

  // Nested validation (for arrays and objects)
  if (rule.nested && Array.isArray(value)) {
    value.forEach((item, index) => {
      rule.nested!.forEach((nestedRule) => {
        const nestedValue = item[nestedRule.field];
        const nestedPath = `${fieldPath}[${index}].${nestedRule.field}`;
        const nestedErrors = validateField(nestedValue, nestedRule, row, entity, nestedPath, item);
        errors.push(...nestedErrors);
      });
    });
  }

  return errors;
}

/**
 * Validate an entity using a validation config
 */
export function validateEntity(
  data: any,
  index: number,
  config: ValidationConfig,
  merchantId: number
): ImportValidationError[] {
  const errors: ImportValidationError[] = [];

  // Validate each rule
  for (const rule of config.rules) {
    const value = data[rule.field];
    const fieldErrors = validateField(value, rule, index, config.entity, rule.field, data);
    errors.push(...fieldErrors);
  }

  // Validate merchantId if specified
  if (config.merchantIdField && data[config.merchantIdField]) {
    if (data[config.merchantIdField] !== merchantId) {
      errors.push(
        createError(
          index,
          config.entity,
          config.merchantIdField,
          `Merchant ID mismatch. Expected ${merchantId}, got ${data[config.merchantIdField]}`,
          data[config.merchantIdField]
        )
      );
    }
  }

  return errors;
}

