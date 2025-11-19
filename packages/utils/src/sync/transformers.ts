/**
 * Data Transformers
 * Transform data from old server format to new server format
 * TODO: Implement proper transformation logic based on old server API response format
 */

/**
 * Transform customer data from old server to new server format
 * 
 * @param oldCustomer - Customer object from old server
 * @param merchantId - Merchant ID to assign customer to
 * @returns Customer data in new server format
 */
export function transformCustomer(oldCustomer: any, merchantId: number): any {
  // Extract customer data from old server format
  // Adjust field mappings based on actual old server response structure
  const firstName = oldCustomer.first_name || oldCustomer.firstName || oldCustomer.name?.split(' ')[0] || '';
  const lastName = oldCustomer.last_name || oldCustomer.lastName || oldCustomer.name?.split(' ').slice(1).join(' ') || '';
  const fullName = oldCustomer.name || `${firstName} ${lastName}`.trim();
  
  // If no first/last name, split full name
  const finalFirstName = firstName || fullName.split(' ')[0] || 'Customer';
  const finalLastName = lastName || fullName.split(' ').slice(1).join(' ') || '';

  return {
    firstName: finalFirstName,
    lastName: finalLastName,
    email: oldCustomer.email || oldCustomer.email_address || null,
    phone: oldCustomer.phone || oldCustomer.phone_number || oldCustomer.mobile || '',
    address: oldCustomer.address || oldCustomer.street || null,
    city: oldCustomer.city || null,
    state: oldCustomer.state || oldCustomer.province || null,
    zipCode: oldCustomer.zip_code || oldCustomer.zipCode || oldCustomer.postal_code || null,
    country: oldCustomer.country || null,
    dateOfBirth: oldCustomer.date_of_birth || oldCustomer.dateOfBirth || null,
    idNumber: oldCustomer.id_number || oldCustomer.idNumber || oldCustomer.identity_number || null,
    idType: oldCustomer.id_type || oldCustomer.idType || null,
    notes: oldCustomer.notes || oldCustomer.note || oldCustomer.description || null,
    merchantId: merchantId,
    isActive: oldCustomer.is_active !== false && oldCustomer.isActive !== false
  };
}

/**
 * Transform product data from old server to new server format
 * 
 * @param oldProduct - Product object from old server
 * @param merchantId - Merchant ID to assign product to
 * @param categoryId - Category ID to assign product to
 * @param imageUrls - Array of image URLs (already processed)
 * @returns Product data in new server format
 */
export function transformProduct(
  oldProduct: any,
  merchantId: number,
  categoryId: number,
  imageUrls: string[]
): any {
  // Extract product data from old server format
  // Adjust field mappings based on actual old server response structure
  return {
    name: oldProduct.name || oldProduct.product_name || oldProduct.title || 'Untitled Product',
    description: oldProduct.description || oldProduct.desc || oldProduct.details || null,
    barcode: oldProduct.barcode || oldProduct.sku || oldProduct.code || null,
    totalStock: oldProduct.stock || oldProduct.quantity || oldProduct.total_stock || 0,
    rentPrice: oldProduct.rent_price || oldProduct.rentPrice || oldProduct.price || oldProduct.rental_price || 0,
    salePrice: oldProduct.sale_price || oldProduct.salePrice || oldProduct.selling_price || null,
    deposit: oldProduct.deposit || oldProduct.security_deposit || oldProduct.deposit_amount || 0,
    images: Array.isArray(imageUrls) ? imageUrls : (imageUrls ? [imageUrls] : []),
    isActive: oldProduct.is_active !== false && oldProduct.isActive !== false,
    merchantId: merchantId,
    categoryId: categoryId
  };
}

/**
 * Transform order data from old server to new server format
 * 
 * @param oldOrder - Order object from old server
 * @param outletId - Outlet ID to assign order to
 * @param createdById - User ID who created the order
 * @param productMap - Map of old product IDs to new product IDs
 * @returns Order data in new server format
 */
export function transformOrder(
  oldOrder: any,
  outletId: number,
  createdById: number,
  productMap: Map<string | number, { id: number; images?: string[]; name?: string }>
): any {
  // Extract order data from old server format
  // Adjust field mappings based on actual old server response structure
  
  // Determine order type
  let orderType = 'RENT';
  if (oldOrder.order_type) {
    orderType = oldOrder.order_type.toUpperCase();
  } else if (oldOrder.type) {
    orderType = oldOrder.type.toUpperCase();
  } else if (oldOrder.is_sale || oldOrder.isSale) {
    orderType = 'SALE';
  }

  // Determine status
  let status = 'RESERVED';
  if (oldOrder.status) {
    const oldStatus = oldOrder.status.toUpperCase();
    // Map old statuses to new statuses
    if (oldStatus.includes('PICKUP') || oldStatus.includes('RENTING') || oldStatus.includes('ACTIVE')) {
      status = 'PICKUPED';
    } else if (oldStatus.includes('RETURN') || oldStatus.includes('COMPLETE')) {
      status = orderType === 'RENT' ? 'RETURNED' : 'COMPLETED';
    } else if (oldStatus.includes('CANCEL')) {
      status = 'CANCELLED';
    } else if (oldStatus.includes('COMPLETE') || oldStatus.includes('FINISH')) {
      status = 'COMPLETED';
    }
  }

  // Transform order items
  const orderItemsList = oldOrder.list_product || oldOrder.orderItems || oldOrder.items || [];
  const orderItems = orderItemsList.map((oldItem: any) => {
    const oldProductId = oldItem.product_id || oldItem.productId;
    const productInfo = productMap.get(oldProductId);
    
    if (!productInfo) {
      throw new Error(`Product ${oldProductId} not found in product map`);
    }

    const quantity = oldItem.quantity || oldItem.qty || 1;
    const unitPrice = oldItem.unit_price || oldItem.unitPrice || oldItem.price || 0;
    const totalPrice = quantity * unitPrice;
    const deposit = oldItem.deposit || oldItem.security_deposit || 0;

    return {
      productId: productInfo.id,
      quantity,
      unitPrice,
      totalPrice,
      deposit
    };
  });

  // Calculate totals
  const totalAmount = oldOrder.total_amount || oldOrder.totalAmount || oldOrder.total || 
    orderItems.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
  const depositAmount = oldOrder.deposit_amount || oldOrder.depositAmount || oldOrder.deposit ||
    orderItems.reduce((sum: number, item: any) => sum + item.deposit, 0);

  // Parse dates
  const parseDate = (dateStr: any): Date | null => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  return {
    orderType,
    status,
    totalAmount,
    depositAmount,
    pickupPlanAt: parseDate(oldOrder.pickup_plan_at || oldOrder.pickupPlanAt || oldOrder.pickup_date || oldOrder.pickupDate),
    returnPlanAt: parseDate(oldOrder.return_plan_at || oldOrder.returnPlanAt || oldOrder.return_date || oldOrder.returnDate),
    pickedUpAt: parseDate(oldOrder.picked_up_at || oldOrder.pickedUpAt || oldOrder.pickup_at),
    returnedAt: parseDate(oldOrder.returned_at || oldOrder.returnedAt || oldOrder.return_at),
    customerId: null, // Will be set by matching phone number
    customerPhone: oldOrder.customer_phone || oldOrder.customerPhone || oldOrder.phone || null,
    customerName: oldOrder.customer_name || oldOrder.customerName || null,
    createdById: createdById || 0,
    outletId: outletId,
    notes: oldOrder.notes || oldOrder.note || oldOrder.description || null,
    orderItems
  };
}
