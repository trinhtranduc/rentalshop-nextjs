var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/client.ts
import { PrismaClient } from "@prisma/client";
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// src/user.ts
var simplifiedUsers = {
  /**
   * Find user by ID (simplified API)
   */
  findById: async (id) => {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            businessType: true,
            pricingType: true,
            taxId: true,
            website: true,
            description: true,
            isActive: true,
            planId: true,
            subscriptionStatus: true,
            totalRevenue: true,
            createdAt: true,
            lastActiveAt: true
          }
        },
        outlet: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            description: true,
            isActive: true,
            isDefault: true,
            createdAt: true,
            merchant: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
  },
  /**
   * Find user by email (simplified API)
   */
  findByEmail: async (email) => {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        merchant: { select: { id: true, name: true } },
        outlet: { select: { id: true, name: true } }
      }
    });
  },
  /**
   * Find first user matching criteria (simplified API)
   */
  findFirst: async (where) => {
    return await prisma.user.findFirst({
      where,
      include: {
        merchant: { select: { id: true, name: true } },
        outlet: { select: { id: true, name: true } }
      }
    });
  },
  /**
   * Create new user (simplified API)
   */
  create: async (data) => {
    try {
      console.log("\u{1F50D} simplifiedUsers.create called with data:", data);
      const userData = { ...data };
      if (userData.merchantId && typeof userData.merchantId === "number") {
        const merchant = await prisma.merchant.findUnique({
          where: { id: userData.merchantId },
          select: { id: true, name: true }
        });
        if (!merchant) {
          throw new Error(`Merchant with id ${userData.merchantId} not found`);
        }
        console.log("\u2705 Merchant found:", merchant);
      }
      if (userData.outletId && typeof userData.outletId === "number") {
        const outlet = await prisma.outlet.findUnique({
          where: { id: userData.outletId },
          select: { id: true, name: true, merchantId: true }
        });
        if (!outlet) {
          throw new Error(`Outlet with id ${userData.outletId} not found`);
        }
        if (userData.merchantId && outlet.merchantId !== userData.merchantId) {
          throw new Error(`Outlet ${userData.outletId} does not belong to merchant ${userData.merchantId}`);
        }
        console.log("\u2705 Outlet found:", outlet);
      }
      if (userData.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email: userData.email },
          select: { id: true, email: true }
        });
        if (existingEmail) {
          throw new Error(`Email ${userData.email} is already registered`);
        }
      }
      if (userData.phone && userData.merchantId) {
        const existingPhone = await prisma.user.findFirst({
          where: {
            phone: userData.phone,
            merchantId: userData.merchantId
          },
          select: { id: true, phone: true, merchantId: true }
        });
        if (existingPhone) {
          throw new Error(`Phone number ${userData.phone} is already registered in this merchant`);
        }
      }
      const lastUser = await prisma.user.findFirst({
        orderBy: { id: "desc" },
        select: { id: true }
      });
      const nextPublicId = (lastUser?.id || 0) + 1;
      userData.id = nextPublicId;
      const user = await prisma.user.create({
        data: userData,
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
              country: true,
              businessType: true,
              taxId: true,
              website: true,
              description: true,
              isActive: true,
              planId: true,
              subscriptionStatus: true,
              totalRevenue: true,
              createdAt: true,
              lastActiveAt: true
            }
          },
          outlet: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              description: true,
              isActive: true,
              isDefault: true,
              createdAt: true,
              merchant: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });
      console.log("\u2705 User created successfully:", user);
      return user;
    } catch (error) {
      console.error("\u274C Error in simplifiedUsers.create:", error);
      throw error;
    }
  },
  /**
   * Update user (simplified API)
   */
  update: async (id, data) => {
    return await prisma.user.update({
      where: { id },
      data,
      include: {
        merchant: { select: { id: true, name: true } },
        outlet: { select: { id: true, name: true } }
      }
    });
  },
  /**
   * Delete user (soft delete) (simplified API)
   */
  delete: async (id) => {
    return await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: /* @__PURE__ */ new Date()
      }
    });
  },
  /**
   * Search users with simple filters (simplified API)
   */
  search: async (filters) => {
    const { page = 1, limit = 20, ...whereFilters } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (whereFilters.merchantId) where.merchantId = whereFilters.merchantId;
    if (whereFilters.outletId) where.outletId = whereFilters.outletId;
    if (whereFilters.isActive !== void 0) where.isActive = whereFilters.isActive;
    if (whereFilters.role) where.role = whereFilters.role;
    if (whereFilters.search) {
      where.OR = [
        { firstName: { contains: whereFilters.search, mode: "insensitive" } },
        { lastName: { contains: whereFilters.search, mode: "insensitive" } },
        { email: { contains: whereFilters.search, mode: "insensitive" } }
      ];
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          merchant: { select: { id: true, name: true } },
          outlet: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);
    return {
      data: users,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    };
  },
  count: async (options) => {
    const where = options?.where || {};
    return await prisma.user.count({ where });
  }
};

// src/customer.ts
var simplifiedCustomers = {
  /**
   * Find customer by ID (simplified API)
   */
  findById: async (id) => {
    return await prisma.customer.findUnique({
      where: { id },
      include: {
        merchant: { select: { id: true, name: true } },
        orders: {
          select: { id: true, orderNumber: true, totalAmount: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });
  },
  /**
   * Create new customer (simplified API)
   */
  create: async (data) => {
    const customerData = {
      ...data,
      email: data.email && data.email.trim() !== "" ? data.email : null
    };
    delete customerData.merchant;
    return await prisma.customer.create({
      data: customerData,
      include: {
        merchant: { select: { id: true, name: true } }
      }
    });
  },
  /**
   * Update customer (simplified API)
   */
  update: async (id, data) => {
    return await prisma.customer.update({
      where: { id },
      data,
      include: {
        merchant: { select: { id: true, name: true } }
      }
    });
  },
  /**
   * Search customers with pagination (simplified API)
   */
  search: async (filters) => {
    const { page = 1, limit = 20, ...whereFilters } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (whereFilters.merchantId) where.merchantId = whereFilters.merchantId;
    if (whereFilters.outletId) where.outletId = whereFilters.outletId;
    if (whereFilters.isActive !== void 0) where.isActive = whereFilters.isActive;
    if (whereFilters.search) {
      where.OR = [
        { firstName: { contains: whereFilters.search } },
        { lastName: { contains: whereFilters.search } },
        { email: { contains: whereFilters.search } },
        { phone: { contains: whereFilters.search } }
      ];
    }
    if (whereFilters.firstName) where.firstName = { contains: whereFilters.firstName };
    if (whereFilters.lastName) where.lastName = { contains: whereFilters.lastName };
    if (whereFilters.email) where.email = { contains: whereFilters.email };
    if (whereFilters.phone) where.phone = { contains: whereFilters.phone };
    if (whereFilters.city) where.city = { contains: whereFilters.city };
    if (whereFilters.state) where.state = { contains: whereFilters.state };
    if (whereFilters.country) where.country = { contains: whereFilters.country };
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          merchant: { select: { id: true, name: true } },
          _count: {
            select: { orders: true }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.customer.count({ where })
    ]);
    return {
      data: customers,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    };
  },
  /**
   * Get customer statistics (simplified API)
   */
  getStats: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    return await prisma.customer.count({ where });
  }
};

// src/product.ts
async function getOrCreateDefaultCategory(merchantId) {
  const existingDefault = await prisma.category.findFirst({
    where: {
      merchantId,
      // merchantId is number (public ID)
      name: "General",
      isActive: true
    }
  });
  if (existingDefault) {
    console.log("\u2705 Found existing default category:", existingDefault.id);
    return existingDefault;
  }
  console.log("\u{1F527} Creating default category for merchant:", merchantId);
  const lastCategory = await prisma.category.findFirst({
    orderBy: { id: "desc" },
    select: { id: true }
  });
  const nextPublicId = (lastCategory?.id || 0) + 1;
  const defaultCategory = await prisma.category.create({
    data: {
      id: nextPublicId,
      name: "General",
      description: "Default category for general products",
      merchantId,
      isActive: true
    }
  });
  console.log("\u2705 Created default category:", defaultCategory.id);
  return defaultCategory;
}
var simplifiedProducts = {
  /**
   * Find product by ID (simplified API)
   */
  findById: async (id) => {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        merchant: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        outletStock: {
          include: {
            outlet: { select: { id: true, name: true } }
          }
        }
      }
    });
  },
  /**
   * Find product by barcode (simplified API)
   */
  findByBarcode: async (barcode) => {
    return await prisma.product.findUnique({
      where: { barcode },
      include: {
        merchant: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        outletStock: {
          include: {
            outlet: { select: { id: true, name: true } }
          }
        }
      }
    });
  },
  /**
   * Create new product (simplified API)
   */
  create: async (data) => {
    try {
      console.log("\u{1F50D} simplifiedProducts.create called with data:", data);
      if (!data.categoryId && data.merchant && data.merchant.connect && data.merchant.connect.id) {
        const merchantPublicId = data.merchant.connect.id;
        const defaultCategory = await getOrCreateDefaultCategory(merchantPublicId);
        data.category = { connect: { id: defaultCategory.id } };
        console.log("\u2705 Using default category:", defaultCategory.id, "for merchant:", merchantPublicId);
      }
      const product = await prisma.product.create({
        data,
        include: {
          merchant: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          outletStock: {
            include: {
              outlet: { select: { id: true, name: true } }
            }
          }
        }
      });
      console.log("\u2705 Product created successfully:", product.id);
      return product;
    } catch (error) {
      console.error("\u274C Error in simplifiedProducts.create:", error);
      throw error;
    }
  },
  /**
   * Update product (simplified API)
   */
  update: async (id, data) => {
    return await prisma.product.update({
      where: { id },
      data,
      include: {
        merchant: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        outletStock: {
          include: {
            outlet: { select: { id: true, name: true } }
          }
        }
      }
    });
  },
  /**
   * Delete product (soft delete) (simplified API)
   */
  delete: async (id) => {
    return await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
  },
  /**
   * Get product statistics (simplified API)
   */
  getStats: async (where = {}) => {
    return await prisma.product.count({ where });
  },
  /**
   * Search products with simple filters (simplified API)
   */
  search: async (filters) => {
    const { page = 1, limit = 20, ...whereFilters } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (whereFilters.merchantId) where.merchantId = whereFilters.merchantId;
    if (whereFilters.categoryId) where.categoryId = whereFilters.categoryId;
    if (whereFilters.isActive !== void 0) where.isActive = whereFilters.isActive;
    if (whereFilters.search) {
      where.OR = [
        { name: { contains: whereFilters.search } },
        { description: { contains: whereFilters.search } },
        { barcode: { contains: whereFilters.search } }
      ];
    }
    if (whereFilters.minPrice !== void 0 || whereFilters.maxPrice !== void 0) {
      where.rentPrice = {};
      if (whereFilters.minPrice !== void 0) where.rentPrice.gte = whereFilters.minPrice;
      if (whereFilters.maxPrice !== void 0) where.rentPrice.lte = whereFilters.maxPrice;
    }
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          merchant: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          outletStock: {
            include: {
              outlet: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ]);
    return {
      data: products,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    };
  },
  count: async (options) => {
    const where = options?.where || {};
    return await prisma.product.count({ where });
  }
};

// src/order.ts
var orderInclude = {
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      address: true,
      idNumber: true
    }
  },
  outlet: {
    select: {
      id: true,
      name: true,
      address: true,
      merchantId: true,
      // Include merchantId for authorization checks
      merchant: {
        select: {
          id: true,
          name: true
        }
      }
    }
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      email: true
    }
  },
  orderItems: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      productId: true,
      product: {
        select: {
          id: true,
          name: true
        }
      }
    }
  },
  payments: {
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      processedAt: true
    }
  }
};
function transformOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount ?? 0,
    securityDeposit: order.securityDeposit ?? 0,
    damageFee: order.damageFee ?? 0,
    lateFee: order.lateFee ?? 0,
    discountType: order.discountType || void 0,
    discountValue: order.discountValue ?? 0,
    discountAmount: order.discountAmount ?? 0,
    pickupPlanAt: order.pickupPlanAt || void 0,
    returnPlanAt: order.returnPlanAt || void 0,
    pickedUpAt: order.pickedUpAt || void 0,
    returnedAt: order.returnedAt || void 0,
    rentalDuration: order.rentalDuration || void 0,
    isReadyToDeliver: order.isReadyToDeliver ?? false,
    collateralType: order.collateralType || void 0,
    collateralDetails: order.collateralDetails || void 0,
    notes: order.notes || void 0,
    pickupNotes: order.pickupNotes || void 0,
    returnNotes: order.returnNotes || void 0,
    damageNotes: order.damageNotes || void 0,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    outletId: order.outletId,
    merchantId: order.outlet?.merchantId,
    // Extract merchantId from outlet relation for authorization
    customerId: order.customerId || void 0,
    createdById: order.createdById,
    // Relations
    customer: order.customer,
    outlet: order.outlet,
    createdBy: order.createdBy,
    orderItems: order.orderItems,
    payments: order.payments
  };
}
async function updateOrder(id, data) {
  console.log("\u{1F527} updateOrder called with id:", id);
  console.log("\u{1F527} updateOrder data keys:", Object.keys(data));
  console.log("\u{1F527} updateOrder has orderItems?:", !!data.orderItems, "length:", data.orderItems?.length);
  const {
    orderItems,
    customerId,
    outletId,
    ...allFields
  } = data;
  const validFields = [
    "orderType",
    "status",
    "totalAmount",
    "depositAmount",
    "securityDeposit",
    "damageFee",
    "lateFee",
    "discountType",
    "discountValue",
    "discountAmount",
    "pickupPlanAt",
    "returnPlanAt",
    "pickedUpAt",
    "returnedAt",
    "rentalDuration",
    "isReadyToDeliver",
    "collateralType",
    "collateralDetails",
    "notes",
    "pickupNotes",
    "returnNotes",
    "damageNotes"
  ];
  const updateData = {};
  validFields.forEach((field) => {
    if (field in allFields && allFields[field] !== void 0) {
      updateData[field] = allFields[field];
    }
  });
  console.log("\u{1F527} Filtered update fields:", Object.keys(updateData));
  if (customerId !== void 0) {
    if (customerId === null) {
      updateData.customer = { disconnect: true };
    } else {
      updateData.customer = { connect: { id: customerId } };
    }
  }
  if (outletId !== void 0) {
    updateData.outlet = { connect: { id: outletId } };
  }
  if (orderItems && orderItems.length > 0) {
    console.log("\u{1F527} Processing", orderItems.length, "order items");
    updateData.orderItems = {
      // Delete all existing order items
      deleteMany: {},
      // Create new order items
      create: orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice || item.quantity * item.unitPrice,
        deposit: item.deposit || 0,
        notes: item.notes,
        rentalDays: item.rentalDays
      }))
    };
    console.log("\u{1F527} Converted orderItems to nested write format");
  }
  console.log("\u{1F527} Final update data structure:", {
    hasOrderItems: !!updateData.orderItems,
    hasCustomer: !!updateData.customer,
    hasOutlet: !!updateData.outlet
  });
  const order = await prisma.order.update({
    where: { id },
    data: updateData,
    include: orderInclude
  });
  console.log("\u2705 Order updated successfully");
  return transformOrder(order);
}
async function searchOrders(filters) {
  const {
    q,
    outletId,
    customerId,
    userId,
    orderType,
    status,
    startDate,
    endDate,
    pickupDate,
    returnDate,
    limit = 20,
    offset = 0
  } = filters;
  const where = {};
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customer: { firstName: { contains: q, mode: "insensitive" } } },
      { customer: { lastName: { contains: q, mode: "insensitive" } } },
      { customer: { phone: { contains: q, mode: "insensitive" } } }
    ];
  }
  if (outletId) {
    where.outletId = outletId;
  }
  if (customerId) {
    where.customerId = customerId;
  }
  if (userId) {
    where.createdById = userId;
  }
  if (orderType) {
    where.orderType = orderType;
  }
  if (status) {
    where.status = status;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }
  if (pickupDate) {
    where.pickupPlanAt = {
      gte: new Date(pickupDate),
      lt: new Date(new Date(pickupDate).getTime() + 24 * 60 * 60 * 1e3)
    };
  }
  if (returnDate) {
    where.returnPlanAt = {
      gte: new Date(returnDate),
      lt: new Date(new Date(returnDate).getTime() + 24 * 60 * 60 * 1e3)
    };
  }
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        pickedUpAt: true,
        returnedAt: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        },
        outlet: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    prisma.order.count({ where })
  ]);
  const totalPages = Math.ceil(total / limit);
  const page = Math.floor(offset / limit) + 1;
  const transformedOrders = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount,
    pickupPlanAt: order.pickupPlanAt,
    returnPlanAt: order.returnPlanAt,
    pickedUpAt: order.pickedUpAt,
    returnedAt: order.returnedAt,
    isReadyToDeliver: false,
    customer: order.customer ? {
      id: order.customer.id,
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      email: order.customer.email,
      phone: order.customer.phone || ""
    } : null,
    outlet: {
      id: order.outlet?.id || 0,
      name: order.outlet?.name || ""
    },
    orderItems: [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  }));
  return {
    success: true,
    data: {
      orders: transformedOrders,
      total,
      page,
      limit,
      offset,
      hasMore: offset + limit < total,
      totalPages
    }
  };
}
var simplifiedOrders = {
  /**
   * Find order by ID (simplified API)
   */
  findById: async (id) => {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        outlet: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        orderItems: {
          include: {
            product: { select: { id: true, name: true, barcode: true } }
          }
        },
        payments: true
      }
    });
  },
  /**
   * Find order by order number (simplified API)
   */
  findByNumber: async (orderNumber) => {
    return await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        outlet: {
          select: {
            id: true,
            name: true,
            merchantId: true,
            merchant: { select: { id: true, name: true } }
          }
        },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        orderItems: {
          include: {
            product: { select: { id: true, name: true, barcode: true } }
          }
        },
        payments: true
      }
    });
  },
  /**
   * Create new order (simplified API)
   */
  create: async (data) => {
    return await prisma.order.create({
      data,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        outlet: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        orderItems: {
          include: {
            product: { select: { id: true, name: true, barcode: true } }
          }
        },
        payments: true
      }
    });
  },
  /**
   * Update order (simplified API) - Now uses proper updateOrder function
   */
  update: async (id, data) => {
    return await updateOrder(id, data);
  },
  /**
   * Delete order (simplified API)
   */
  delete: async (id) => {
    return await prisma.order.delete({
      where: { id }
    });
  },
  /**
   * Search orders with simple filters (simplified API)
   */
  search: async (filters) => {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      where: whereClause,
      ...whereFilters
    } = filters;
    const skip = (page - 1) * limit;
    const where = whereClause || {};
    if (whereFilters.merchantId) {
      where.outlet = {
        merchantId: whereFilters.merchantId
      };
    }
    if (whereFilters.outletId) {
      where.outletId = whereFilters.outletId;
    }
    if (whereFilters.customerId) where.customerId = whereFilters.customerId;
    if (whereFilters.status) where.status = whereFilters.status;
    if (whereFilters.orderType) where.orderType = whereFilters.orderType;
    if (whereFilters.productId) {
      where.orderItems = {
        some: {
          productId: whereFilters.productId
        }
      };
    }
    if (whereFilters.startDate || whereFilters.endDate) {
      where.createdAt = {};
      if (whereFilters.startDate) where.createdAt.gte = whereFilters.startDate;
      if (whereFilters.endDate) where.createdAt.lte = whereFilters.endDate;
    }
    if (whereFilters.search) {
      where.OR = [
        { orderNumber: { contains: whereFilters.search } },
        { customer: { firstName: { contains: whereFilters.search } } },
        { customer: { lastName: { contains: whereFilters.search } } },
        { customer: { phone: { contains: whereFilters.search } } }
      ];
    }
    const orderBy = {};
    if (sortBy === "orderNumber") {
      orderBy.orderNumber = sortOrder;
    } else if (sortBy === "totalAmount") {
      orderBy.totalAmount = sortOrder;
    } else if (sortBy === "customer") {
      orderBy.customer = { firstName: sortOrder };
    } else {
      orderBy.createdAt = sortOrder;
    }
    const [orders, total] = await Promise.all([
      // OPTIMIZED: Use select instead of include for better performance
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          totalAmount: true,
          depositAmount: true,
          pickupPlanAt: true,
          returnPlanAt: true,
          pickedUpAt: true,
          returnedAt: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          outlet: {
            select: {
              id: true,
              name: true,
              merchant: { select: { id: true, name: true } }
            }
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          // OPTIMIZED: Count instead of loading all items
          _count: {
            select: {
              orderItems: true,
              payments: true
            }
          }
        },
        orderBy,
        // ✅ Dynamic sorting
        skip,
        take: limit
      }),
      prisma.order.count({ where })
    ]);
    console.log(`\u{1F4CA} db.orders.search: page=${page}, skip=${skip}, limit=${limit}, total=${total}, orders=${orders.length}`);
    return {
      data: orders,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
      totalPages: Math.ceil(total / limit)
    };
  },
  /**
   * Get order statistics (simplified API)
   */
  getStats: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    return await prisma.order.count({ where });
  },
  /**
   * Group orders by field (simplified API)
   */
  groupBy: async (args) => {
    return await prisma.order.groupBy(args);
  },
  /**
   * Aggregate orders (simplified API)
   */
  aggregate: async (args) => {
    return await prisma.order.aggregate(args);
  }
};

// src/payment.ts
async function createPayment(data) {
  return await prisma.payment.create({
    data,
    include: {
      order: {
        include: {
          customer: { select: { firstName: true, lastName: true } },
          outlet: { select: { name: true } }
        }
      }
    }
  });
}
async function findById(id) {
  return await prisma.payment.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          customer: { select: { firstName: true, lastName: true } },
          outlet: { select: { name: true } }
        }
      }
    }
  });
}
async function findBySubscriptionId(subscriptionId, options = {}) {
  const { limit = 20 } = options;
  return await prisma.payment.findMany({
    where: { subscriptionId },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}
async function searchPayments(filters) {
  const { where, include, orderBy, take = 20, skip = 0 } = filters;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include,
      orderBy,
      take,
      skip
    }),
    prisma.payment.count({ where })
  ]);
  return {
    data: payments,
    total,
    page: Math.floor(skip / take) + 1,
    limit: take,
    hasMore: skip + take < total
  };
}
var simplifiedPayments = {
  /**
   * Create payment (simplified API)
   */
  create: createPayment,
  /**
   * Find payment by ID (simplified API)
   */
  findById,
  /**
   * Find payments by subscription ID (simplified API)
   */
  findBySubscriptionId,
  /**
   * Search payments (simplified API)
   */
  search: searchPayments,
  /**
   * Get payment statistics (simplified API)
   */
  getStats: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    return await prisma.payment.count({ where });
  },
  /**
   * Group payments by field (simplified API)
   */
  groupBy: async (args) => {
    return await prisma.payment.groupBy(args);
  },
  /**
   * Aggregate payments (simplified API)
   */
  aggregate: async (args) => {
    return await prisma.payment.aggregate(args);
  }
};

// src/outlet.ts
var simplifiedOutlets = {
  /**
   * Find outlet by ID (simplified API)
   */
  findById: async (id) => {
    return await prisma.outlet.findUnique({
      where: { id },
      include: {
        merchant: { select: { id: true, name: true } },
        _count: {
          select: {
            users: true,
            orders: true,
            products: true
          }
        }
      }
    });
  },
  /**
   * Create new outlet (simplified API)
   */
  create: async (data) => {
    try {
      console.log("\u{1F50D} simplifiedOutlets.create called with data:", data);
      if (data.merchant && data.merchant.connect && data.merchant.connect.id) {
        const merchantId = data.merchant.connect.id;
        const merchant = await prisma.merchant.findUnique({
          where: { id: merchantId },
          select: { id: true }
        });
        if (!merchant) {
          throw new Error(`Merchant with id ${merchantId} not found`);
        }
        console.log("\u2705 Merchant found:", merchant);
      }
      const outlet = await prisma.outlet.create({
        data,
        include: {
          merchant: { select: { id: true, name: true } }
        }
      });
      console.log("\u2705 Outlet created successfully:", outlet);
      return outlet;
    } catch (error) {
      console.error("\u274C Error in simplifiedOutlets.create:", error);
      throw error;
    }
  },
  /**
   * Update outlet (simplified API)
   */
  update: async (id, data) => {
    return await prisma.outlet.update({
      where: { id },
      data,
      include: {
        merchant: { select: { id: true, name: true } }
      }
    });
  },
  /**
   * Find first outlet matching criteria (simplified API)
   */
  findFirst: async (where) => {
    return await prisma.outlet.findFirst({
      where,
      include: {
        merchant: { select: { id: true, name: true } },
        _count: {
          select: {
            users: true,
            orders: true,
            products: true
          }
        }
      }
    });
  },
  /**
   * Get outlet statistics (simplified API)
   */
  getStats: async (options) => {
    return await prisma.outlet.count(options.where);
  },
  /**
   * Update multiple outlets (simplified API)
   */
  updateMany: async (where, data) => {
    return await prisma.outlet.updateMany({
      where,
      data
    });
  },
  /**
   * Search outlets with pagination (simplified API)
   */
  search: async (filters) => {
    const { page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc", ...whereFilters } = filters;
    const skip = (page - 1) * limit;
    console.log("\u{1F50D} DB outlet.search - Received filters:", filters);
    console.log("\u{1F50D} DB outlet.search - whereFilters:", whereFilters);
    const where = {};
    if (whereFilters.merchantId) where.merchantId = whereFilters.merchantId;
    if (whereFilters.outletId) where.id = whereFilters.outletId;
    if (whereFilters.isActive !== void 0) where.isActive = whereFilters.isActive;
    if (whereFilters.status) where.status = whereFilters.status;
    const searchTerm = whereFilters.search?.trim();
    console.log("\u{1F50D} DB outlet.search - searchTerm:", searchTerm, "length:", searchTerm?.length);
    if (searchTerm && searchTerm.length > 0) {
      where.name = {
        contains: searchTerm,
        mode: "insensitive"
      };
      console.log("\u2705 DB outlet.search - Added name filter:", where.name);
    } else {
      console.log("\u26A0\uFE0F DB outlet.search - No search term, will return all outlets for this merchant");
    }
    console.log("\u{1F50D} DB outlet.search - Final where clause:", JSON.stringify(where, null, 2));
    if (whereFilters.name) where.name = { contains: whereFilters.name, mode: "insensitive" };
    if (whereFilters.address) where.address = { contains: whereFilters.address, mode: "insensitive" };
    if (whereFilters.phone) where.phone = { contains: whereFilters.phone, mode: "insensitive" };
    const orderBy = {};
    if (sortBy === "name" || sortBy === "createdAt" || sortBy === "updatedAt") {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = "desc";
    }
    const [outlets, total] = await Promise.all([
      prisma.outlet.findMany({
        where,
        include: {
          merchant: { select: { id: true, name: true } },
          _count: {
            select: {
              users: true,
              orders: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.outlet.count({ where })
    ]);
    return {
      data: outlets,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    };
  },
  count: async (options) => {
    const where = options?.where || {};
    return await prisma.outlet.count({ where });
  }
};

// src/plan.ts
var simplifiedPlans = {
  /**
   * Find plan by ID (simplified API)
   */
  findById: async (id) => {
    return await prisma.plan.findUnique({
      where: { id }
    });
  },
  /**
   * Create new plan (simplified API)
   */
  create: async (data) => {
    return await prisma.plan.create({
      data
    });
  },
  /**
   * Update plan (simplified API)
   */
  update: async (id, data) => {
    return await prisma.plan.update({
      where: { id },
      data
    });
  },
  /**
   * Delete plan (simplified API)
   */
  delete: async (id) => {
    return await prisma.plan.delete({
      where: { id }
    });
  },
  /**
   * Search plans with simple filters (simplified API)
   */
  search: async (filters) => {
    const { page = 1, limit = 20, ...whereFilters } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (whereFilters.isActive !== void 0) where.isActive = whereFilters.isActive;
    if (whereFilters.isPopular !== void 0) where.isPopular = whereFilters.isPopular;
    if (whereFilters.search) {
      where.OR = [
        { name: { contains: whereFilters.search } },
        { description: { contains: whereFilters.search } }
      ];
    }
    if (whereFilters.minPrice !== void 0 || whereFilters.maxPrice !== void 0) {
      where.basePrice = {};
      if (whereFilters.minPrice !== void 0) where.basePrice.gte = whereFilters.minPrice;
      if (whereFilters.maxPrice !== void 0) where.basePrice.lte = whereFilters.maxPrice;
    }
    const [plans, total] = await Promise.all([
      prisma.plan.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip,
        take: limit
      }),
      prisma.plan.count({ where })
    ]);
    return {
      data: plans,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    };
  },
  /**
   * Get plan statistics (simplified API)
   */
  getStats: async () => {
    const [totalPlans, activePlans, popularPlans] = await Promise.all([
      prisma.plan.count(),
      prisma.plan.count({ where: { isActive: true } }),
      prisma.plan.count({ where: { isPopular: true } })
    ]);
    return {
      totalPlans,
      activePlans,
      popularPlans
    };
  }
};

// src/subscription.ts
import { calculateSubscriptionPrice } from "@rentalshop/utils";
function generatePricingFromBasePrice(basePrice) {
  const monthlyPrice = basePrice;
  const quarterlyPrice = monthlyPrice * 3;
  const yearlyPrice = monthlyPrice * 12;
  return {
    monthly: {
      price: monthlyPrice,
      discount: 0,
      savings: 0
    },
    quarterly: {
      price: quarterlyPrice,
      discount: 5,
      // 5% discount for quarterly
      savings: quarterlyPrice * 0.05
    },
    yearly: {
      price: yearlyPrice,
      discount: 15,
      // 15% discount for yearly
      savings: yearlyPrice * 0.15
    }
  };
}
function convertPrismaPlanToPlan(prismaPlan) {
  return {
    id: prismaPlan.id,
    name: prismaPlan.name,
    description: prismaPlan.description,
    basePrice: prismaPlan.basePrice,
    currency: prismaPlan.currency,
    trialDays: prismaPlan.trialDays,
    limits: JSON.parse(prismaPlan.limits),
    features: JSON.parse(prismaPlan.features),
    isActive: prismaPlan.isActive,
    isPopular: prismaPlan.isPopular,
    sortOrder: prismaPlan.sortOrder,
    pricing: generatePricingFromBasePrice(prismaPlan.basePrice),
    createdAt: prismaPlan.createdAt,
    updatedAt: prismaPlan.updatedAt,
    deletedAt: prismaPlan.deletedAt || void 0
  };
}
async function getSubscriptionByMerchantId(merchantId) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  if (!merchant) {
    return null;
  }
  const subscription = await prisma.subscription.findUnique({
    where: { merchantId: merchant.id },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    }
  });
  if (!subscription) return null;
  return {
    id: subscription.id,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status,
    billingInterval: subscription.interval,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    amount: subscription.amount,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: convertPrismaPlanToPlan(subscription.plan)
  };
}
async function getExpiredSubscriptions() {
  const now = /* @__PURE__ */ new Date();
  const subscriptions = await prisma.subscription.findMany({
    where: {
      currentPeriodEnd: {
        lt: now
      },
      status: {
        in: ["active", "trial"]
      }
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    },
    orderBy: { currentPeriodEnd: "asc" }
  });
  return subscriptions.map((sub) => ({
    id: sub.id,
    merchantId: sub.merchantId,
    planId: sub.planId,
    status: sub.status,
    billingInterval: sub.interval,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    amount: sub.amount,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    merchant: sub.merchant,
    plan: convertPrismaPlanToPlan(sub.plan)
  }));
}
async function getSubscriptionById(id) {
  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    }
  });
  if (!subscription) return null;
  return {
    id: subscription.id,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status,
    billingInterval: subscription.interval,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    amount: subscription.amount,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: convertPrismaPlanToPlan(subscription.plan)
  };
}
async function updateSubscription(subscriptionId, data) {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    }
  });
  return {
    id: subscription.id,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status,
    billingInterval: subscription.interval,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    amount: subscription.amount,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: convertPrismaPlanToPlan(subscription.plan)
  };
}
async function createSubscriptionPayment(data) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: data.subscriptionId },
    select: { id: true }
  });
  if (!subscription) {
    throw new Error("Subscription not found");
  }
  const payment = await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      amount: data.amount,
      currency: data.currency,
      method: data.method,
      type: "SUBSCRIPTION",
      status: data.status,
      transactionId: data.transactionId,
      description: data.description,
      failureReason: data.failureReason
    }
  });
  return {
    id: payment.id,
    subscriptionId: data.subscriptionId,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    status: payment.status,
    transactionId: payment.transactionId || "",
    description: payment.description || void 0,
    failureReason: payment.failureReason || void 0,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  };
}
var simplifiedSubscriptions = {
  /**
   * Find subscription by ID (simplified API)
   */
  findById: async (id) => {
    return await prisma.subscription.findUnique({
      where: { id },
      include: {
        merchant: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });
  },
  /**
   * Find subscription by merchant ID (simplified API)
   */
  findByMerchantId: async (merchantId) => {
    return await prisma.subscription.findFirst({
      where: {
        merchantId,
        status: { not: "CANCELLED" }
      },
      include: {
        merchant: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });
  },
  /**
   * Create new subscription (simplified API)
   */
  create: async (data) => {
    return await prisma.subscription.create({
      data,
      include: {
        merchant: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } }
      }
    });
  },
  /**
   * Update subscription (simplified API)
   */
  update: async (id, data) => {
    return await prisma.subscription.update({
      where: { id },
      data,
      include: {
        merchant: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } }
      }
    });
  },
  /**
   * Delete subscription (simplified API)
   */
  delete: async (id) => {
    return await prisma.subscription.update({
      where: { id },
      data: {
        status: "CANCELLED",
        canceledAt: /* @__PURE__ */ new Date()
      }
    });
  },
  /**
   * Search subscriptions with simple filters (simplified API)
   */
  search: async (filters) => {
    const { page = 1, limit = 20, ...whereFilters } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (whereFilters.merchantId) where.merchantId = whereFilters.merchantId;
    if (whereFilters.planId) where.planId = whereFilters.planId;
    if (whereFilters.isActive !== void 0) {
      if (whereFilters.isActive) {
        where.status = { not: "CANCELLED" };
      } else {
        where.status = "CANCELLED";
      }
    }
    if (whereFilters.status) where.status = whereFilters.status;
    if (whereFilters.startDate || whereFilters.endDate) {
      where.createdAt = {};
      if (whereFilters.startDate) where.createdAt.gte = whereFilters.startDate;
      if (whereFilters.endDate) where.createdAt.lte = whereFilters.endDate;
    }
    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          merchant: { select: { id: true, name: true } },
          plan: { select: { id: true, name: true } },
          payments: {
            orderBy: { createdAt: "desc" },
            take: 3
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.subscription.count({ where })
    ]);
    return {
      data: subscriptions,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    };
  },
  /**
   * Get expired subscriptions (simplified API)
   */
  getExpired: async () => {
    const now = /* @__PURE__ */ new Date();
    return await prisma.subscription.findMany({
      where: {
        status: { not: "CANCELLED" },
        OR: [
          {
            status: "TRIAL",
            trialEnd: { lt: now }
          },
          {
            status: "ACTIVE",
            currentPeriodEnd: { lt: now }
          }
        ]
      },
      include: {
        merchant: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } }
      },
      orderBy: { currentPeriodEnd: "asc" }
    });
  }
};

// src/subscription-activity.ts
async function createActivity(data) {
  const { metadata, ...rest } = data;
  return await prisma.subscriptionActivity.create({
    data: {
      ...rest,
      metadata: metadata ? JSON.stringify(metadata) : null
    }
  });
}
async function getActivitiesBySubscriptionId(subscriptionId, options = {}) {
  const { limit = 50, offset = 0 } = options;
  const [activities, total] = await Promise.all([
    prisma.subscriptionActivity.findMany({
      where: { subscriptionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    }),
    prisma.subscriptionActivity.count({ where: { subscriptionId } })
  ]);
  return {
    activities: activities.map((activity) => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null
    })),
    total
  };
}
var simplifiedSubscriptionActivities = {
  /**
   * Create activity (simplified API)
   */
  create: createActivity,
  /**
   * Get activities by subscription ID
   */
  getBySubscriptionId: getActivitiesBySubscriptionId
};

// src/merchant.ts
async function findById2(id) {
  return await prisma.merchant.findUnique({
    where: { id },
    include: {
      Plan: true,
      subscription: {
        include: {
          plan: true
        }
      },
      outlets: {
        select: {
          id: true,
          name: true,
          isActive: true
        }
      },
      _count: {
        select: {
          outlets: true,
          users: true,
          products: true,
          customers: true
        }
      }
    }
  });
}
async function findByEmail(email) {
  return await prisma.merchant.findUnique({
    where: { email },
    include: {
      Plan: true,
      subscription: true
    }
  });
}
async function search(filters) {
  const {
    page = 1,
    limit = 20,
    search: search3,
    businessType,
    subscriptionStatus,
    planId,
    isActive
  } = filters;
  const skip = (page - 1) * limit;
  const where = {};
  if (search3) {
    where.OR = [
      { name: { contains: search3, mode: "insensitive" } },
      { email: { contains: search3, mode: "insensitive" } },
      { businessType: { contains: search3, mode: "insensitive" } }
    ];
  }
  if (businessType) {
    where.businessType = businessType;
  }
  if (subscriptionStatus) {
    where.subscriptionStatus = subscriptionStatus;
  }
  if (planId !== void 0) {
    where.planId = planId;
  }
  if (isActive !== void 0) {
    where.isActive = isActive;
  }
  const [merchants, total] = await Promise.all([
    prisma.merchant.findMany({
      where,
      include: {
        Plan: {
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
            currency: true
          }
        },
        subscription: {
          select: {
            id: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            amount: true
          }
        },
        _count: {
          select: {
            outlets: true,
            users: true,
            products: true,
            customers: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.merchant.count({ where })
  ]);
  return {
    data: merchants,
    total,
    page,
    limit,
    hasMore: skip + limit < total
  };
}
async function create(data) {
  return await prisma.merchant.create({
    data: {
      ...data,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    },
    include: {
      Plan: true,
      subscription: true
    }
  });
}
async function update(id, data) {
  return await prisma.merchant.update({
    where: { id },
    data: {
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    },
    include: {
      Plan: true,
      subscription: true
    }
  });
}
async function remove(id) {
  return await prisma.merchant.update({
    where: { id },
    data: {
      isActive: false,
      updatedAt: /* @__PURE__ */ new Date()
    }
  });
}
async function getStats(id) {
  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          outlets: true,
          users: true,
          products: true,
          customers: true
        }
      }
    }
  });
  if (!merchant) {
    return null;
  }
  const revenueResult = await prisma.order.aggregate({
    where: {
      outlet: {
        merchantId: id
      },
      status: { in: ["COMPLETED", "RETURNED"] }
    },
    _sum: {
      totalAmount: true
    }
  });
  return {
    totalOutlets: merchant._count.outlets,
    totalUsers: merchant._count.users,
    totalProducts: merchant._count.products,
    totalCustomers: merchant._count.customers,
    totalOrders: 0,
    // Will be calculated separately
    totalRevenue: revenueResult._sum.totalAmount || 0
  };
}
async function count(options) {
  const where = options?.where || {};
  return await prisma.merchant.count({ where });
}
var simplifiedMerchants = {
  findById: findById2,
  findByEmail,
  search,
  create,
  update,
  remove,
  getStats,
  count
};

// src/order-number-generator.ts
var FORMAT_CONFIGS = {
  sequential: {
    description: "Sequential numbering per outlet",
    example: "ORD-001-0001",
    pros: ["Outlet identification", "Easy tracking", "Human readable"],
    cons: ["Business intelligence leakage", "Race conditions possible"],
    bestFor: "Small to medium businesses with low concurrency"
  },
  "date-based": {
    description: "Date-based with daily sequence reset",
    example: "ORD-001-20250115-0001",
    pros: ["Daily organization", "Better security", "Easy daily reporting"],
    cons: ["Longer numbers", "Still somewhat predictable"],
    bestFor: "Medium businesses with daily operations focus"
  },
  random: {
    description: "Random alphanumeric strings for security",
    example: "ORD-001-A7B9C2",
    pros: ["Maximum security", "No race conditions", "Unpredictable"],
    cons: ["No sequence tracking", "Harder to manage", "No business insights"],
    bestFor: "Large businesses prioritizing security"
  },
  "random-numeric": {
    description: "Random numeric strings for security",
    example: "ORD-001-123456",
    pros: ["Maximum security", "No race conditions", "Numbers only", "Unpredictable"],
    cons: ["No sequence tracking", "Harder to manage", "No business insights"],
    bestFor: "Businesses needing numeric-only random order numbers"
  },
  "compact-numeric": {
    description: "Compact format with outlet ID and 5-digit random number",
    example: "ORD00112345",
    pros: ["Compact format", "Outlet identification", "Numbers only", "Short length", "Easy to read"],
    cons: ["No sequence tracking", "Limited randomness (5 digits)"],
    bestFor: "Businesses wanting compact, numeric-only order numbers"
  },
  hybrid: {
    description: "Combines outlet, date, and random elements",
    example: "ORD-001-20250115-A7B9",
    pros: ["Balanced security", "Outlet identification", "Date organization"],
    cons: ["Longer numbers", "More complex"],
    bestFor: "Large businesses needing both security and organization"
  }
};
function getFormatInfo(format) {
  return FORMAT_CONFIGS[format];
}
async function generateOrderNumber(config) {
  const {
    format = "sequential",
    outletId,
    prefix = "ORD",
    includeDate = false,
    sequenceLength = 4,
    randomLength = 6,
    numericOnly = false
  } = config;
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true, name: true }
  });
  if (!outlet) {
    throw new Error(`Outlet with id ${outletId} not found`);
  }
  const outletIdStr = outlet.id.toString().padStart(3, "0");
  const generatedAt = /* @__PURE__ */ new Date();
  switch (format) {
    case "sequential":
      return await generateSequentialNumber(outletIdStr, prefix, sequenceLength);
    case "date-based":
      return await generateDateBasedNumber(outletIdStr, prefix, sequenceLength, generatedAt);
    case "random":
      return await generateRandomNumber(outletIdStr, prefix, randomLength, false);
    case "random-numeric":
      return await generateRandomNumber(outletIdStr, prefix, randomLength, true);
    case "compact-numeric":
      return await generateCompactNumericNumber(outletIdStr, prefix);
    case "hybrid":
      return await generateHybridNumber(outletIdStr, prefix, sequenceLength, generatedAt, numericOnly);
    default:
      throw new Error(`Unsupported order number format: ${format}`);
  }
}
async function generateSequentialNumber(outletIdStr, prefix, sequenceLength) {
  const maxRetries = 5;
  let retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const lastOrder = await tx.order.findFirst({
          where: {
            orderNumber: { startsWith: `${prefix}-${outletIdStr}-` }
          },
          orderBy: { createdAt: "desc" },
          select: { orderNumber: true, createdAt: true }
        });
        let nextSequence = 1;
        if (lastOrder) {
          const parts = lastOrder.orderNumber.split("-");
          const lastSequence = parseInt(parts[parts.length - 1]) || 0;
          nextSequence = lastSequence + 1;
        }
        const orderNumber = `${prefix}-${outletIdStr}-${nextSequence.toString().padStart(sequenceLength, "0")}`;
        const existingOrder = await tx.order.findUnique({
          where: { orderNumber },
          select: { id: true }
        });
        if (existingOrder) {
          throw new Error("Order number collision detected");
        }
        return {
          orderNumber,
          sequence: nextSequence,
          generatedAt: /* @__PURE__ */ new Date()
        };
      });
      return result;
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to generate sequential order number after ${maxRetries} retries: ${errorMessage}`);
      }
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 10));
    }
  }
  throw new Error("Maximum retries exceeded");
}
async function generateDateBasedNumber(outletIdStr, prefix, sequenceLength, generatedAt) {
  const dateStr = generatedAt.toISOString().split("T")[0].replace(/-/g, "");
  const result = await prisma.$transaction(async (tx) => {
    const lastOrder = await tx.order.findFirst({
      where: {
        orderNumber: { startsWith: `${prefix}-${outletIdStr}-${dateStr}-` }
      },
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true }
    });
    let nextSequence = 1;
    if (lastOrder) {
      const parts = lastOrder.orderNumber.split("-");
      const lastSequence = parseInt(parts[parts.length - 1]) || 0;
      nextSequence = lastSequence + 1;
    }
    const orderNumber = `${prefix}-${outletIdStr}-${dateStr}-${nextSequence.toString().padStart(sequenceLength, "0")}`;
    const existingOrder = await tx.order.findUnique({
      where: { orderNumber },
      select: { id: true }
    });
    if (existingOrder) {
      throw new Error("Order number collision detected");
    }
    return {
      orderNumber,
      sequence: nextSequence,
      generatedAt
    };
  });
  return result;
}
async function generateRandomNumber(outletIdStr, prefix, randomLength, numericOnly = false) {
  const maxRetries = 10;
  let retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      const randomStr = generateRandomString(randomLength, numericOnly);
      const orderNumber = `${prefix}-${outletIdStr}-${randomStr}`;
      const existingOrder = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true }
      });
      if (!existingOrder) {
        return {
          orderNumber,
          sequence: 0,
          // No sequence for random
          generatedAt: /* @__PURE__ */ new Date()
        };
      }
      retryCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate random order number: ${errorMessage}`);
    }
  }
  throw new Error(`Failed to generate unique random order number after ${maxRetries} attempts`);
}
async function generateCompactNumericNumber(outletIdStr, prefix) {
  const maxRetries = 10;
  let retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      const randomStr = generateRandomString(5, true);
      const orderNumber = `${prefix}${outletIdStr}${randomStr}`;
      const existingOrder = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true }
      });
      if (!existingOrder) {
        return {
          orderNumber,
          sequence: 0,
          // No sequence for compact numeric
          generatedAt: /* @__PURE__ */ new Date()
        };
      }
      retryCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate compact numeric order number: ${errorMessage}`);
    }
  }
  throw new Error(`Failed to generate unique compact numeric order number after ${maxRetries} attempts`);
}
async function generateHybridNumber(outletIdStr, prefix, sequenceLength, generatedAt, numericOnly = false) {
  const dateStr = generatedAt.toISOString().split("T")[0].replace(/-/g, "");
  const randomStr = generateRandomString(4, numericOnly);
  const orderNumber = `${prefix}-${outletIdStr}-${dateStr}-${randomStr}`;
  const existingOrder = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true }
  });
  if (existingOrder) {
    return generateHybridNumber(outletIdStr, prefix, sequenceLength, generatedAt, numericOnly);
  }
  return {
    orderNumber,
    sequence: 0,
    // No sequence for hybrid
    generatedAt
  };
}
function generateRandomString(length, numericOnly = false) {
  const chars = numericOnly ? "0123456789" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomBytes = new Uint8Array(length);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    const crypto = __require("crypto");
    const randomBytesNode = crypto.randomBytes(length);
    randomBytes.set(randomBytesNode);
  }
  return Array.from(randomBytes, (byte) => chars[byte % chars.length]).join("");
}
function validateOrderNumber(orderNumber) {
  const patterns = [
    /^ORD-\d{3}-\d{4}$/,
    // Sequential: ORD-001-0001
    /^ORD-\d{3}-\d{8}-\d{4}$/,
    // Date-based: ORD-001-20250115-0001
    /^ORD-\d{3}-[A-Z0-9]{6}$/,
    // Random: ORD-001-A7B9C2
    /^ORD-\d{3}-\d{6}$/,
    // Random-numeric: ORD-001-123456
    /^ORD-\d{3}-\d{8}-[A-Z0-9]{4}$/,
    // Hybrid: ORD-001-20250115-A7B9
    /^ORD\d{3}\d{5}$/
    // Compact-numeric: ORD00112345
  ];
  return patterns.some((pattern) => pattern.test(orderNumber));
}
async function getOutletOrderStats(outletId) {
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true }
  });
  if (!outlet) {
    throw new Error(`Outlet with id ${outletId} not found`);
  }
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [totalOrders, todayOrders, lastOrder] = await Promise.all([
    prisma.order.count({
      where: { outletId: outlet.id }
    }),
    prisma.order.count({
      where: {
        outletId: outlet.id,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    }),
    prisma.order.findFirst({
      where: { outletId: outlet.id },
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true, createdAt: true }
    })
  ]);
  return {
    totalOrders,
    todayOrders,
    lastOrderNumber: lastOrder?.orderNumber,
    lastOrderDate: lastOrder?.createdAt
  };
}
async function createOrderNumberWithFormat(outletId, format) {
  const config = {
    format,
    outletId,
    prefix: "ORD",
    sequenceLength: 4,
    randomLength: 6,
    includeDate: true
  };
  return await generateOrderNumber(config);
}
async function generateTestOrderNumbers(outletId, count2, format = "sequential") {
  const orderNumbers = [];
  for (let i = 0; i < count2; i++) {
    const result = await createOrderNumberWithFormat(outletId, format);
    orderNumbers.push(result.orderNumber);
  }
  return orderNumbers;
}
var simplifiedOrderNumbers = {
  /**
   * Get outlet order stats (simplified API)
   */
  getOutletStats: async (outletId) => {
    return await getOutletOrderStats(outletId);
  },
  /**
   * Create order number with format (simplified API)
   */
  createWithFormat: async (outletId, format) => {
    return await createOrderNumberWithFormat(outletId, format);
  },
  /**
   * Generate multiple order numbers (simplified API)
   */
  generateMultiple: async (outletId, count2, format = "sequential") => {
    return await generateTestOrderNumbers(outletId, count2, format);
  },
  /**
   * Validate order number format (simplified API)
   */
  validateFormat: (orderNumber) => {
    return validateOrderNumber(orderNumber);
  },
  /**
   * Get format info (simplified API)
   */
  getFormatInfo: (format) => {
    return getFormatInfo(format);
  }
};

// src/category.ts
var findById3 = async (id) => {
  return await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
};
var findFirst = async (where) => {
  return await prisma.category.findFirst({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
};
var findMany = async (options = {}) => {
  const { where = {}, select = {}, orderBy = { name: "asc" }, take, skip } = options;
  return await prisma.category.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      ...select
    },
    orderBy,
    take,
    skip
  });
};
var create2 = async (data) => {
  return await prisma.category.create({
    data,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
};
var update2 = async (id, data) => {
  return await prisma.category.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
};
var deleteCategory = async (id) => {
  return await prisma.category.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
};
var search2 = async (filters) => {
  const { page = 1, limit = 20, sortBy = "name", sortOrder = "asc", ...whereFilters } = filters;
  const skip = (page - 1) * limit;
  console.log("\u{1F50D} DB category.search - Received filters:", filters);
  const where = {};
  if (whereFilters.merchantId) where.merchantId = whereFilters.merchantId;
  if (whereFilters.isActive !== void 0) where.isActive = whereFilters.isActive;
  const searchTerm = (whereFilters.q || whereFilters.search)?.trim();
  console.log("\u{1F50D} DB category.search - searchTerm:", searchTerm, "length:", searchTerm?.length);
  if (searchTerm && searchTerm.length > 0) {
    where.name = {
      contains: searchTerm,
      mode: "insensitive"
    };
    console.log("\u2705 DB category.search - Added name filter:", where.name);
  } else {
    console.log("\u26A0\uFE0F DB category.search - No search term, will return all categories");
  }
  console.log("\u{1F50D} DB category.search - Final where clause:", JSON.stringify(where, null, 2));
  const orderBy = {};
  if (sortBy === "name" || sortBy === "createdAt" || sortBy === "updatedAt") {
    orderBy[sortBy] = sortOrder;
  } else {
    orderBy.name = "asc";
  }
  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy,
      skip,
      take: limit
    }),
    prisma.category.count({ where })
  ]);
  return {
    data: categories,
    total,
    page,
    limit,
    hasMore: skip + limit < total
  };
};
var getStats2 = async (where = {}) => {
  return await prisma.category.count({ where });
};
var simplifiedCategories = {
  findById: findById3,
  findFirst,
  findMany,
  create: create2,
  update: update2,
  delete: deleteCategory,
  search: search2,
  getStats: getStats2
};

// src/audit-logs.ts
var findMany2 = async (options = {}) => {
  const { where = {}, include = {}, orderBy = { createdAt: "desc" }, take, skip } = options;
  return await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      },
      ...include
    },
    orderBy,
    take,
    skip
  });
};
var getStats3 = async (where = {}) => {
  return await prisma.auditLog.count({ where });
};
var findFirst2 = async (where) => {
  return await prisma.auditLog.findFirst({
    where,
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }
    }
  });
};
var create3 = async (data) => {
  return await prisma.auditLog.create({
    data,
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }
    }
  });
};
var simplifiedAuditLogs = {
  findMany: findMany2,
  findFirst: findFirst2,
  create: create3,
  getStats: getStats3
};

// src/order-items.ts
var findMany3 = async (options = {}) => {
  const { where = {}, include = {}, orderBy = { createdAt: "desc" }, take, skip } = options;
  return await prisma.orderItem.findMany({
    where,
    include,
    orderBy,
    take,
    skip
  });
};
var groupBy = async (options) => {
  const { by, where = {}, _count = {}, _sum = {}, _avg = {}, orderBy, take } = options;
  const groupByOptions = {
    by,
    where,
    orderBy,
    take
  };
  if (Object.keys(_count).length > 0) {
    groupByOptions._count = _count;
  }
  if (Object.keys(_sum).length > 0) {
    groupByOptions._sum = _sum;
  }
  if (Object.keys(_avg).length > 0) {
    groupByOptions._avg = _avg;
  }
  return await prisma.orderItem.groupBy(groupByOptions);
};
var getStats4 = async (where = {}) => {
  return await prisma.orderItem.count({ where });
};
var findFirst3 = async (where) => {
  return await prisma.orderItem.findFirst({
    where,
    include: {
      order: true,
      product: true
    }
  });
};
var create4 = async (data) => {
  return await prisma.orderItem.create({
    data,
    include: {
      order: true,
      product: true
    }
  });
};
var update3 = async (id, data) => {
  return await prisma.orderItem.update({
    where: { id },
    data,
    include: {
      order: true,
      product: true
    }
  });
};
var deleteOrderItem = async (id) => {
  return await prisma.orderItem.delete({
    where: { id }
  });
};
var simplifiedOrderItems = {
  findMany: findMany3,
  findFirst: findFirst3,
  create: create4,
  update: update3,
  delete: deleteOrderItem,
  getStats: getStats4,
  groupBy
};

// src/audit.ts
var AuditLogger = class {
  constructor(prisma2) {
    this.idCounter = 0;
    this.prisma = prisma2;
  }
  // Get next public ID
  async getNextPublicId() {
    return 1;
  }
  // Main logging method
  async log(data) {
    try {
      console.log("\u{1F50D} AuditLogger.log - Starting audit log creation...");
      const id = await this.getNextPublicId();
      console.log("\u{1F50D} AuditLogger.log - Got id:", id);
      const validatedUserId = await this.validateUserId(data.context.userId);
      const validatedMerchantId = await this.validateMerchantId(data.context.merchantId);
      const validatedOutletId = await this.validateOutletId(data.context.outletId);
      console.log("\u{1F50D} AuditLogger.log - About to create audit log with data:", {
        id,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: validatedUserId,
        merchantId: validatedMerchantId,
        outletId: validatedOutletId
      });
      console.log("\u{1F50D} Audit log would be created:", {
        id,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId
      });
      console.log("\u2705 AuditLogger.log - Audit log created successfully");
    } catch (error) {
      console.error("\u274C AuditLogger.log - Audit logging failed:", error);
      console.error("\u274C AuditLogger.log - Error details:", error instanceof Error ? error.message : String(error));
      console.error("\u274C AuditLogger.log - Error stack:", error instanceof Error ? error.stack : void 0);
    }
  }
  // Validate foreign key IDs to prevent constraint violations
  async validateUserId(userId) {
    if (!userId) return null;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });
      return user ? userId : null;
    } catch (error) {
      console.warn("\u26A0\uFE0F AuditLogger - Failed to validate userId:", userId, error);
      return null;
    }
  }
  async validateMerchantId(merchantId) {
    if (!merchantId) return null;
    try {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { id: true }
      });
      return merchant ? merchantId : null;
    } catch (error) {
      console.warn("\u26A0\uFE0F AuditLogger - Failed to validate merchantId:", merchantId, error);
      return null;
    }
  }
  async validateOutletId(outletId) {
    if (!outletId) return null;
    try {
      const outlet = await this.prisma.outlet.findUnique({
        where: { id: outletId },
        select: { id: true }
      });
      return outlet ? outletId : null;
    } catch (error) {
      console.warn("\u26A0\uFE0F AuditLogger - Failed to validate outletId:", outletId, error);
      return null;
    }
  }
  // Convenience methods for common operations
  async logCreate(entityType, entityId, entityName, newValues, context, description) {
    await this.log({
      action: "CREATE",
      entityType,
      entityId,
      entityName,
      newValues,
      description: description || `Created ${entityType.toLowerCase()}: ${entityName}`,
      context
    });
  }
  async logUpdate(entityType, entityId, entityName, oldValues, newValues, context, description) {
    const changes = this.calculateChanges(oldValues, newValues);
    await this.log({
      action: "UPDATE",
      entityType,
      entityId,
      entityName,
      oldValues,
      newValues,
      changes,
      description: description || `Updated ${entityType.toLowerCase()}: ${entityName}`,
      context
    });
  }
  async logDelete(entityType, entityId, entityName, oldValues, context, description) {
    await this.log({
      action: "DELETE",
      entityType,
      entityId,
      entityName,
      oldValues,
      description: description || `Deleted ${entityType.toLowerCase()}: ${entityName}`,
      context
    });
  }
  async logLogin(userId, userEmail, userRole, context, success = true) {
    await this.log({
      action: "LOGIN",
      entityType: "User",
      entityId: userId.toString(),
      entityName: userEmail,
      newValues: { success, timestamp: (/* @__PURE__ */ new Date()).toISOString() },
      severity: success ? "INFO" : "WARNING",
      category: "SECURITY",
      description: success ? `User logged in: ${userEmail}` : `Failed login attempt: ${userEmail}`,
      context
    });
  }
  async logLogout(userId, userEmail, context) {
    await this.log({
      action: "LOGOUT",
      entityType: "User",
      entityId: userId.toString(),
      entityName: userEmail,
      category: "SECURITY",
      description: `User logged out: ${userEmail}`,
      context
    });
  }
  async logSecurityEvent(event, entityType, entityId, context, severity = "WARNING", description) {
    await this.log({
      action: "CUSTOM",
      entityType,
      entityId,
      severity,
      category: "SECURITY",
      description: description || `Security event: ${event}`,
      context
    });
  }
  // Calculate changes between old and new values
  calculateChanges(oldValues, newValues) {
    const changes = {};
    const allKeys = /* @__PURE__ */ new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
    for (const key of Array.from(allKeys)) {
      const oldValue = oldValues[key];
      const newValue = newValues[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = { old: oldValue, new: newValue };
      }
    }
    return changes;
  }
  // Query audit logs
  async getAuditLogs(filter = {}) {
    const where = {};
    if (filter.action) where.action = filter.action;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.userId) where.userId = filter.userId;
    if (filter.merchantId) where.merchantId = filter.merchantId;
    if (filter.outletId) where.outletId = filter.outletId;
    if (filter.severity) where.severity = filter.severity;
    if (filter.category) where.category = filter.category;
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = filter.startDate;
      if (filter.endDate) where.createdAt.lte = filter.endDate;
    }
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    const logs = [];
    const total = 0;
    const transformedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      entityName: log.entityName,
      user: log.user ? {
        id: log.user.id,
        email: log.user.email,
        name: `${log.user.firstName} ${log.user.lastName}`,
        role: log.user.role
      } : null,
      merchant: log.merchant ? {
        id: log.merchant.id,
        name: log.merchant.name
      } : null,
      outlet: log.outlet ? {
        id: log.outlet.id,
        name: log.outlet.name
      } : null,
      oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
      changes: log.changes ? JSON.parse(log.changes) : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      sessionId: log.sessionId,
      requestId: log.requestId,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      severity: log.severity,
      category: log.category,
      description: log.description,
      createdAt: log.createdAt
    }));
    return {
      logs: transformedLogs,
      total,
      hasMore: offset + limit < total
    };
  }
  // Get audit statistics
  async getAuditStats(filter = {}) {
    const where = {};
    if (filter.merchantId) where.merchantId = filter.merchantId;
    if (filter.outletId) where.outletId = filter.outletId;
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = filter.startDate;
      if (filter.endDate) where.createdAt.lte = filter.endDate;
    }
    const totalLogs = 0;
    const actionStats = [];
    const entityStats = [];
    const severityStats = [];
    const categoryStats = [];
    const recentActivity = 0;
    return {
      totalLogs,
      logsByAction: actionStats.reduce((acc, item) => {
        acc[item.action] = item._count.action;
        return acc;
      }, {}),
      logsByEntity: entityStats.reduce((acc, item) => {
        acc[item.entityType] = item._count.entityType;
        return acc;
      }, {}),
      logsBySeverity: severityStats.reduce((acc, item) => {
        acc[item.severity] = item._count.severity;
        return acc;
      }, {}),
      logsByCategory: categoryStats.reduce((acc, item) => {
        acc[item.category] = item._count.category;
        return acc;
      }, {}),
      recentActivity
    };
  }
};
var auditLogger = null;
function getAuditLogger(prisma2) {
  if (!auditLogger) {
    if (!prisma2) {
      throw new Error("Prisma client is required for audit logging");
    }
    auditLogger = new AuditLogger(prisma2);
  }
  return auditLogger;
}
function extractAuditContext(request, user) {
  const headers = request.headers;
  return {
    userId: user?.id,
    userEmail: user?.email,
    userRole: user?.role,
    merchantId: user?.merchantId,
    outletId: user?.outletId,
    ipAddress: headers.get("x-forwarded-for") || headers.get("x-real-ip") || "unknown",
    userAgent: headers.get("user-agent") || "unknown",
    sessionId: headers.get("x-session-id") || void 0,
    requestId: headers.get("x-request-id") || void 0,
    metadata: {
      method: request.method,
      url: request.url,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}

// src/registration.ts
import { hashPassword } from "@rentalshop/auth";
async function registerUser(data) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: data.email }
      });
      if (existingUser) {
        throw new Error("User with this email already exists");
      }
      const registrationType = determineRegistrationType(data);
      if (registrationType === "MERCHANT") {
        return await registerMerchant(tx, data);
      } else if (registrationType === "OUTLET_ADMIN" || registrationType === "OUTLET_STAFF") {
        return await registerOutletUser(tx, data);
      } else {
        return await registerBasicUser(tx, data);
      }
    });
    return result;
  } catch (error) {
    console.error("Registration error:", error);
    throw new Error(error.message || "Registration failed");
  }
}
function determineRegistrationType(data) {
  if (data.role === "MERCHANT") {
    return "MERCHANT";
  }
  if (data.role === "OUTLET_ADMIN" || data.role === "OUTLET_STAFF") {
    return data.role;
  }
  if (data.businessName) {
    return "MERCHANT";
  }
  if (data.merchantCode) {
    return "OUTLET_STAFF";
  }
  return "BASIC";
}
async function registerMerchant(tx, data) {
  const existingMerchant = await tx.merchant.findUnique({
    where: { email: data.email }
  });
  if (existingMerchant) {
    throw new Error("Merchant with this email already exists");
  }
  let trialPlan = await tx.plan.findFirst({
    where: {
      name: "Trial",
      isActive: true
    }
  });
  if (!trialPlan) {
    console.log("Creating trial plan automatically...");
    trialPlan = await tx.plan.create({
      data: {
        name: "Trial",
        description: "Free trial plan for new merchants to test the platform",
        basePrice: 0,
        // Free
        currency: "USD",
        trialDays: 14,
        limits: JSON.stringify({
          outlets: 1,
          users: 2,
          products: 25,
          customers: 50
        }),
        features: JSON.stringify([
          "Basic inventory management",
          "Customer management",
          "Order processing (limited)",
          "Basic reporting",
          "Email support",
          "Mobile app access",
          "14-day free trial"
        ]),
        isActive: true,
        isPopular: false,
        sortOrder: 0
        // Show first
      }
    });
    console.log("\u2705 Trial plan created automatically");
  }
  const lastMerchant = await tx.merchant.findFirst({
    orderBy: { id: "desc" }
  });
  const merchantId = (lastMerchant?.id || 0) + 1;
  const merchant = await tx.merchant.create({
    data: {
      id: merchantId,
      name: data.businessName || `${data.name}'s Business`,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      country: data.country,
      isActive: true,
      subscriptionStatus: "trial"
    }
  });
  const lastOutlet = await tx.outlet.findFirst({
    orderBy: { id: "desc" }
  });
  const outletId = (lastOutlet?.id || 0) + 1;
  const outlet = await tx.outlet.create({
    data: {
      id: outletId,
      name: data.outletName || "Main Store",
      // Always use merchant's information as primary source, with user input as fallback
      address: merchant.address || data.address || "Address to be updated",
      phone: merchant.phone || data.phone,
      city: merchant.city || data.city,
      state: merchant.state || data.state,
      zipCode: merchant.zipCode || data.zipCode,
      country: merchant.country || data.country,
      description: "Default outlet created during registration",
      merchantId: merchant.id,
      isActive: true,
      isDefault: true
    }
  });
  const lastCategory = await tx.category.findFirst({
    orderBy: { id: "desc" }
  });
  const categoryId = (lastCategory?.id || 0) + 1;
  const defaultCategory = await tx.category.create({
    data: {
      id: categoryId,
      name: "General",
      description: "Default category for general products",
      merchantId: merchant.id,
      isActive: true
    }
  });
  const hashedPassword = await hashPassword(data.password);
  const lastUser = await tx.user.findFirst({
    orderBy: { id: "desc" }
  });
  const userId = (lastUser?.id || 0) + 1;
  const user = await tx.user.create({
    data: {
      id: userId,
      email: data.email,
      password: hashedPassword,
      firstName: data.name.split(" ")[0] || "",
      lastName: data.name.split(" ").slice(1).join(" ") || "",
      phone: data.phone,
      role: "MERCHANT",
      merchantId: merchant.id,
      outletId,
      // Assign default outlet to merchant user
      isActive: true
    }
  });
  const subscriptionStartDate = /* @__PURE__ */ new Date();
  const endDate = new Date(subscriptionStartDate.getTime() + trialPlan.trialDays * 24 * 60 * 60 * 1e3);
  const lastSubscription = await tx.subscription.findFirst({
    orderBy: { id: "desc" }
  });
  const subscriptionId = (lastSubscription?.id || 0) + 1;
  const subscription = await tx.subscription.create({
    data: {
      id: subscriptionId,
      merchantId: merchant.id,
      planId: trialPlan.id,
      status: "trial",
      amount: 0,
      // Free trial
      currency: "USD",
      interval: "month",
      // Default to monthly for trial
      intervalCount: 1,
      // 1 month intervals
      currentPeriodStart: subscriptionStartDate,
      currentPeriodEnd: endDate,
      trialStart: subscriptionStartDate,
      trialEnd: endDate,
      cancelAtPeriodEnd: false
    }
  });
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      merchant: {
        id: merchant.id,
        name: merchant.name
      },
      outlet: {
        id: outlet.id,
        name: outlet.name
      }
    },
    token: "",
    // Will be generated by auth service
    message: "Merchant account created successfully with default outlet"
  };
}
async function registerMerchantWithTrial(data) {
  const registrationData = {
    email: data.userEmail,
    password: data.userPassword,
    name: `${data.userFirstName} ${data.userLastName}`,
    phone: data.userPhone,
    role: "MERCHANT",
    businessName: data.merchantName,
    outletName: data.outletName,
    address: data.outletAddress
  };
  const result = await registerUser(registrationData);
  if (!result.success) {
    throw new Error(result.message);
  }
  return {
    merchant: {
      id: result.user.merchant?.id,
      name: result.user.merchant?.name,
      email: result.user.email
    },
    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      role: result.user.role
    },
    outlet: {
      id: result.user.outlet?.id,
      name: result.user.outlet?.name
    },
    subscription: {
      planName: "Trial",
      trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3)
      // 14 days from now
    }
  };
}
async function registerOutletUser(tx, data) {
  if (!data.merchantCode) {
    throw new Error("Merchant code is required for outlet user registration");
  }
  const merchant = await tx.merchant.findUnique({
    where: { id: parseInt(data.merchantCode) }
  });
  if (!merchant) {
    throw new Error("Invalid merchant code. Please check with your manager.");
  }
  let outlet = null;
  if (data.outletCode) {
    outlet = await tx.outlet.findUnique({
      where: {
        id: parseInt(data.outletCode),
        merchantId: merchant.id
      }
    });
    if (!outlet) {
      throw new Error("Invalid outlet code. Please check with your manager.");
    }
  } else {
    outlet = await tx.outlet.findFirst({
      where: {
        merchantId: merchant.id,
        isDefault: true
      }
    });
    if (!outlet) {
      const lastOutlet = await tx.outlet.findFirst({
        orderBy: { id: "desc" }
      });
      const outletId = (lastOutlet?.id || 0) + 1;
      outlet = await tx.outlet.create({
        data: {
          id: outletId,
          name: `${merchant.name} - Main Store`,
          address: merchant.address || "Address to be updated",
          phone: merchant.phone,
          city: merchant.city,
          state: merchant.state,
          zipCode: merchant.zipCode,
          country: merchant.country,
          description: "Default outlet for staff",
          merchantId: merchant.id,
          isActive: true,
          isDefault: true
        }
      });
    }
  }
  const hashedPassword = await hashPassword(data.password);
  const lastUser = await tx.user.findFirst({
    orderBy: { id: "desc" }
  });
  const userId = (lastUser?.id || 0) + 1;
  const user = await tx.user.create({
    data: {
      id: userId,
      email: data.email,
      password: hashedPassword,
      firstName: data.name.split(" ")[0] || "",
      lastName: data.name.split(" ").slice(1).join(" ") || "",
      phone: data.phone,
      role: data.role || "OUTLET_STAFF",
      merchantId: merchant.id,
      outletId: outlet.id,
      isActive: true
    }
  });
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      merchant: {
        id: merchant.id,
        name: merchant.name
      },
      outlet: {
        id: outlet.id,
        name: outlet.name
      }
    },
    token: "",
    // Will be generated by auth service
    message: `${data.role === "OUTLET_ADMIN" ? "Outlet admin" : "Staff"} account created successfully`
  };
}
async function registerBasicUser(tx, data) {
  const hashedPassword = await hashPassword(data.password);
  const lastUser = await tx.user.findFirst({
    orderBy: { id: "desc" }
  });
  const userId = (lastUser?.id || 0) + 1;
  const user = await tx.user.create({
    data: {
      id: userId,
      email: data.email,
      password: hashedPassword,
      firstName: data.name.split(" ")[0] || "",
      lastName: data.name.split(" ").slice(1).join(" ") || "",
      phone: data.phone,
      role: data.role || "CLIENT",
      isActive: true
    }
  });
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    },
    token: "",
    // Will be generated by auth service
    message: "User account created successfully"
  };
}

// src/index.ts
var db = {
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================
  users: simplifiedUsers,
  // ============================================================================
  // CUSTOMER OPERATIONS
  // ============================================================================
  customers: simplifiedCustomers,
  // ============================================================================
  // PRODUCT OPERATIONS
  // ============================================================================
  products: simplifiedProducts,
  // ============================================================================
  // ORDER OPERATIONS
  // ============================================================================
  orders: simplifiedOrders,
  // ============================================================================
  // PAYMENT OPERATIONS
  // ============================================================================
  payments: simplifiedPayments,
  // ============================================================================
  // OUTLET OPERATIONS
  // ============================================================================
  outlets: simplifiedOutlets,
  // ============================================================================
  // MERCHANT OPERATIONS
  // ============================================================================
  merchants: simplifiedMerchants,
  // ============================================================================
  // PLAN OPERATIONS
  // ============================================================================
  plans: simplifiedPlans,
  // ============================================================================
  // CATEGORY OPERATIONS
  // ============================================================================
  categories: simplifiedCategories,
  // ============================================================================
  // AUDIT LOG OPERATIONS
  // ============================================================================
  auditLogs: simplifiedAuditLogs,
  // ============================================================================
  // ORDER ITEM OPERATIONS
  // ============================================================================
  orderItems: simplifiedOrderItems,
  // ============================================================================
  // SUBSCRIPTION OPERATIONS
  // ============================================================================
  subscriptions: simplifiedSubscriptions,
  // ============================================================================
  // ORDER NUMBER OPERATIONS
  // ============================================================================
  orderNumbers: simplifiedOrderNumbers,
  // ============================================================================
  // OUTLET STOCK OPERATIONS
  // ============================================================================
  outletStock: {
    /**
     * Aggregate outlet stock statistics
     */
    aggregate: async (options) => {
      return await prisma.outletStock.aggregate(options);
    }
  },
  // ============================================================================
  // SUBSCRIPTION ACTIVITY OPERATIONS
  // ============================================================================
  subscriptionActivities: simplifiedSubscriptionActivities
};
var checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "connected" };
  } catch (error) {
    return { status: "disconnected", error: error instanceof Error ? error.message : "Unknown error" };
  }
};
var generateOrderNumber2 = async (outletId) => {
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true }
  });
  if (!outlet) {
    throw new Error(`Outlet with id ${outletId} not found`);
  }
  const orderCount = await prisma.order.count({
    where: { outletId }
  });
  const sequence = (orderCount + 1).toString().padStart(4, "0");
  return `ORD-${outletId.toString().padStart(3, "0")}-${sequence}`;
};
export {
  AuditLogger,
  checkDatabaseConnection,
  createOrderNumberWithFormat,
  createSubscriptionPayment,
  db,
  extractAuditContext,
  generateOrderNumber2 as generateOrderNumber,
  getAuditLogger,
  getExpiredSubscriptions,
  getOutletOrderStats,
  getSubscriptionById,
  getSubscriptionByMerchantId,
  prisma,
  registerMerchantWithTrial,
  registerUser,
  searchOrders,
  simplifiedPayments,
  simplifiedSubscriptionActivities,
  updateSubscription
};
//# sourceMappingURL=index.mjs.map