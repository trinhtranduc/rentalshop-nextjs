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
  useProductAvailability,
  ProductAvailabilityAsyncDisplay,
  SearchableSelect,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@rentalshop/ui';
import { formatCurrency } from '@rentalshop/utils';

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
  Loader2
} from 'lucide-react';
import type { 
  OrderInput, 
  CustomerSearchResult,
  ProductSearchResult
} from '@rentalshop/database';

interface OrderItemFormData {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deposit: number;
  notes: string;
  startDate?: string;
  endDate?: string;
  daysRented?: number;
}

interface OrderFormData {
  orderType: 'RENT' | 'SALE';
  customerId: string;
  outletId: string;
  pickupPlanAt?: string;
  returnPlanAt?: string;
  subtotal: number;
  discountType: 'amount' | 'percentage';
  discountValue: number;
  discountAmount: number;
  depositAmount: number;
  totalAmount: number;
  notes: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
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
  products?: ProductSearchResult[];
  outlets?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
  onSubmit?: (data: OrderInput) => void;
  onCancel?: () => void;
  loading?: boolean;
  layout?: 'stacked' | 'split';
  merchantId?: string; // Add merchant ID for creating new customers
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
}) => {
  // Form state
  const [formData, setFormData] = useState<OrderFormData>({
    orderType: 'RENT',
    customerId: '',
    outletId: outlets[0]?.id || '',
    pickupPlanAt: '',
    returnPlanAt: '',
    subtotal: 0,
    discountType: 'amount',
    discountValue: 0,
    discountAmount: 0,
    depositAmount: 0,
    totalAmount: 0,
    notes: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    orderItems: [],
  });

  const [orderItems, setOrderItems] = useState<OrderItemFormData[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filteredProducts, setFilteredProducts] = useState<ProductSearchResult[]>(products);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProductList, setShowProductList] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerSearchResult[]>([]);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [showManualCustomerInput, setShowManualCustomerInput] = useState(false);
  const [showOrderPreview, setShowOrderPreview] = useState(false);
  
  // Product availability hook
  const { getProductAvailability, calculateAvailability } = useProductAvailability();

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
  const searchProducts = useCallback(async (query: string): Promise<ProductSearchResult[]> => {
    if (!query.trim()) return [];
    
    try {
      setIsLoadingProducts(true);
      const { authenticatedFetch } = await import('@rentalshop/utils');
      
      const response = await authenticatedFetch(`/api/products?search=${encodeURIComponent(query)}&limit=20`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.products) {
          // Transform the products to match ProductSearchResult format
          return data.data.products.map((product: any) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            barcode: product.barcode,
            stock: product.outletStock?.[0]?.stock || 0,
            renting: product.outletStock?.[0]?.renting || 0,
            available: product.outletStock?.[0]?.available || 0,
            rentPrice: product.rentPrice,
            salePrice: product.salePrice,
            deposit: product.deposit,
            images: product.images,
            isActive: product.isActive,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            outlet: {
              id: product.outletStock?.[0]?.outlet?.id || '',
              name: product.outletStock?.[0]?.outlet?.name || '',
              merchant: {
                id: product.merchant?.id || '',
                companyName: product.merchant?.name || '',
              },
            },
            category: product.category,
          }));
        }
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
      
      const { authenticatedFetch } = await import('@rentalshop/utils');
      
      const response = await authenticatedFetch(`/api/customers?search=${encodeURIComponent(query)}&limit=20&isActive=true`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data?.customers && data.data.customers.length > 0) {
          // Store the full customer data for later use
          setCustomerSearchResults(data.data.customers);
          
          // Return in SearchableSelect format
          const searchOptions = data.data.customers.map((customer: CustomerSearchResult) => ({
            value: customer.id,
            label: `${customer.firstName} ${customer.lastName} - ${customer.phone}`,
            type: 'customer' as const
          }));
          
          return searchOptions;
        } else {
          setCustomerSearchResults([]);
          return [];
        }
      }
      
      setCustomerSearchResults([]);
      return [];
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
      
      const { authenticatedFetch } = await import('@rentalshop/utils');
      
      const response = await authenticatedFetch(`/api/products?search=${encodeURIComponent(query)}&limit=20`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.products) {
          // Transform the products to match enhanced SearchableSelect format
          return data.data.products.map((product: any) => ({
            value: product.id,
            label: product.name,
            image: product.image || product.imageUrl, // Support both image and imageUrl fields
            subtitle: product.barcode ? `Barcode: ${product.barcode}` : 'No Barcode',
            details: [
              `$${product.rentPrice.toFixed(2)}`,
              `Deposit: $${(product.deposit || 0).toFixed(2)}`,
              `Stock: ${product.available}`,
              product.category?.name || 'No Category'
            ].filter(Boolean), // Remove empty values
            type: 'product' as const
          }));
        }
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
      // Get merchant ID from props or fallback to first outlet
      const currentMerchantId = merchantId || outlets[0]?.id;
      
      if (!currentMerchantId) {
        console.error('No merchant ID available');
        return;
      }
      
      const { authenticatedFetch } = await import('@rentalshop/utils');
      
      const response = await authenticatedFetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...customerData,
          merchantId: currentMerchantId,
          isActive: true
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.customer) {
          const newCustomer = data.data.customer;
          
          // Add to search results
          setCustomerSearchResults(prev => [newCustomer, ...prev]);
          
          // Auto-select the new customer
          setFormData(prev => ({
            ...prev,
            customerId: newCustomer.id,
            customerName: `${newCustomer.firstName} ${newCustomer.lastName}`,
            customerPhone: newCustomer.phone,
            customerEmail: newCustomer.email || '',
          }));
          setSelectedCustomer(newCustomer);
          
          // Close dialog
          setShowAddCustomerDialog(false);
        }
      }
    } catch (error) {
      console.error('Error creating customer:', error);
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
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
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
        customerName: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
        customerPhone: selectedCustomer.phone,
        customerEmail: selectedCustomer.email || '',
      }));
    }
  }, [selectedCustomer]);

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
  const addProductToOrder = (product: ProductSearchResult) => {
    const existingItem = orderItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      // Update quantity if product already exists
      const updatedItems = orderItems.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
          : item
      );
      setOrderItems(updatedItems);
    } else {
      // Add new product
      const newItem: OrderItemFormData = {
        productId: product.id,
        quantity: 1,
        unitPrice: formData.orderType === 'RENT' ? product.rentPrice : (product.salePrice || 0),
        totalPrice: formData.orderType === 'RENT' ? product.rentPrice : (product.salePrice || 0),
        deposit: product.deposit,
        notes: '',
        startDate: formData.orderType === 'RENT' ? formData.pickupPlanAt : undefined,
        endDate: formData.orderType === 'RENT' ? formData.returnPlanAt : undefined,
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
          updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
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

  // Get product availability status for rental period
  const getProductAvailabilityStatus = async (product: ProductSearchResult, startDate?: string, endDate?: string, requestedQuantity: number = 1) => {
    try {
      // Use the advanced availability hook
      const availability = await getProductAvailability(
        product, 
        startDate || null, 
        endDate || null, 
        requestedQuantity
      );

      // Return formatted status for display
      if (availability.status === 'available') {
        return { 
          status: 'available', 
          text: `Available (${availability.available}/${availability.storage})`, 
          color: 'bg-green-100 text-green-600' 
        };
      } else if (availability.hasDateConflict) {
        return { 
          status: 'date-conflict', 
          text: `Date Conflict - ${availability.conflictingQuantity} items rented`, 
          color: 'bg-red-100 text-red-600' 
        };
      } else if (availability.storage === 0) {
        return { 
          status: 'out-of-stock', 
          text: 'Out of Stock', 
          color: 'bg-red-100 text-red-600' 
        };
      } else {
        return { 
          status: 'unavailable', 
          text: `Unavailable (${availability.available}/${availability.storage})`, 
          color: 'bg-orange-100 text-orange-600' 
        };
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      // Fallback to basic status
      if (product.available === 0) {
        return { status: 'unknown', text: 'Out of Stock', color: 'bg-red-100 text-red-600' };
      } else if (product.available <= 2) {
        return { status: 'unknown', text: 'Low Stock', color: 'bg-orange-100 text-orange-600' };
      } else {
        return { status: 'unknown', text: 'In Stock', color: 'bg-green-100 text-green-600' };
      }
    }
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
        if (days <= 0) {
          errors.returnPlanAt = 'Return date must be after pickup date';
        }
      }
    }

    if (formData.orderType === 'RENT' && formData.depositAmount < 0) {
      errors.depositAmount = 'Deposit amount cannot be negative';
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
      const orderData: OrderInput = {
        orderType: formData.orderType as any,
        customerId: formData.customerId || undefined,
        outletId: formData.outletId,
        pickupPlanAt: formData.pickupPlanAt ? new Date(formData.pickupPlanAt) : undefined,
        returnPlanAt: formData.returnPlanAt ? new Date(formData.returnPlanAt) : undefined,
        subtotal: formData.subtotal,
        discountAmount: formData.discountAmount,
        depositAmount: formData.depositAmount,
        totalAmount: formData.totalAmount,
        notes: formData.notes,
        customerName: formData.customerName || undefined,
        customerPhone: formData.customerPhone || undefined,
        customerEmail: formData.customerEmail || undefined,
        orderItems: orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          deposit: item.deposit,
          notes: item.notes,
          startDate: item.startDate ? new Date(item.startDate) : undefined,
          endDate: item.endDate ? new Date(item.endDate) : undefined,
          daysRented: item.daysRented,
        }))
      };
      
      onSubmit?.(orderData);
    } catch (error) {
      console.error('Error submitting order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    return orderItems.length > 0 && formData.customerId && formData.pickupPlanAt && formData.returnPlanAt;
  };


        return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="w-full">

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
                        <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
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
                          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-full border border-gray-200">
                            <Search className="w-4 h-4" />
                            <span>Please search for products</span>
                          </div>
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
                                    const imageUrl = product?.images;
                                    
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
                                    onChange={(e) => updateOrderItem(item.productId, 'quantity', parseInt(e.target.value) || 1)}
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
                                    onChange={(e) => updateOrderItem(item.productId, 'unitPrice', parseFloat(e.target.value) || 0)}
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
                                    onChange={(e) => updateOrderItem(item.productId, 'deposit', parseFloat(e.target.value) || 0)}
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
                                  Total: {item.quantity} × ${item.unitPrice.toFixed(2)} = ${item.totalPrice.toFixed(2)}
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
                    <SearchableSelect
                      placeholder="Search customers by name or phone..."
                      value={formData.customerId}
                      onChange={(value: string) => {
                        // Find customer from search results first, then fallback to static customers
                        const customer = customerSearchResults.find(c => c.id === value) || 
                                       customers.find(c => c.id === value);
                        if (customer) {
                          setFormData(prev => ({
                            ...prev,
                            customerId: value,
                            customerName: customer.firstName + ' ' + customer.lastName,
                            customerPhone: customer.phone,
                            customerEmail: customer.email || ''
                          }));
                          setSelectedCustomer(customer);
                        }
                      }}
                      // Remove options prop when using onSearch to prevent conflicts
                      // options={customers.map(customer => ({
                      //   value: customer.id,
                      //   label: `${customer.firstName} ${customer.lastName} - ${customer.phone}`
                      // }))}
                      onSearch={searchCustomers}
                      searchPlaceholder="Type to search customers..."
                      emptyText="No customers found. Try a different search term."
                      showAddNew={true}
                      addNewText="Add New Customer"
                      onAddNew={() => setShowAddCustomerDialog(true)}
                    />
                    {isLoadingCustomers && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
                      </div>
                    )}
                  </div>
                  
                  {/* Manual Customer Input - Collapsible */}
                  <div className="mt-4">
                      {/* Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setShowManualCustomerInput(!showManualCustomerInput)}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-md transition-colors duration-150"
                      >
                        {showManualCustomerInput ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                        )}
                        <span>Or enter customer details manually</span>
                      </button>
                      
                      {/* Collapsible Input Fields */}
                      {showManualCustomerInput && (
                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Customer Name
                              </label>
                              <Input
                                value={formData.customerName}
                                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                                placeholder="Enter customer name"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Phone Number
                              </label>
                              <Input
                                value={formData.customerPhone}
                                onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                                placeholder="Enter phone number"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Email (Optional)
                              </label>
                              <Input
                                type="email"
                                value={formData.customerEmail}
                                onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                                placeholder="Enter email address"
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                </div>

                {/* Order Type Toggle - Full Width */}
                <div className="space-y-2 w-full">
                  <label className="text-sm font-medium text-text-primary">Order Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, orderType: 'RENT' }));
                      }}
                      className={`h-10 px-4 py-2 rounded-lg border transition-colors ${
                        formData.orderType === 'RENT' 
                          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Rent
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ 
                          ...prev, 
                          orderType: 'SALE',
                          pickupPlanAt: '', 
                          returnPlanAt: '',
                          depositAmount: 0 
                        }));
                      }}
                      className={`h-10 px-4 py-2 rounded-lg border transition-colors ${
                        formData.orderType === 'SALE' 
                          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Sale
                    </button>
                  </div>
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
                        {formData.customerId || formData.customerName || formData.customerPhone ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={formData.customerId || formData.customerName || formData.customerPhone ? 'text-green-700' : 'text-red-600'}>
                          {formData.customerId || formData.customerName || formData.customerPhone ? '✓' : '✗'} Customer information required
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
                      {loading ? 'Processing...' : 'Preview'}
                    </Button>
                    {onCancel && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1"
                      >
                        Reset Selection
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Order Preview Dialog - Removed, using direct confirmation instead */}
    </div>
  );
};
