import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook để kiểm tra tình trạng sẵn có của sản phẩm
 * Tính toán dựa trên số lượng trong kho và xung đột ngày với các đơn hàng khác
 */
export const useProductAvailability = () => {
  const [availabilityCache, setAvailabilityCache] = useState<Record<string, any>>({});

  /**
   * Kiểm tra xung đột ngày với các đơn hàng khác
   * @param orders - Danh sách đơn hàng của sản phẩm
   * @param pickupDate - Ngày lấy hàng
   * @param returnDate - Ngày trả hàng
   * @param productId - ID sản phẩm
   * @param requestedQuantity - Số lượng yêu cầu
   * @param totalStock - Tổng số lượng trong kho
   * @param currentOrderId - ID đơn hàng hiện tại (để loại trừ)
   * @returns Thông tin xung đột
   */
  const checkDateConflict = useCallback((
    orders: any[], 
    pickupDate: string, 
    returnDate: string, 
    productId: string, 
    requestedQuantity: number, 
    totalStock: number, 
    currentOrderId: string | null = null
  ) => {
    if (!pickupDate || !returnDate) {
      return { hasConflict: false, conflictingQuantity: 0, remainingStock: totalStock };
    }

    const startDate = new Date(pickupDate);
    const endDate = new Date(returnDate);

    console.log('🔍 checkDateConflict Debug:', {
      ordersCount: orders.length,
      pickupDate,
      returnDate,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      productId,
      requestedQuantity,
      totalStock,
      currentOrderId
    });

    // Bắt đầu với tổng kho
    let remainingStock = totalStock;

    // Lọc các đơn hàng cần kiểm tra
    const activeOrders = orders.filter((order: any) => {
      // Loại trừ đơn hàng hiện tại nếu đang edit
      if (currentOrderId && String(order.id) === String(currentOrderId)) return false;
      
      // Chỉ xem xét đơn thuê
      if (order.orderType === 'SALE') return false;
      
      // Xem xét đơn hàng có trạng thái 'PICKUP', 'RESERVED', 'CONFIRMED', 'PROCESSING'
      const validStatuses = ['PICKUP', 'RESERVED', 'CONFIRMED', 'PROCESSING'];
      if (!validStatuses.includes(order.status)) return false;
      
      return true;
    });

    console.log('🔍 Active Orders:', activeOrders.map((order: any) => ({
      id: order.id,
      pickupDate: order.pickupPlanAt,
      returnDate: order.returnPlanAt,
      status: order.status,
      orderItems: order.orderItems
    })));

    let conflictingQuantity = 0;

    // Kiểm tra từng đơn hàng
    for (const order of activeOrders) {
      // Tìm sản phẩm trong đơn hàng này
      const orderItems = order.orderItems || [];
      const matchingItems = orderItems.filter((item: any) => item.productId === productId);
      
      // Bỏ qua nếu không có sản phẩm phù hợp hoặc thiếu ngày
      if (matchingItems.length === 0 || !order.pickupPlanAt || !order.returnPlanAt) {
        continue;
      }

      const orderPickup = new Date(order.pickupPlanAt);
      const orderReturn = new Date(order.returnPlanAt);

      // Kiểm tra xung đột ngày
      const datesOverlap = (
        (orderPickup >= startDate && orderPickup <= endDate) ||
        (orderReturn >= startDate && orderReturn <= endDate) ||
        (orderPickup <= startDate && orderReturn >= endDate)
      );

      console.log('🔍 Date Overlap Check:', {
        orderId: order.id,
        orderPickup: orderPickup.toISOString(),
        orderReturn: orderReturn.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        datesOverlap,
        matchingItemsCount: matchingItems.length
      });

      if (datesOverlap) {
        // Tính tổng số lượng của sản phẩm này trong đơn hàng xung đột
        const orderQuantity = matchingItems.reduce((sum: number, item: any) => {
          return sum + (Number(item.quantity) || 0);
        }, 0);

        console.log('🔍 Conflict Found:', {
          orderId: order.id,
          orderQuantity,
          remainingStockBefore: remainingStock,
          remainingStockAfter: remainingStock - orderQuantity
        });

        // Trừ đi từ số lượng còn lại
        remainingStock -= orderQuantity;
        conflictingQuantity += orderQuantity;

        // Early exit nếu đã xác định không đủ hàng
        if (remainingStock < 0) {
          break;
        }
      }
    }

    // Kiểm tra xem có đủ hàng cho số lượng yêu cầu không
    const hasConflict = remainingStock < requestedQuantity;

    console.log('🔍 Final Calculation:', {
      totalStock,
      conflictingQuantity,
      remainingStockAfterConflicts: remainingStock,
      requestedQuantity,
      hasConflict,
      available: remainingStock
    });

    return {
      hasConflict,
      conflictingQuantity,
      remainingStock: Math.max(0, remainingStock)
    };
  }, []);

  /**
   * Tính toán tình trạng sẵn có của sản phẩm
   * @param product - Thông tin sản phẩm
   * @param orders - Danh sách đơn hàng của sản phẩm
   * @param pickupDate - Ngày lấy hàng (từ form)
   * @param returnDate - Ngày trả hàng (từ form)
   * @param requestedQuantity - Số lượng yêu cầu (từ form)
   * @param currentOrderId - ID đơn hàng hiện tại (để loại trừ)
   * @returns Thông tin tình trạng sẵn có
   */
  const calculateAvailability = useCallback((
    product: any, 
    orders: any[] = [], 
    pickupDate: string | null = null, 
    returnDate: string | null = null, 
    requestedQuantity: number = 1, 
    currentOrderId: string | null = null
  ) => {
    if (!product || !product.id) {
      return {
        storage: 0,
        renting: 0,
        available: 0,
        status: 'unknown',
        hasDateConflict: false,
        conflictingQuantity: 0,
        remainingStock: 0
      };
    }

    const productId = product.id;
    const storage = Number(product.stock) || 0;
    const quantity = Number(requestedQuantity) || 1;

    // Debug log chi tiết hơn
    console.log('🔍 ProductAvailability Debug:', {
      productId,
      storage,
      quantity,
      requestedQuantity,
      stockType: typeof storage,
      quantityType: typeof quantity,
      isQuantityExceeded: quantity > storage,
      comparison: `${quantity} > ${storage} = ${quantity > storage}`,
      pickupDate,
      returnDate
    });

    // Early check: Nếu số lượng yêu cầu > kho, return conflict ngay lập tức
    if (quantity > storage) {
      console.log('❌ Quantity exceeds storage - returning unavailable');
      return {
        storage,
        renting: 0,
        available: 0,
        status: 'unavailable',
        hasDateConflict: false,
        conflictingQuantity: 0,
        remainingStock: 0
      };
    }

    // Kiểm tra xung đột ngày
    const dateConflict = checkDateConflict(orders, pickupDate!, returnDate!, productId, quantity, storage, currentOrderId);

    // Xác định trạng thái
    let status = 'unknown';
    if (storage === 0) {
      status = 'unavailable';
    } else if (dateConflict.hasConflict) {
      // Có xung đột ngày hoặc không đủ hàng
      status = 'unavailable';
    } else {
      status = 'available';
    }

    return {
      storage,
      renting: dateConflict.conflictingQuantity,
      available: dateConflict.remainingStock,
      status,
      hasDateConflict: dateConflict.hasConflict,
      conflictingQuantity: dateConflict.conflictingQuantity,
      remainingStock: dateConflict.remainingStock
    };
  }, [checkDateConflict]);

  /**
   * Lấy thông tin tình trạng sẵn có từ cache hoặc tính toán mới
   * @param product - Thông tin sản phẩm
   * @param pickupDate - Ngày lấy hàng (từ form)
   * @param returnDate - Ngày trả hàng (từ form)
   * @param requestedQuantity - Số lượng yêu cầu (từ form)
   * @param currentOrderId - ID đơn hàng hiện tại (để loại trừ)
   * @returns Thông tin tình trạng sẵn có
   */
  const getProductAvailability = useCallback(async (
    product: any, 
    pickupDate: string | null = null, 
    returnDate: string | null = null, 
    requestedQuantity: number = 1, 
    currentOrderId: string | null = null
  ) => {
    if (!product || !product.id) {
      return {
        storage: 0,
        renting: 0,
        available: 0,
        status: 'unknown',
        hasDateConflict: false,
        conflictingQuantity: 0,
        remainingStock: 0
      };
    }

    const productId = product.id;
    const quantity = Number(requestedQuantity) || 1;
    
    // Tạo cache key bao gồm cả ngày, số lượng và order ID
    const orderIdStr = currentOrderId ? String(currentOrderId) : 'new';
    const cacheKey = `${productId}_${pickupDate}_${returnDate}_${quantity}_${orderIdStr}`;
    
    console.log('🔍 Cache check:', {
      cacheKey,
      hasCache: !!availabilityCache[cacheKey],
      cacheValue: availabilityCache[cacheKey]
    });
    
    // Kiểm tra cache trước
    if (availabilityCache[cacheKey]) {
      console.log('📦 Returning cached result');
      return availabilityCache[cacheKey];
    }

    try {
      // Lấy danh sách đơn hàng cho sản phẩm này từ API
      const { authenticatedFetch } = await import('@rentalshop/utils');
      const response = await authenticatedFetch(`/api/orders?productId=${productId}`);
      
      if (response.ok) {
        const data = await response.json();
        const orders = data.orders || [];

        // Tính toán tình trạng sẵn có với thông tin ngày
        const availability = calculateAvailability(product, orders, pickupDate, returnDate, quantity, currentOrderId);
        
        // Lưu vào cache
        setAvailabilityCache(prev => ({
          ...prev,
          [cacheKey]: availability
        }));

        return availability;
      } else {
        throw new Error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error getting product availability:', error);
      // Trả về thông tin cơ bản nếu có lỗi
      const basicAvailability = calculateAvailability(product, [], pickupDate, returnDate, quantity, currentOrderId);
      return basicAvailability;
    }
  }, [availabilityCache, calculateAvailability]);

  /**
   * Làm mới cache cho một sản phẩm cụ thể
   * @param productId - ID sản phẩm
   */
  const refreshProductAvailability = useCallback((productId: string) => {
    setAvailabilityCache(prev => {
      const newCache = { ...prev };
      // Remove all cache entries for this product
      Object.keys(newCache).forEach(key => {
        if (key.startsWith(`${productId}_`)) {
          delete newCache[key];
        }
      });
      return newCache;
    });
  }, []);

  /**
   * Làm mới toàn bộ cache
   */
  const clearAvailabilityCache = useCallback(() => {
    setAvailabilityCache({});
  }, []);

  return {
    getProductAvailability,
    calculateAvailability,
    refreshProductAvailability,
    clearAvailabilityCache,
    availabilityCache
  };
};
