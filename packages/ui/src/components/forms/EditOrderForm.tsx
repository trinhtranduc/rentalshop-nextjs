/**
 * EditOrderForm - A wrapper component that reuses CreateOrderForm for editing orders
 * 
 * This demonstrates the DRY principle by reusing the CreateOrderForm component
 * instead of duplicating all the form logic and UI components.
 * 
 * The CreateOrderForm automatically handles:
 * - Pre-populating form fields with existing order data
 * - Switching between create/edit modes
 * - Different button text and validation
 * - All form functionality
 */

'use client'

import React from 'react';
import { CreateOrderForm } from './CreateOrderForm';
import type { OrderInput, OrderDetailData } from '@rentalshop/types';

interface EditOrderFormProps {
  order: OrderDetailData;
  customers?: any[];
  products?: any[];
  outlets?: Array<{ id: number; name: string }>;
  categories?: Array<{ id: number; name: string }>;
  onSubmit?: (data: OrderInput) => void;
  onCancel?: () => void;
  loading?: boolean;
  layout?: 'stacked' | 'split';
  merchantId?: number;
}

export const EditOrderForm: React.FC<EditOrderFormProps> = (props) => {
  // Simply pass through all props to CreateOrderForm with edit mode enabled
  return (
    <CreateOrderForm
      {...props}
      isEditMode={true}
      initialOrder={props.order}
      orderNumber={props.order.orderNumber}
    />
  );
};