/**
 * CreateOrderForm - Main component index
 * 
 * This file exports the main CreateOrderForm component and all its sub-components
 * for easy importing and maintenance.
 */

export { CreateOrderForm } from './CreateOrderForm';
export { OrderFormHeader } from './components/OrderFormHeader';
export { ProductsSection } from './components/ProductsSection';
export { OrderInfoSection } from './components/OrderInfoSection';
export { OrderSummarySection } from './components/OrderSummarySection';
export { CustomerCreationDialog } from './components/CustomerCreationDialog';
export { OrderPreviewDialog } from './components/OrderPreviewDialog';
export { TestEqualHeightColumns } from './components/TestEqualHeightColumns';
export { useCreateOrderForm } from './hooks/useCreateOrderForm';
export { useOrderValidation } from './hooks/useOrderValidation';
export { useProductSearch } from './hooks/useProductSearch';
export { useCustomerSearch } from './hooks/useCustomerSearch';
export type { 
  CreateOrderFormProps, 
  OrderFormData, 
  OrderItemFormData,
  ValidationErrors 
} from './types';
