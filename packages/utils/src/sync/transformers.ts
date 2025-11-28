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
  
  // Handle name: support full_name, name, or first_name/last_name
  const fullName = oldCustomer.full_name || oldCustomer.name || 
    `${oldCustomer.first_name || ''} ${oldCustomer.last_name || ''}`.trim() || '';
  
  // Split full name into first and last name
  const nameParts = fullName.trim().split(/\s+/);
  const finalFirstName = nameParts[0] || 'Customer';
  const finalLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  
  // Handle phone: can be string or false/null
  const phone = oldCustomer.phone && oldCustomer.phone !== false 
    ? String(oldCustomer.phone) 
    : (oldCustomer.phone_number || oldCustomer.mobile || '');

  return {
    firstName: finalFirstName,
    lastName: finalLastName,
    email: oldCustomer.email || oldCustomer.email_address || null,
    phone: phone,
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
    isActive: oldCustomer.is_active !== false && oldCustomer.isActive !== false,
    // Preserve additional fields for reference
    metadata: {
      customerId: oldCustomer.customer_id || oldCustomer.id,
      customerLevel: oldCustomer.customer_level,
      royalRentalPoint: oldCustomer.royal_rental_point,
      royalSalePoint: oldCustomer.royal_sale_point,
      avatar: oldCustomer.avatar
    }
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
  
  // Handle images: support avatar, gallery, images, image_urls
  let finalImageUrls: string[] = [];
  if (Array.isArray(imageUrls) && imageUrls.length > 0) {
    finalImageUrls = imageUrls;
  } else if (oldProduct.gallery && Array.isArray(oldProduct.gallery)) {
    finalImageUrls = oldProduct.gallery.filter((url: any) => url && typeof url === 'string');
  } else if (oldProduct.avatar && typeof oldProduct.avatar === 'string') {
    finalImageUrls = [oldProduct.avatar];
  } else if (oldProduct.images && Array.isArray(oldProduct.images)) {
    finalImageUrls = oldProduct.images.filter((url: any) => url && typeof url === 'string');
  } else if (oldProduct.image_urls && Array.isArray(oldProduct.image_urls)) {
    finalImageUrls = oldProduct.image_urls.filter((url: any) => url && typeof url === 'string');
  } else if (oldProduct.image && typeof oldProduct.image === 'string') {
    finalImageUrls = [oldProduct.image];
  }
  
  // Handle stock: on_hand is current available stock, quantity is total, in_rent is renting, sold is sold
  // totalStock = on_hand + in_rent (available + currently renting)
  // Or use quantity if available
  let totalStock = 0;
  if (oldProduct.quantity !== undefined && oldProduct.quantity !== null) {
    totalStock = Number(oldProduct.quantity) || 0;
  } else if (oldProduct.on_hand !== undefined && oldProduct.in_rent !== undefined) {
    // on_hand can be negative (over-rented), so we use quantity if available
    totalStock = (Number(oldProduct.on_hand) || 0) + (Number(oldProduct.in_rent) || 0);
  } else if (oldProduct.stock !== undefined) {
    totalStock = Number(oldProduct.stock) || 0;
  } else if (oldProduct.total_stock !== undefined) {
    totalStock = Number(oldProduct.total_stock) || 0;
  }
  
  // Ensure totalStock is not negative
  totalStock = Math.max(0, totalStock);
  
  // Handle rent price: use rental_pricing if available, otherwise use rent_price
  let rentPrice = 0;
  if (oldProduct.rental_pricing && Array.isArray(oldProduct.rental_pricing) && oldProduct.rental_pricing.length > 0) {
    // Use first pricing entry (usually daily)
    const firstPricing = oldProduct.rental_pricing[0];
    rentPrice = Number(firstPricing.price) || 0;
  } else {
    rentPrice = oldProduct.rent_price || oldProduct.rentPrice || oldProduct.price || oldProduct.rental_price || 0;
  }
  
  return {
    name: oldProduct.name || oldProduct.product_name || oldProduct.title || 'Untitled Product',
    description: oldProduct.description || oldProduct.desc || oldProduct.details || null,
    barcode: oldProduct.barcode || oldProduct.sku || oldProduct.code || oldProduct.default_code || null,
    totalStock: totalStock,
    rentPrice: Number(rentPrice) || 0,
    salePrice: oldProduct.sale_price ? Number(oldProduct.sale_price) : (oldProduct.salePrice ? Number(oldProduct.salePrice) : null),
    deposit: oldProduct.deposit || oldProduct.security_deposit || oldProduct.deposit_amount || 0,
    images: finalImageUrls,
    isActive: oldProduct.is_active !== false && oldProduct.isActive !== false && oldProduct.type !== 'inactive',
    merchantId: merchantId,
    categoryId: categoryId,
    // Preserve additional fields for reference
    metadata: {
      productId: oldProduct.product_id || oldProduct.id,
      productVariant: oldProduct.product_variant || false,
      onHand: oldProduct.on_hand,
      inRent: oldProduct.in_rent,
      sold: oldProduct.sold,
      rentalPricing: oldProduct.rental_pricing,
      reservations: oldProduct.reservations
    }
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
  
  // Determine order type: order_type can be "rent" or "sale", order_state can also indicate
  let orderType = 'RENT';
  if (oldOrder.order_type) {
    const type = String(oldOrder.order_type).toLowerCase();
    if (type === 'sale' || type === 'sell') {
      orderType = 'SALE';
    } else {
      orderType = 'RENT';
    }
  } else if (oldOrder.order_state) {
    const state = String(oldOrder.order_state).toLowerCase();
    if (state === 'sale' || state === 'sell') {
      orderType = 'SALE';
    } else {
      orderType = 'RENT';
    }
  } else if (oldOrder.type) {
    orderType = String(oldOrder.type).toUpperCase();
  } else if (oldOrder.is_sale || oldOrder.isSale) {
    orderType = 'SALE';
  }

  // Determine status: order_status can be "reserved", "picked", "returned", etc.
  let status = 'RESERVED';
  if (oldOrder.order_status) {
    const oldStatus = String(oldOrder.order_status).toLowerCase();
    // Map old statuses to new statuses
    if (oldStatus.includes('pickup') || oldStatus.includes('picked') || oldStatus.includes('renting') || oldStatus.includes('active')) {
      status = 'PICKUPED';
    } else if (oldStatus.includes('return') || oldStatus.includes('returned')) {
      status = orderType === 'RENT' ? 'RETURNED' : 'COMPLETED';
    } else if (oldStatus.includes('cancel')) {
      status = 'CANCELLED';
    } else if (oldStatus.includes('complete') || oldStatus.includes('finish') || oldStatus.includes('done')) {
      status = 'COMPLETED';
    } else if (oldStatus.includes('reserve') || oldStatus.includes('book')) {
      status = 'RESERVED';
    }
  } else if (oldOrder.status) {
    const oldStatus = String(oldOrder.status).toUpperCase();
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

  // Transform order items: list_product contains product items
  const orderItemsList = oldOrder.list_product || oldOrder.orderItems || oldOrder.items || [];
  const orderItems = orderItemsList.map((oldItem: any) => {
    const oldProductId = oldItem.product_id || oldItem.productId;
    const productInfo = productMap.get(oldProductId);
    
    if (!productInfo) {
      // During export, we don't have product map yet, so preserve oldProductId
      // This will be mapped during import
      return {
        oldProductId: oldProductId,
        quantity: oldItem.quantity || oldItem.qty || 1,
        unitPrice: oldItem.price || oldItem.unit_price || oldItem.unitPrice || 0,
        totalPrice: oldItem.sub_total || oldItem.total_price || (oldItem.quantity || 1) * (oldItem.price || 0),
        deposit: oldItem.deposit || oldItem.security_deposit || 0
      };
    }

    const quantity = oldItem.quantity || oldItem.qty || 1;
    const unitPrice = oldItem.price || oldItem.unit_price || oldItem.unitPrice || 0;
    const totalPrice = oldItem.sub_total || oldItem.total_price || (quantity * unitPrice);
    const deposit = oldItem.deposit || oldItem.security_deposit || 0;

    return {
      productId: productInfo.id,
      quantity,
      unitPrice,
      totalPrice,
      deposit
    };
  });

  // Calculate totals: book_amount is the total amount, deposit_amount is deposit
  const totalAmount = oldOrder.book_amount || oldOrder.total_amount || oldOrder.totalAmount || oldOrder.total || 
    orderItems.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
  const depositAmount = oldOrder.deposit_amount || oldOrder.depositAmount || oldOrder.deposit || 0;
  const bailAmount = oldOrder.bail_amount || 0;
  const damageFee = oldOrder.damage_fee || 0;

  // Parse dates: support various date formats
  const parseDate = (dateStr: any): Date | null => {
    if (!dateStr || dateStr === false || dateStr === 'false') return null;
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr === 'string') {
      // Handle format: "2024-12-07 13:23:09"
      const parsed = new Date(dateStr.replace(' ', 'T'));
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Handle customer phone: can be false, null, or string
  const customerPhone = oldOrder.customer_phone && oldOrder.customer_phone !== false
    ? String(oldOrder.customer_phone)
    : (oldOrder.customerPhone || oldOrder.phone || null);

  return {
    orderType,
    status,
    totalAmount: Number(totalAmount) || 0,
    depositAmount: Number(depositAmount) || 0,
    pickupPlanAt: parseDate(oldOrder.pickup_date || oldOrder.pickup_plan_at || oldOrder.pickupPlanAt || oldOrder.pickupDate),
    returnPlanAt: parseDate(oldOrder.return_date || oldOrder.return_plan_at || oldOrder.returnPlanAt || oldOrder.returnDate),
    pickedUpAt: parseDate(oldOrder.pickup_date || oldOrder.picked_up_at || oldOrder.pickedUpAt || oldOrder.pickup_at),
    returnedAt: parseDate(oldOrder.return_date || oldOrder.returned_at || oldOrder.returnedAt || oldOrder.return_at),
    customerId: null, // Will be set by matching phone number or customer_id during import
    customerPhone: customerPhone,
    customerName: oldOrder.customer_name || oldOrder.customerName || null,
    createdById: createdById || oldOrder.user_id || 0,
    outletId: outletId || oldOrder.outlet_id || 0,
    notes: oldOrder.note || oldOrder.notes || oldOrder.description || null,
    orderItems,
    // Preserve additional fields for reference
    metadata: {
      orderId: oldOrder.order_id || oldOrder.id,
      orderCode: oldOrder.order_code || oldOrder.orderNumber,
      createDate: oldOrder.create_date || oldOrder.createDate,
      bookDate: oldOrder.book_date || oldOrder.bookDate,
      customerId: oldOrder.customer_id,
      outletId: oldOrder.outlet_id,
      outletName: oldOrder.outlet_name,
      storeId: oldOrder.store_id,
      storeName: oldOrder.store_name,
      userId: oldOrder.user_id,
      userName: oldOrder.user_name,
      bailAmount: bailAmount,
      damageFee: damageFee,
      discount: oldOrder.discount || 0,
      discountType: oldOrder.discount_type,
      priceUnit: oldOrder.price_unit
    }
  };
}
