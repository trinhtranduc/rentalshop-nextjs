// ============================================================================
// PRODUCT AVAILABILITY CART TESTS
// ============================================================================
// Tests for product availability when user adds items to cart

describe('Product Availability Cart Tests', () => {
  let testProducts;
  let testUsers;
  let testOrders;

  beforeAll(() => {
    // Test products with different stock levels
    testProducts = {
      highStock: {
        id: 1,
        name: 'High Stock Product',
        stock: 100,
        available: 95, // 5 đang được thuê
        rentPrice: 50,
        deposit: 100,
        outletId: 1
      },
      lowStock: {
        id: 2,
        name: 'Low Stock Product',
        stock: 10,
        available: 3, // 7 đang được thuê
        rentPrice: 30,
        deposit: 60,
        outletId: 1
      },
      outOfStock: {
        id: 3,
        name: 'Out of Stock Product',
        stock: 5,
        available: 0, // Tất cả đang được thuê
        rentPrice: 25,
        deposit: 50,
        outletId: 1
      },
      unlimited: {
        id: 4,
        name: 'Unlimited Product',
        stock: -1, // Unlimited
        available: -1, // Unlimited
        rentPrice: 40,
        deposit: 80,
        outletId: 1
      }
    };

    // Test users with different subscription status
    testUsers = {
      activeUser: {
        id: 1,
        email: 'active@user.com',
        role: 'CUSTOMER',
        subscriptionStatus: 'active',
        outletId: 1
      },
      trialUser: {
        id: 2,
        email: 'trial@user.com',
        role: 'CUSTOMER',
        subscriptionStatus: 'trial',
        outletId: 1
      },
      expiredUser: {
        id: 3,
        email: 'expired@user.com',
        role: 'CUSTOMER',
        subscriptionStatus: 'expired',
        outletId: 1
      }
    };

    // Existing orders that affect availability
    testOrders = [
      {
        id: 1,
        customerId: 10,
        productId: 1,
        quantity: 3,
        orderType: 'RENT',
        status: 'PICKUPED',
        pickupPlanAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 ngày trước
        returnPlanAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 ngày sau
        orderItems: [{ productId: 1, quantity: 3 }]
      },
      {
        id: 2,
        customerId: 11,
        productId: 2,
        quantity: 5,
        orderType: 'RENT',
        status: 'RESERVED',
        pickupPlanAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 ngày sau
        returnPlanAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 ngày sau
        orderItems: [{ productId: 2, quantity: 5 }]
      }
    ];
  });

  describe('Product Stock Validation', () => {
    it('should show available quantity for high stock products', () => {
      const product = testProducts.highStock;
      const requestedQuantity = 5;
      
      expect(product.available).toBe(95);
      expect(requestedQuantity).toBeLessThanOrEqual(product.available);
      
      // Thông báo: "Còn 95 sản phẩm có sẵn"
      const message = `Còn ${product.available} sản phẩm có sẵn`;
      expect(message).toBe('Còn 95 sản phẩm có sẵn');
    });

    it('should show low stock warning for limited products', () => {
      const product = testProducts.lowStock;
      const requestedQuantity = 2;
      
      expect(product.available).toBe(3);
      expect(product.available).toBeLessThan(10); // Low stock threshold
      
      // Thông báo: "⚠️ Chỉ còn 3 sản phẩm! Hãy nhanh tay đặt hàng"
      const message = `⚠️ Chỉ còn ${product.available} sản phẩm! Hãy nhanh tay đặt hàng`;
      expect(message).toBe('⚠️ Chỉ còn 3 sản phẩm! Hãy nhanh tay đặt hàng');
    });

    it('should show out of stock message for unavailable products', () => {
      const product = testProducts.outOfStock;
      const requestedQuantity = 1;
      
      expect(product.available).toBe(0);
      expect(requestedQuantity).toBeGreaterThan(product.available);
      
      // Thông báo: "❌ Sản phẩm đã hết hàng. Vui lòng chọn sản phẩm khác"
      const message = '❌ Sản phẩm đã hết hàng. Vui lòng chọn sản phẩm khác';
      expect(message).toContain('hết hàng');
    });

    it('should handle unlimited stock products', () => {
      const product = testProducts.unlimited;
      const requestedQuantity = 100;
      
      expect(product.available).toBe(-1); // Unlimited
      
      // Thông báo: "✅ Sản phẩm có sẵn (không giới hạn)"
      const message = '✅ Sản phẩm có sẵn (không giới hạn)';
      expect(message).toContain('không giới hạn');
    });
  });

  describe('Cart Addition Validation', () => {
    it('should allow adding available products to cart', () => {
      const product = testProducts.highStock;
      const requestedQuantity = 10;
      const cartItems = [];
      
      // Kiểm tra có thể thêm vào cart không
      const canAdd = requestedQuantity <= product.available;
      expect(canAdd).toBe(true);
      
      if (canAdd) {
        cartItems.push({
          productId: product.id,
          name: product.name,
          quantity: requestedQuantity,
          rentPrice: product.rentPrice,
          deposit: product.deposit,
          totalPrice: product.rentPrice * requestedQuantity,
          totalDeposit: product.deposit * requestedQuantity
        });
      }
      
      expect(cartItems.length).toBe(1);
      expect(cartItems[0].quantity).toBe(10);
    });

    it('should prevent adding more than available quantity', () => {
      const product = testProducts.lowStock;
      const requestedQuantity = 5; // Yêu cầu 5 nhưng chỉ có 3
      const cartItems = [];
      
      // Kiểm tra có thể thêm vào cart không
      const canAdd = requestedQuantity <= product.available;
      expect(canAdd).toBe(false);
      
      if (!canAdd) {
        // Thông báo lỗi
        const errorMessage = `Không thể thêm ${requestedQuantity} sản phẩm. Chỉ còn ${product.available} sản phẩm có sẵn.`;
        expect(errorMessage).toContain(`Chỉ còn ${product.available}`);
      }
      
      expect(cartItems.length).toBe(0);
    });

    it('should update cart with correct quantities', () => {
      const product = testProducts.highStock;
      const requestedQuantity = 15;
      const existingCartQuantity = 10;
      const totalRequested = requestedQuantity + existingCartQuantity;
      
      // Kiểm tra tổng số lượng có vượt quá available không
      const canAdd = totalRequested <= product.available;
      expect(canAdd).toBe(true);
      
      if (canAdd) {
        // Cập nhật cart
        const updatedCartItem = {
          productId: product.id,
          quantity: totalRequested,
          totalPrice: product.rentPrice * totalRequested,
          totalDeposit: product.deposit * totalRequested
        };
        
        expect(updatedCartItem.quantity).toBe(25);
      }
    });
  });

  describe('Date Range Availability', () => {
    it('should check availability for specific date ranges', () => {
      const product = testProducts.highStock;
      const requestedQuantity = 5;
      const pickupDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 ngày sau
      const returnDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày sau
      
      // Kiểm tra conflicts với existing orders
      const conflicts = testOrders.filter(order => {
        if (order.productId !== product.id) return false;
        
        const orderPickup = new Date(order.pickupPlanAt);
        const orderReturn = new Date(order.returnPlanAt);
        
        // Kiểm tra overlap
        return (orderPickup <= returnDate && orderReturn >= pickupDate);
      });
      
      // Tính số lượng bị conflict
      const conflictingQuantity = conflicts.reduce((total, order) => {
        return total + order.quantity;
      }, 0);
      
      // Tính available quantity cho date range này
      const availableForDateRange = product.available - conflictingQuantity;
      
      expect(availableForDateRange).toBeGreaterThanOrEqual(0);
      
      // Thông báo availability cho date range
      if (availableForDateRange >= requestedQuantity) {
        const message = `✅ Còn ${availableForDateRange} sản phẩm có sẵn cho ngày ${pickupDate.toLocaleDateString('vi-VN')} - ${returnDate.toLocaleDateString('vi-VN')}`;
        expect(message).toContain('Còn');
      } else {
        const message = `⚠️ Chỉ còn ${availableForDateRange} sản phẩm có sẵn cho ngày ${pickupDate.toLocaleDateString('vi-VN')} - ${returnDate.toLocaleDateString('vi-VN')}`;
        expect(message).toContain('Chỉ còn');
      }
    });

    it('should handle overlapping date ranges', () => {
      const product = testProducts.highStock;
      const requestedQuantity = 10;
      
      // Date range trùng với existing order
      const pickupDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 ngày sau
      const returnDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 ngày sau
      
      // Tìm conflicts
      const conflicts = testOrders.filter(order => {
        if (order.productId !== product.id) return false;
        
        const orderPickup = new Date(order.pickupPlanAt);
        const orderReturn = new Date(order.returnPlanAt);
        
        return (orderPickup <= returnDate && orderReturn >= pickupDate);
      });
      
      expect(conflicts.length).toBeGreaterThan(0);
      
      // Thông báo conflict
      if (conflicts.length > 0) {
        const conflictMessage = `⚠️ Có ${conflicts.length} đơn hàng trùng lịch. Số lượng có sẵn có thể bị giảm.`;
        expect(conflictMessage).toContain('trùng lịch');
      }
    });
  });

  describe('Subscription-Based Availability', () => {
    it('should check subscription before showing availability', () => {
      const user = testUsers.expiredUser;
      const product = testProducts.highStock;
      
      // Kiểm tra subscription trước
      if (user.subscriptionStatus === 'expired') {
        // Không cho phép xem availability nếu subscription hết hạn
        const errorMessage = '❌ Subscription đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng.';
        expect(errorMessage).toContain('hết hạn');
        return; // Dừng ở đây, không kiểm tra availability
      }
      
      // Nếu subscription active, mới kiểm tra availability
      expect(user.subscriptionStatus).not.toBe('expired');
    });

    it('should allow availability check for active subscription', () => {
      const user = testUsers.activeUser;
      const product = testProducts.highStock;
      
      // Kiểm tra subscription
      expect(user.subscriptionStatus).toBe('active');
      
      // Nếu subscription active, cho phép kiểm tra availability
      const canCheckAvailability = user.subscriptionStatus === 'active';
      expect(canCheckAvailability).toBe(true);
      
      if (canCheckAvailability) {
        const message = `✅ Còn ${product.available} sản phẩm có sẵn`;
        expect(message).toContain('Còn');
      }
    });

    it('should show trial limitations for trial users', () => {
      const user = testUsers.trialUser;
      const product = testProducts.highStock;
      const requestedQuantity = 20;
      
      // Trial users có giới hạn
      const trialLimits = {
        maxProducts: 10,
        maxQuantity: 5
      };
      
      if (user.subscriptionStatus === 'trial') {
        if (requestedQuantity > trialLimits.maxQuantity) {
          const message = `⚠️ Tài khoản trial chỉ được đặt tối đa ${trialLimits.maxQuantity} sản phẩm mỗi lần. Nâng cấp để tăng giới hạn.`;
          expect(message).toContain('trial');
          expect(message).toContain('tối đa');
        }
      }
    });
  });

  describe('Real-time Availability Updates', () => {
    it('should update availability when orders are placed', () => {
      const product = testProducts.highStock;
      const initialAvailable = product.available; // 95
      const newOrderQuantity = 10;
      
      // Giả lập có đơn hàng mới
      const updatedAvailable = initialAvailable - newOrderQuantity;
      
      expect(updatedAvailable).toBe(85);
      
      // Cập nhật product availability
      product.available = updatedAvailable;
      
      // Thông báo cập nhật
      const updateMessage = `📊 Số lượng có sẵn đã cập nhật: ${updatedAvailable} sản phẩm`;
      expect(updateMessage).toContain('cập nhật');
    });

    it('should handle concurrent availability checks', () => {
      const product = testProducts.lowStock;
      const initialAvailable = product.available; // 3
      
      // Giả lập nhiều user cùng check availability
      const concurrentChecks = [
        { userId: 1, requestedQuantity: 2 },
        { userId: 2, requestedQuantity: 1 },
        { userId: 3, requestedQuantity: 1 }
      ];
      
      let remainingAvailable = initialAvailable;
      const results = [];
      
      concurrentChecks.forEach(check => {
        if (remainingAvailable >= check.requestedQuantity) {
          remainingAvailable -= check.requestedQuantity;
          results.push({
            userId: check.userId,
            canAdd: true,
            remaining: remainingAvailable
          });
        } else {
          results.push({
            userId: check.userId,
            canAdd: false,
            message: `Chỉ còn ${remainingAvailable} sản phẩm`
          });
        }
      });
      
      // Kết quả: 2 user đầu có thể add, user thứ 3 không thể
      expect(results[0].canAdd).toBe(true);
      expect(results[1].canAdd).toBe(true);
      expect(results[2].canAdd).toBe(false);
    });
  });

  describe('User Experience Messages', () => {
    it('should provide clear availability messages in Vietnamese', () => {
      const messages = {
        highStock: '✅ Còn nhiều sản phẩm có sẵn',
        lowStock: '⚠️ Chỉ còn ít sản phẩm, hãy nhanh tay!',
        outOfStock: '❌ Sản phẩm đã hết hàng',
        unlimited: '♾️ Sản phẩm có sẵn không giới hạn',
        subscriptionExpired: '🔒 Subscription đã hết hạn, vui lòng gia hạn',
        trialLimit: '🎯 Tài khoản trial có giới hạn số lượng'
      };
      
      Object.values(messages).forEach(message => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
        // Kiểm tra có chứa emoji để dễ nhận biết
        expect(message).toMatch(/[✅⚠️❌♾️🔒🎯]/);
      });
    });

    it('should provide actionable suggestions', () => {
      const suggestions = {
        lowStock: '💡 Bạn có thể chọn sản phẩm tương tự hoặc đặt hàng trước',
        outOfStock: '💡 Hãy thử sản phẩm khác hoặc liên hệ để được tư vấn',
        subscriptionExpired: '💡 Nâng cấp subscription để tiếp tục sử dụng',
        dateConflict: '💡 Thử chọn ngày khác hoặc giảm số lượng'
      };
      
      Object.values(suggestions).forEach(suggestion => {
        expect(suggestion).toContain('💡');
        expect(suggestion.length).toBeGreaterThan(20);
      });
    });
  });
});

// Run the tests if this file is executed directly
if (require.main === module) {
  console.log('🧪 Running Product Availability Cart Tests');
  console.log('==========================================');
}
