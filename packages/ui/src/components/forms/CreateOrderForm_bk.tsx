/**
 * CreateOrderForm - A reusable form component for both creating and editing orders
 * 
 * USAGE EXAMPLES:
 * 
 * 1. CREATE MODE (default):
 * <CreateOrderForm
 *   customers={customers}
 *   products={products}
 *   outlets={outlets}
 *   onSubmit={handleCreateOrder}
 *   onCancel={handleCancel}
 * />
 * 
 * 2. EDIT MODE:
 * <CreateOrderForm
 *   isEditMode={true}
 *   initialOrder={existingOrder}
 *   orderNumber={existingOrder.orderNumber}
 *   customers={customers}
 *   products={products}
 *   outlets={outlets}
 *   onSubmit={handleUpdateOrder}
 *   onCancel={handleCancel}
 * />
 * 
 * The form automatically detects edit mode and pre-populates all fields with existing data.
 * In edit mode, the submit button shows "Update Order" instead of "Preview".
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Input,
  Badge,
  Separator,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DateRangePicker,
  type DateRange,
  SearchableSelect,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  ProductAvailabilityAsyncDisplay,
  Skeleton,
  useToasts,
  ToastContainer
} from '@rentalshop/ui';
import { AddCustomerForm } from '../features/Customers/components/AddCustomerForm';
import { OrderPreviewForm } from './OrderPreviewForm';
import { formatCurrency, productsApi, customersApi, handleApiError } from '@rentalshop/utils';
import { useProductAvailability } from '@rentalshop/hooks';
import { PAGINATION, SEARCH, VALIDATION, BUSINESS } from '@rentalshop/constants';

import { 
  Search, 
  Trash2, 
  AlertTriangle, 
  Calendar,
  User,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  X,
  Pencil,
  MessageSquare,
  Plus,
  Minus,
  ShoppingCart,
  Layout,
  Grid,
  List,
  Table as TableIcon,
  Smartphone,
  ChevronDown,
  Info
} from 'lucide-react';
import type { 
  OrderInput, 
  CustomerSearchResult,
  ProductWithStock
} from '@rentalshop/types';

interface OrderItemFormData {
  productId: string;
  quantity: number;
  unitPrice: number;
  deposit: number;
  notes: string;
}

interface OrderFormData {
  orderType: 'RENT' | 'SALE';
  customerId: string;
  outletId: string;
  pickupPlanAt?: string;
  returnPlanAt?: string;
  subtotal: number;
  taxAmount: number;
  discountType: 'amount' | 'percentage';
  discountValue: number;
  discountAmount: number;
  depositAmount: number;
  securityDeposit: number;
  lateFee: number;
  damageFee: number;
  totalAmount: number;
  notes: string;
  orderItems: OrderItemFormData[];
}

interface ValidationErrors {
  customerId?: string;
  orderItems?: string;
  pickupPlanAt?: string;
  returnPlanAt?: string;
  depositAmount?: string;
}

interface CreateOrderFormProps {
  customers?: CustomerSearchResult[];
  products?: ProductWithStock[];
  outlets?: Array<{ id: string; name: string; merchantId?: string }>;
  categories?: Array<{ id: string; name: string }>;
  onSubmit?: (data: OrderInput) => void;
  onCancel?: () => void;
  loading?: boolean;
  layout?: 'stacked' | 'split';
  merchantId?: string; // Add merchant ID for creating new customers
  // Edit mode props
  isEditMode?: boolean;
  initialOrder?: any; // Order data for editing
  orderNumber?: string; // Order number for display in edit mode
}

export const CreateOrderForm: React.FC<CreateOrderFormProps> = ({
  customers = [],
  products = [],
  outlets = [],
  categories = [],
  onSubmit,
  onCancel,
  loading = false,
  layout = 'split',
  merchantId,
  // Edit mode props
  isEditMode = false,
  initialOrder,
  orderNumber,
}) => {
  // Form state
  const [formData, setFormData] = useState<OrderFormData>(() => {
    // Initialize with existing order data if in edit mode
    if (isEditMode && initialOrder) {
      return {
        orderType: initialOrder.orderType || 'RENT',
        customerId: initialOrder.customerId || '',
        outletId: initialOrder.outletId || outlets[0]?.id || '',
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
      customerId: '',
      outletId: outlets[0]?.id || '',
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
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        deposit: item.deposit || 0,
        notes: item.notes || '',
      }));
    }
    return [];
  });
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(() => {
    // Initialize with existing customer if in edit mode
    if (isEditMode && initialOrder?.customer) {
      return {
        id: initialOrder.customerId || '',
        publicId: 0, // Default value
        firstName: initialOrder.customer.firstName,
        lastName: initialOrder.customer.lastName,
        phone: initialOrder.customer.phone,
        email: initialOrder.customer.email || '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        merchantId: '',
        merchant: { id: '', name: '' }
      };
    }
    return null;
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    // Initialize with selected customer info if in edit mode
    if (isEditMode && initialOrder?.customer) {
      return `${initialOrder.customer.firstName} ${initialOrder.customer.lastName} - ${initialOrder.customer.phone}`;
    }
    return '';
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filteredProducts, setFilteredProducts] = useState<ProductWithStock[]>(products);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProductList, setShowProductList] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerSearchResult[]>([]);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [showManualCustomerInput, setShowManualCustomerInput] = useState(false);
  const [showOrderPreview, setShowOrderPreview] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false); // Add loading state for customer creation
  
  // Product availability hook
  const { calculateAvailability } = useProductAvailability();
  
  // Toast notifications
  const { toasts, showSuccess, showError, showInfo, removeToast } = useToasts();

  // Create a custom getProductAvailabilityStatus function
  const getProductAvailabilityStatus = async (product: ProductWithStock, startDate?: string, endDate?: string, requestedQuantity: number = BUSINESS.DEFAULT_QUANTITY) => {
    try {
      // Debug: Log the product data we're working with
      console.log('Product availability check:', {
        productId: product.id,
        productName: product.name,
        rawOutletStock: product.outletStock,
        startDate,
        endDate,
        requestedQuantity
      });

      // Get stock information from outletStock array (this is where the real data is)
      const outletStock = product.outletStock?.[0]; // Get first outlet stock entry
      const available = outletStock?.available ?? 0;
      const stock = outletStock?.stock ?? 0;
      const renting = outletStock?.renting ?? 0;
      const totalStock = stock; // Use outlet stock instead of totalStock

      console.log('Processed values:', { 
        available, 
        stock, 
        renting, 
        totalStock,
        outletStock: product.outletStock 
      });

      if (!startDate || !endDate) {
        // Return basic availability status
        if (available === 0) {
          return { 
            status: 'out-of-stock', 
            text: 'Out of Stock', 
            color: 'bg-red-100 text-red-600' 
          };
        } else if (available <= VALIDATION.LOW_STOCK_THRESHOLD) {
          return { 
            status: 'low-stock', 
            text: `Low Stock (${available})`, 
            color: 'bg-orange-100 text-orange-600' 
          };
        } else {
          return { 
            status: 'available', 
            text: `Available (${available})`, 
            color: 'bg-green-100 text-green-600' 
          };
        }
      }

      // Use the hook's calculateAvailability function
      const availability = calculateAvailability(
        {
          id: product.id,
          name: product.name,
          stock: stock,
          renting: renting,
          available: available
        },
        startDate,
        endDate,
        requestedQuantity
      );

      console.log('Hook response:', availability);

      // Ensure we have valid numeric values from the hook response
      const availableQuantity = availability?.availableQuantity ?? 0;
      const isAvailable = availability?.available ?? false;

      console.log('Final values:', { availableQuantity, isAvailable });

      // Return formatted status for display
      if (isAvailable) {
        return { 
          status: 'available', 
          text: `Available (${availableQuantity})`, 
          color: 'bg-green-100 text-green-600' 
        };
      } else {
        return { 
          status: 'unavailable', 
          text: `Unavailable (${availableQuantity}/${stock})`, 
          color: 'bg-red-100 text-red-600' 
        };
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      // Fallback to basic status with safe defaults
      const outletStock = product.outletStock?.[0];
      const available = outletStock?.available ?? 0;
      if (available === 0) {
        return { status: 'unknown', text: 'Out of Stock', color: 'bg-red-100 text-red-600' };
      } else if (available <= VALIDATION.LOW_STOCK_THRESHOLD) {
        return { status: 'unknown', text: 'Low Stock', color: 'bg-orange-100 text-orange-600' };
      } else {
        return { status: 'unknown', text: 'In Stock', color: 'bg-green-100 text-green-600' };
      }
    }
  };

  // Handle preview button click
  const handlePreviewClick = (e: React.FormEvent) => {
    e.preventDefault();
    setShowOrderPreview(true);
  };

  // Handle order confirmation from preview
  const handleOrderConfirm = async () => {
    setShowOrderPreview(false);
    // Create a mock event for handleSubmit
    const mockEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleSubmit(mockEvent);
  };

  // Ref for search container to detect click outside
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // API search functions
  const searchProducts = useCallback(async (query: string): Promise<ProductWithStock[]> => {
    if (!query.trim()) return [];
    
    try {
      setIsLoadingProducts(true);
      
      const result = await productsApi.getProducts({ 
        search: query, 
        limit: PAGINATION.SEARCH_LIMIT
      });
      
      if (result.success && result.data?.products) {
        // Return the products directly since they're already ProductWithStock
        return result.data.products;
      }
      return [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Customer search function for SearchableSelect
  const searchCustomers = useCallback(async (query: string): Promise<{ value: string; label: string; type: 'customer' }[]> => {
    if (!query.trim()) {
      setCustomerSearchResults([]);
      return [];
    }
    
    try {
      setIsLoadingCustomers(true);
      
              const result = await customersApi.getCustomers({ 
          search: query, 
          limit: PAGINATION.SEARCH_LIMIT, 
          isActive: true 
        });
      
      if (result.success && result.data?.customers && result.data.customers.length > 0) {
        // Store the full customer data for later use
        setCustomerSearchResults(result.data.customers);
        
        // Return in SearchableSelect format
        const searchOptions = result.data.customers.map((customer: CustomerSearchResult) => ({
          value: customer.id,
          label: `${customer.firstName} ${customer.lastName} - ${customer.phone}`,
          type: 'customer' as const
        }));
        
        return searchOptions;
      } else {
        setCustomerSearchResults([]);
        return [];
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      setCustomerSearchResults([]);
      return [];
    } finally {
      setIsLoadingCustomers(false);
    }
  }, []);

  // Product search function for SearchableSelect
  const searchProductsForSelect = useCallback(async (query: string): Promise<{ value: string; label: string; image?: string; subtitle?: string; details?: string[]; type: 'product' }[]> => {
    if (!query.trim()) {
      return [];
    }
    
    try {
      setIsLoadingProducts(true);
      
      const result = await productsApi.getProducts({ 
        search: query, 
        limit: PAGINATION.SEARCH_LIMIT
      });
      
      if (result.success && result.data?.products) {
        // Transform the products to match enhanced SearchableSelect format
        return result.data.products.map((product: any) => {
          // Get stock information from outletStock array (this is where the real data is)
          const outletStock = product.outletStock?.[0];
          const available = outletStock?.available ?? 0;
          const stock = outletStock?.stock ?? 0;
          const totalStock = stock; // Use outlet stock instead of totalStock
          
                  return {
          value: String(product.publicId), // Use publicId instead of internal id
          label: product.name,
          image: product.image || product.imageUrl, // Support both image and imageUrl fields
          subtitle: product.barcode ? `Barcode: ${product.barcode}` : 'No Barcode',
          details: [
            `$${(product.rentPrice || 0).toFixed(2)}`,
            `Deposit: $${(product.deposit || 0).toFixed(2)}`,
            `Available: ${available}`,
            `Total Stock: ${totalStock}`,
            product.category?.name || 'No Category'
          ].filter(Boolean), // Remove empty values
          type: 'product' as const
        };
        });
      }
      return [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Handle adding new customer
  const handleAddNewCustomer = async (customerData: any) => {
    try {
      // Get merchant ID from props or fallback to first outlet's merchant ID
      const currentMerchantId = merchantId || outlets[0]?.merchantId;
      
      if (!currentMerchantId) {
        console.error('No merchant ID available');
        throw new Error('Merchant ID is required to create a customer. Please ensure the form has access to merchant information.');
      }
      
      // Check for duplicate phone number before creating
      try {
        // Normalize phone number for comparison (remove spaces, dashes, parentheses, +)
        const normalizedPhone = customerData.phone.replace(/[\s\-\(\)\+]/g, '');
        console.log('🔍 Checking for duplicate phone:', customerData.phone, 'Normalized:', normalizedPhone);
        
        // First, check in the already loaded search results for immediate feedback
        const localDuplicate = customerSearchResults.find(customer => {
          if (customer.phone) {
            const existingNormalizedPhone = customer.phone.replace(/[\s\-\(\)\+]/g, '');
            return normalizedPhone === existingNormalizedPhone;
          }
          return false;
        });
        
        if (localDuplicate) {
          throw new Error(`A customer with phone number "${customerData.phone}" already exists (${localDuplicate.firstName} ${localDuplicate.lastName}). Please use a different phone number or search for the existing customer.`);
        }
        
        // Then check with the API for a more comprehensive check
        const duplicateCheck = await customersApi.getCustomerByPhone(customerData.phone);
        console.log('🔍 Duplicate check response:', duplicateCheck);
        
        // Check if there are existing customers with the same phone
        if (duplicateCheck.success && duplicateCheck.data) {
          // The API might return customers array or a single customer
          const existingCustomers = duplicateCheck.data.customers || duplicateCheck.data.customer || [];
          const customersArray = Array.isArray(existingCustomers) ? existingCustomers : [existingCustomers];
          
          // Check each existing customer for phone number match (with normalization)
          for (const existingCustomer of customersArray) {
            if (existingCustomer.phone) {
              const existingNormalizedPhone = existingCustomer.phone.replace(/[\s\-\(\)\+]/g, '');
              if (normalizedPhone === existingNormalizedPhone) {
                // Found duplicate phone number
                throw new Error(`A customer with phone number "${customerData.phone}" already exists (${existingCustomer.firstName} ${existingCustomer.lastName}). Please use a different phone number or search for the existing customer.`);
              }
            }
          }
        }
        console.log('✅ No duplicate phone number found, proceeding with customer creation');
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          throw error; // Re-throw duplicate error
        }
        // If it's not a duplicate error, continue with creation
        console.log('Phone number check completed, proceeding with customer creation');
      }
      
      const result = await customersApi.createCustomer({
        ...customerData,
        merchantId: currentMerchantId,
        isActive: true
      });
      
      if (result.success && result.data?.customer) {
        const newCustomer = result.data.customer;
        
        // Add to search results
        setCustomerSearchResults(prev => [newCustomer, ...prev]);
        
        // Auto-select the new customer
        setFormData(prev => ({
          ...prev,
          customerId: newCustomer.id,
        }));
        setSelectedCustomer(newCustomer);
        
        // Close dialog
        setShowAddCustomerDialog(false);
        
        // Show success message
        showSuccess("Customer Created", `Customer "${newCustomer.firstName} ${newCustomer.lastName}" has been created and selected.`);
      } else {
        // Handle API error response
        const errorMessage = result.message || 'Failed to create customer';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      
      // Check if it's a duplicate phone error from the API
      if (error instanceof Error) {
        if (error.message.includes('DUPLICATE_PHONE') || error.message.includes('already exists')) {
          // Show duplicate phone error
          showError("Duplicate Phone Number", "A customer with this phone number already exists. Please use a different phone number or search for the existing customer.");
          return; // Don't re-throw, just show the error
        }
      }
      
      // Handle unauthorized errors by redirecting to login
      try {
        handleApiError(error);
      } catch (handledError) {
        // If handleApiError doesn't redirect, show generic error
        showError("Error", error instanceof Error ? error.message : 'Failed to create customer');
      }
    }
  };

  // Filter products based on search and category
  useEffect(() => {
    let filtered = products;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category?.id === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  }, [selectedCategory, products]);

  // Real-time product search with API - REMOVED since we're using SearchableSelect now

  // Calculate totals when order items change
  useEffect(() => {
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

  // Update customer info when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      setFormData(prev => ({
        ...prev,
        customerId: selectedCustomer.id,
      }));
    }
  }, [selectedCustomer]);

  // Initialize form data when initialOrder changes (for edit mode)
  useEffect(() => {
    if (isEditMode && initialOrder) {
      // Update form data with initial order values
      setFormData(prev => ({
        ...prev,
        orderType: initialOrder.orderType || 'RENT',
        customerId: initialOrder.customerId || '',
        outletId: initialOrder.outletId || outlets[0]?.id || '',
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
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          deposit: item.deposit || 0,
          notes: item.notes || '',
        }));
        setOrderItems(initialOrderItems);
      }

      // Update selected customer and search query
      if (initialOrder.customer) {
        const customer = {
          id: initialOrder.customerId || '',
          publicId: 0,
          firstName: initialOrder.customer.firstName,
          lastName: initialOrder.customer.lastName,
          phone: initialOrder.customer.phone,
          email: initialOrder.customer.email || '',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          merchantId: '',
          merchant: { id: '', name: '' }
        };
        setSelectedCustomer(customer);
        // Set the search query to show the customer info
        setSearchQuery(`${customer.firstName} ${customer.lastName} - ${customer.phone}`);
      }
    }
  }, [isEditMode, initialOrder, outlets]);

  // Detect click outside popup to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowProductList(false);
      }
    };

    if (showProductList) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showProductList]);

  // Add product to order
  const addProductToOrder = (product: ProductWithStock) => {
    const productIdString = String(product.id); // Convert to string for consistent comparison
    const existingItem = orderItems.find(item => item.productId === productIdString);
    
    if (existingItem) {
      // Update quantity if product already exists
      const updatedItems = orderItems.map(item =>
        item.productId === productIdString
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      setOrderItems(updatedItems);
    } else {
      // Add new product - use rentPrice since salePrice doesn't exist on ProductWithStock
      // Ensure we have valid numeric values with defaults
      const rentPrice = product.rentPrice ?? 0;
      const deposit = product.deposit ?? 0;
      
      console.log('Adding product to order:', {
        productId: product.id,
        productName: product.name,
        rentPrice,
        deposit,
        outletStock: product.outletStock
      });
      
      const newItem: OrderItemFormData = {
        productId: String(product.id), // Convert to string to match interface type
        quantity: BUSINESS.DEFAULT_QUANTITY,
        unitPrice: formData.orderType === 'RENT' ? rentPrice : rentPrice, // Use rentPrice as fallback
        deposit: deposit,
        notes: '',
      };
      setOrderItems([...orderItems, newItem]);
    }
  };

  // Remove product from order
  const removeProductFromOrder = (productId: string) => {
    setOrderItems(orderItems.filter(item => item.productId !== productId));
  };

  // Update order item
  const updateOrderItem = (productId: string, field: keyof OrderItemFormData, value: string | number) => {
    const updatedItems = orderItems.map(item => {
      if (item.productId === productId) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate total price if quantity or unit price changes
        if (field === 'quantity' || field === 'unitPrice') {
          // totalPrice is calculated dynamically
        }
        
        return updatedItem;
      }
      return item;
    });
    setOrderItems(updatedItems);
  };

  // Calculate rental days
  const calculateRentalDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Update rental dates and recalculate prices
  const updateRentalDates = (startDate: string, endDate: string) => {
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
  };

  // Validate form
  const validateForm = (): boolean => {
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
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare API payload
      const apiPayload = {
        orderType: formData.orderType,
        customerId: formData.customerId,
        outletId: formData.outletId,
        pickupPlanAt: formData.pickupPlanAt ? new Date(formData.pickupPlanAt).toISOString() : undefined,
        returnPlanAt: formData.returnPlanAt ? new Date(formData.returnPlanAt).toISOString() : undefined,
        subtotal: formData.subtotal,
        taxAmount: formData.taxAmount,
        discountAmount: formData.discountAmount,
        depositAmount: formData.depositAmount,
        securityDeposit: formData.securityDeposit,
        lateFee: formData.lateFee,
        damageFee: formData.damageFee,
        totalAmount: formData.totalAmount,
        notes: formData.notes,
        orderItems: orderItems.map(item => ({
          productId: String(item.productId), // Convert to string to match API schema
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          deposit: item.deposit,
          notes: item.notes,
        }))
      };
      
      // Add order ID for edit mode
      if (isEditMode && initialOrder?.id) {
        (apiPayload as any).id = initialOrder.id;
      }
      
      onSubmit?.(apiPayload as OrderInput);
    } catch (error) {
      console.error('Error submitting order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    const hasProducts = orderItems.length > 0;
            const hasCustomer = formData.customerId;
    
    if (formData.orderType === 'RENT') {
      return hasProducts && hasCustomer && formData.pickupPlanAt && formData.returnPlanAt;
    } else {
      return hasProducts && hasCustomer;
    }
  };


        return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="w-full">

        {/* Header for edit mode */}
        {isEditMode && orderNumber && (
          <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Edit Order #{orderNumber}
                </h1>
                <p className="text-sm text-gray-600">
                  Modify order information and items
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                  EDIT MODE
                </Badge>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Left Column - Products Section (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products Search and List */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                {/* Search and Filter Bar */}
                <div className="space-y-3" ref={searchContainerRef}>
                  <div className="relative">
                    <SearchableSelect
                      placeholder="Search products by name, barcode or description..."
                      value=""
                      onChange={(productId: string) => {
                        // Find the product and add it to order
                        const product = products.find(p => p.id === productId);
                        if (product) {
                          addProductToOrder(product);
                        }
                      }}
                      onSearch={searchProductsForSelect}
                      searchPlaceholder="Type to search products..."
                      emptyText="No products found. Try a different search term."
                      showAddNew={false}
                    />
                    {isLoadingProducts && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Skeleton className="w-4 h-4 rounded-full" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Products Section - Separate from search */}
                <div className="space-y-4">
                  {/* Selected Products Card - Always visible */}
                  <Card className="border border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        Selected Products <span className="text-red-500">*</span>
                        <span className="text-sm font-normal text-gray-500">({orderItems.length})</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {orderItems.length === 0 ? (
                        /* Empty State Placeholder */
                        <div className="p-8 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                            <Package className="w-16 h-16" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-600 mb-2">
                            No Products Selected
                          </h3>
                          <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                            Search for products above to add them to your order. You can search by name, barcode, or description.
                          </p>
                        </div>
                      ) : (
                        /* Product List */
                        <div className="space-y-3">
                          {orderItems.map((item, index) => (
                            <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                              {/* Product Header with Image */}
                              <div className="flex items-start gap-4 mb-3">
                                {/* Product Image */}
                                <div className="flex-shrink-0">
                                  {(() => {
                                    const product = products.find(p => p.id === item.productId);
                                    const imageUrl = product?.images?.[0]; // Access first image from array
                                    
                                    if (imageUrl) {
                                      return (
                                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                                          <img 
                                            src={imageUrl} 
                                            alt={product?.name || 'Product'}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              // Fallback to package icon if image fails to load
                                              e.currentTarget.style.display = 'none';
                                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                            }}
                                          />
                                          <div className="hidden w-full h-16 bg-gray-100 flex items-center justify-center">
                                            <Package className="w-8 h-8 text-gray-400" />
                                          </div>
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                                          <Package className="w-8 h-8 text-gray-400" />
                                        </div>
                                      );
                                    }
                                  })()}
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">
                                        {products.find(p => p.id === item.productId)?.name || 'Unknown Product'}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {products.find(p => p.id === item.productId)?.barcode || 'No Barcode'}
                                      </div>
                                      {/* Availability Warning */}
                                      {formData.orderType === 'RENT' && (
                                        <div className="mt-2">
                                          <ProductAvailabilityAsyncDisplay 
                                            product={products.find(p => p.id === item.productId)}
                                            pickupDate={formData.pickupPlanAt}
                                            returnDate={formData.returnPlanAt}
                                            requestedQuantity={item.quantity}
                                            getProductAvailabilityStatus={getProductAvailabilityStatus}
                                          />
                                          {!formData.pickupPlanAt || !formData.returnPlanAt ? (
                                            <div className="text-xs text-gray-500 mt-1">
                                              Select rental dates to check availability
                                            </div>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeProductFromOrder(item.productId)}
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-150"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Editable Fields */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Quantity */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Quantity
                                  </label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateOrderItem(item.productId, 'quantity', parseInt(e.target.value) || BUSINESS.DEFAULT_QUANTITY)}
                                    className="h-8 text-sm"
                                  />
                                </div>

                                {/* Unit Price */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Unit Price
                                  </label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={(e) => updateOrderItem(item.productId, 'unitPrice', parseFloat(e.target.value) || BUSINESS.DEFAULT_DISCOUNT)}
                                    className="h-8 text-sm"
                                  />
                                </div>

                                {/* Deposit */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Deposit
                                  </label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.deposit}
                                    onChange={(e) => updateOrderItem(item.productId, 'deposit', parseFloat(e.target.value) || BUSINESS.DEFAULT_DEPOSIT)}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>

                              {/* Notes */}
                              <div className="mt-3">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Notes
                                </label>
                                <Input
                                  value={item.notes}
                                  onChange={(e) => updateOrderItem(item.productId, 'notes', e.target.value)}
                                  placeholder="Add notes for this item..."
                                  className="h-8 text-sm"
                                />
                              </div>

                              {/* Summary */}
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                                <div className="text-sm text-gray-600">
                                  Total: {item.quantity} × ${item.unitPrice.toFixed(2)} = ${(item.quantity * item.unitPrice).toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Deposit: ${item.deposit.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Info & Summary (1/3) */}
          <div className="space-y-6">
            {/* Order Info Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Outlet Selection - Full Width */}
                <div className="space-y-2 w-full">
                  <label className="text-sm font-medium text-text-primary">
                    Outlet <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.outletId}
                    onValueChange={(value: string) => {
                      setFormData(prev => ({ ...prev, outletId: value }));
                    }}
                  >
                    <SelectTrigger variant="filled" className="w-full">
                      <SelectValue placeholder="Select outlet..." />
                    </SelectTrigger>
                    <SelectContent>
                      {outlets.map((outlet) => (
                        <SelectItem key={outlet.id} value={outlet.id}>
                          {outlet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer Selection - Full Width */}
                <div className="space-y-2 w-full">
                  <label className="text-sm font-medium text-text-primary">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search customers by name or phone..."
                        value={selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName} - ${selectedCustomer.phone}` : searchQuery}

                        onFocus={() => {
                          // Show search results when focused if there's a query
                          if (searchQuery.trim()) {
                            searchCustomers(searchQuery);
                          }
                        }}
                        onChange={(e) => {
                          const query = e.target.value;
                          
                          // If user is typing and there's a selected customer, clear the selection
                          if (selectedCustomer && query !== `${selectedCustomer.firstName} ${selectedCustomer.lastName} - ${selectedCustomer.phone}`) {
                            setSelectedCustomer(null);
                            setFormData(prev => ({
                              ...prev,
                              customerId: '',
                            }));
                          }
                          
                          setSearchQuery(query);
                          
                          if (query.trim()) {
                            searchCustomers(query);
                          } else {
                            setCustomerSearchResults([]);
                          }
                        }}
                        className={`h-11 w-full rounded-lg border pl-4 pr-12 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                          selectedCustomer 
                            ? 'border-green-500 bg-green-50 text-green-900 font-medium' 
                            : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      />
                      {selectedCustomer ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setSearchQuery('');
                            setFormData(prev => ({
                              ...prev,
                              customerId: '',
                            }));
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors duration-150"
                          title="Clear selected customer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (searchQuery.trim()) {
                              searchCustomers(searchQuery);
                            }
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Search Results Dropdown */}
                      {!selectedCustomer && (customerSearchResults.length > 0 || searchQuery.trim()) && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                          {/* Add New Customer Button - Always at Top */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddCustomerDialog(true);
                              setCustomerSearchResults([]);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-200 bg-blue-50/50 text-blue-700 font-medium"
                          >
                            <div className="flex items-center gap-2">
                              <Plus className="w-4 h-4" />
                              <span>Add New Customer</span>
                            </div>
                            {searchQuery.trim() && (
                              <div className="text-xs text-blue-600 mt-1">
                                Create customer: "{searchQuery}"
                              </div>
                            )}
                          </button>

                          {/* Customer Results */}
                          {customerSearchResults.length > 0 ? (
                            <>
                              {customerSearchResults.map((customer) => (
                                <button
                                  key={customer.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomer(customer);
                                    setFormData(prev => ({
                                      ...prev,
                                      customerId: customer.id,
                                    }));
                                    setSearchQuery(`${customer.firstName} ${customer.lastName} - ${customer.phone}`);
                                    setCustomerSearchResults([]);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium text-gray-900">
                                    {customer.firstName} {customer.lastName}
                                  </div>
                                  <div className="text-sm text-gray-600">{customer.phone}</div>
                                </button>
                              ))}
                            </>
                          ) : (
                            /* No Results - Show Message */
                            <div className="p-4 text-center">
                              <div className="text-sm text-gray-500">
                                No customers found for "{searchQuery}"
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                Use the "Add New Customer" button above to create one
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {isLoadingCustomers && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Skeleton className="w-4 h-4 rounded-full" />
                      </div>
                    )}
                  </div>

                </div>

                {/* Order Type Toggle - Full Width */}
                <div className="space-y-2 w-full">
                  <label className="text-sm font-medium text-text-primary">
                    Order Type
                    {isEditMode && (
                      <span className="ml-2 text-xs text-gray-500 font-normal">
                        (Cannot be changed when editing)
                      </span>
                    )}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isEditMode}
                      onClick={() => {
                        if (!isEditMode) {
                          setFormData(prev => ({ ...prev, orderType: 'RENT' }));
                        }
                      }}
                      className={`h-10 px-4 py-2 rounded-lg border transition-colors ${
                        formData.orderType === 'RENT' 
                          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Rent
                    </button>
                    <button
                      type="button"
                      disabled={isEditMode}
                      onClick={() => {
                        if (!isEditMode) {
                          setFormData(prev => ({ 
                            ...prev, 
                            orderType: 'SALE',
                            pickupPlanAt: '', 
                            returnPlanAt: '',
                            depositAmount: 0 
                          }));
                        }
                      }}
                      className={`h-10 px-4 py-2 rounded-lg border transition-colors ${
                        formData.orderType === 'SALE' 
                          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Sale
                    </button>
                  </div>
                  {isEditMode && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                      <Info className="w-3 h-3 inline mr-1" />
                      Order type cannot be changed after creation to maintain data integrity and business rules.
                    </div>
                  )}
                </div>

                {/* Deposit Amount - Full Width - Only for RENT orders */}
                {formData.orderType === 'RENT' && (
                  <div className="space-y-2 w-full">
                    <label className="text-sm font-medium text-text-primary">Deposit</label>
                    <Input
                      type="number"
                      placeholder="Enter deposit amount..."
                      value={formData.depositAmount || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setFormData(prev => ({ ...prev, depositAmount: value }));
                      }}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Discount Section - Full Width */}
                <div className="space-y-2 w-full">
                  <label className="text-sm font-medium text-text-primary">Discount</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Discount amount..."
                        value={formData.discountValue || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({ ...prev, discountValue: value }));
                        }}
                        className="w-full"
                      />
                    </div>
                    <Select
                      value={formData.discountType}
                      onValueChange={(value: 'amount' | 'percentage') => {
                        setFormData(prev => ({ ...prev, discountType: value }));
                      }}
                    >
                      <SelectTrigger variant="filled" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">$</SelectItem>
                        <SelectItem value="percentage">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Rental Dates - Only show for RENT orders */}
                {formData.orderType === 'RENT' && (
                  <div className="space-y-2 w-full">
                    <label className="text-sm font-medium text-text-primary">
                      Rental Period <span className="text-red-500">*</span>
                    </label>
                    <DateRangePicker
                      value={{
                        from: formData.pickupPlanAt ? new Date(formData.pickupPlanAt) : undefined,
                        to: formData.returnPlanAt ? new Date(formData.returnPlanAt) : undefined
                      }}
                      onChange={(range: DateRange) => {
                        const startDate = range.from ? range.from.toISOString().split('T')[0] : '';
                        const endDate = range.to ? range.to.toISOString().split('T')[0] : '';
                        
                        setFormData(prev => ({
                          ...prev,
                          pickupPlanAt: startDate,
                          returnPlanAt: endDate
                        }));
                        
                        if (startDate && endDate) {
                          updateRentalDates(startDate, endDate);
                        }
                      }}
                      placeholder="Select rental period"
                      minDate={new Date()}
                      showPresets={false}
                      format="long"
                    />
                  </div>
                )}

                {/* Order Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Order Notes</label>
                  <Textarea
                    placeholder="Enter order notes..."
                    value={formData.notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Order Summary */}
                <div className="space-y-3 p-4 border border-border rounded-lg bg-bg-primary">
                  <h4 className="font-medium text-text-primary">Order Summary</h4>
                  
                  {/* Subtotal */}
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(formData.subtotal)}</span>
                  </div>

                  {/* Discount */}
                  {formData.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-action-success">
                                             <span>Discount:</span>
                      <span className="font-medium">-{formatCurrency(formData.discountAmount)}</span>
                    </div>
                  )}

                  {/* Deposit */}
                  {formData.orderType === 'RENT' && formData.depositAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Deposit:</span>
                      <span className="font-medium">{formatCurrency(formData.depositAmount)}</span>
                    </div>
                  )}

                  {/* Grand Total */}
                  <div className="flex justify-between text-lg font-bold text-action-primary pt-2 border-t border-border">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(formData.totalAmount)}</span>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="space-y-4 pt-2">
                  {/* Validation Summary */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">Order Requirements:</h4>
                    <div className="space-y-2 text-sm">
                      {/* Products Required */}
                      <div className="flex items-center gap-2">
                        {orderItems.length > 0 ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={orderItems.length > 0 ? 'text-green-700' : 'text-red-600'}>
                          {orderItems.length > 0 ? '✓' : '✗'} Select at least one product
                          {orderItems.length > 0 && ` (${orderItems.length} selected)`}
                        </span>
                      </div>

                      {/* Customer Required */}
                      <div className="flex items-center gap-2">
                        {formData.customerId ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={formData.customerId ? 'text-green-700' : 'text-red-600'}>
                          {formData.customerId ? '✓' : '✗'} Customer information required
                        </span>
                      </div>

                      {/* Rental Period Required for RENT orders */}
                      {formData.orderType === 'RENT' && (
                        <div className="flex items-center gap-2">
                          {formData.pickupPlanAt && formData.returnPlanAt ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className={formData.pickupPlanAt && formData.returnPlanAt ? 'text-green-700' : 'text-red-600'}>
                            {formData.pickupPlanAt && formData.returnPlanAt ? '✓' : '✗'} Rental period required (pickup & return dates)
                          </span>
                        </div>
                      )}

                      {/* Outlet Required */}
                      <div className="flex items-center gap-2">
                        {formData.outletId ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={formData.outletId ? 'text-green-700' : 'text-red-600'}>
                          {formData.outletId ? '✓' : '✗'} Outlet selection required
                        </span>
                      </div>


                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      disabled={loading || !isFormValid()}
                      onClick={handlePreviewClick}
                      className="flex-1"
                    >
                      {loading ? 'Processing...' : isEditMode ? 'Update Order' : 'Preview'}
                    </Button>
                    {onCancel && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1"
                      >
                        {isEditMode ? 'Cancel' : 'Reset Selection'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Customer Creation Dialog */}
      <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {isCreatingCustomer ? 'Creating Customer...' : 'Add New Customer'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <AddCustomerForm
              onSave={async (customerData) => {
                console.log('🚀 AddCustomerForm onSave called with:', customerData);
                
                try {
                  setIsCreatingCustomer(true); // Start loading
                  
                  // Get merchant ID from props or fallback to first outlet's merchant ID
                  const currentMerchantId = merchantId || outlets[0]?.merchantId;
                  
                  if (!currentMerchantId) {
                    console.error('❌ No merchant ID available');
                    throw new Error('Merchant ID is required to create a customer. Please ensure the form has access to merchant information.');
                  }
                  
                  console.log('📞 Calling API with merchant ID:', currentMerchantId);
                  
                  const result = await customersApi.createCustomer({
                    ...customerData,
                    merchantId: currentMerchantId,
                    isActive: true
                  });
                  
                  console.log('📡 API response:', result);
                  
                  if (result.success && result.data) {
                    const newCustomer = result.data;
                    
                    console.log('✅ Customer created successfully:', newCustomer);
                    
                    // Validate that the customer data has required fields
                    if (!newCustomer.id || !newCustomer.firstName || !newCustomer.lastName || !newCustomer.phone) {
                      console.error('❌ Customer data missing required fields:', newCustomer);
                      throw new Error('Customer created but data is incomplete. Please try again.');
                    }
                    
                    // Auto-select the new customer
                    setSelectedCustomer(newCustomer);
                    console.log('✅ Selected customer set:', newCustomer);
                    
                    // Update form data with customer information
                    setFormData(prev => ({
                      ...prev,
                      customerId: newCustomer.id,
                    }));
                    console.log('✅ Form data updated with customer info');
                    
                    // Update search query to show selected customer
                    const customerDisplayName = `${newCustomer.firstName} ${newCustomer.lastName} - ${newCustomer.phone}`;
                    setSearchQuery(customerDisplayName);
                    console.log('✅ Search query updated:', customerDisplayName);
                    
                    // Clear search results
                    setCustomerSearchResults([]);
                    console.log('✅ Search results cleared');
                    
                    // Close dialog
                    console.log('🔒 Closing dialog...');
                    setShowAddCustomerDialog(false);
                    
                    console.log('✅ Dialog closed');
                    
                    // Show success message
                    showSuccess("Customer Created", `Customer "${newCustomer.firstName} ${newCustomer.lastName}" has been created and selected.`);
                  } else {
                    // Handle API error response
                    const errorMessage = result.error || 'Failed to create customer';
                    throw new Error(errorMessage);
                  }
                } catch (error) {
                  console.error('❌ Error creating customer:', error);
                  
                  // Check if it's a duplicate phone error from the API
                  if (error instanceof Error) {
                    if (error.message.includes('DUPLICATE_PHONE') || error.message.includes('already exists')) {
                      // Show duplicate phone error
                      showError("Duplicate Phone Number", "A customer with this phone number already exists. Please use a different phone number or search for the existing customer.");
                      return; // Don't re-throw, just show the error
                    }
                    
                    // Check for network or connection errors
                    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
                      showError("Network Error", "Unable to connect to the server. Please check your internet connection and try again.");
                      return;
                    }
                    
                    // Check for validation errors
                    if (error.message.includes('validation') || error.message.includes('invalid')) {
                      showError("Validation Error", error.message);
                      return;
                    }
                  }
                  
                  // Handle unauthorized errors by redirecting to login
                  try {
                    handleApiError(error);
                  } catch (handledError) {
                    // If handleApiError doesn't redirect, show generic error
                    showError("Error", error instanceof Error ? error.message : 'Failed to create customer');
                  }
                } finally {
                  setIsCreatingCustomer(false); // Stop loading regardless of outcome
                }
              }}
              onCancel={() => {
                console.log('🚫 AddCustomerForm onCancel called');
                setShowAddCustomerDialog(false);
              }}
              isSubmitting={isCreatingCustomer} // Pass loading state to form
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Preview Dialog */}
      <Dialog open={showOrderPreview} onOpenChange={setShowOrderPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
              Order Preview
            </DialogTitle>
          </DialogHeader>
          
          <OrderPreviewForm
            orderData={{
              orderType: formData.orderType,
              customerId: formData.customerId,
              customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : undefined,
              customerPhone: selectedCustomer?.phone,
              customerEmail: selectedCustomer?.email,
              outletId: formData.outletId,
              outletName: outlets.find(o => o.id === formData.outletId)?.name,
              pickupPlanAt: formData.pickupPlanAt,
              returnPlanAt: formData.returnPlanAt,
              subtotal: formData.subtotal,
              taxAmount: formData.taxAmount,
              discountAmount: formData.discountAmount,
              totalAmount: formData.totalAmount,
              depositAmount: formData.depositAmount,
              securityDeposit: formData.securityDeposit,
              lateFee: formData.lateFee,
              damageFee: formData.damageFee,
              notes: formData.notes,
              orderItems: orderItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice,
                deposit: item.deposit,
                notes: item.notes
              }))
            }}
            products={products}
            onConfirm={handleOrderConfirm}
            onEdit={() => setShowOrderPreview(false)}
            loading={loading}
            confirmText={isEditMode ? 'Update Order' : 'Confirm & Create Order'}
            editText="Back to Edit"
            title="Order Preview"
            subtitle="Review your order details before confirming"
          />
        </DialogContent>
      </Dialog>

      {/* Toast Container for notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};
