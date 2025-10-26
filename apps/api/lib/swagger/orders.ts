/**
 * Swagger documentation for Orders API
 */
import { getApiUrl } from '@rentalshop/utils';

export const orderSwaggerConfig = {
  openapi: '3.0.0',
  info: {
    title: 'Rental Shop Orders API',
    description: 'Comprehensive API for order management including CRUD operations, status updates, and analytics',
    version: '1.0.0',
    contact: {
      name: 'Rental Shop API Support',
      email: 'support@rentalshop.com'
    }
  },
  servers: [
    {
      url: 'https://dev-apis-development.up.railway.app',
      description: 'Development Railway server (Recommended for Local)'
    },
    {
      url: 'https://apis-development.up.railway.app',
      description: 'Production Railway server'
    },
    {
      url: getApiUrl(),
      description: 'Railway API server'
    },
    {
      url: 'http://localhost:3002',
      description: 'Local development server (Fallback)'
    }
  ],
  security: [
    { bearerAuth: [] },
    { 'X-Client-Platform': [] },
    { 'X-Device-Type': [] },
    { 'X-App-Version': [] },
    { 'User-Agent': [] }
  ],
  tags: [
    {
      name: 'Orders',
      description: 'Order management operations'
    },
    {
      name: 'Order Status',
      description: 'Order status management and updates'
    },
    {
      name: 'Order Analytics',
      description: 'Order analytics and reporting'
    }
  ],
  paths: {
    '/api/orders': {
      get: {
        tags: ['Orders'],
        summary: 'Get orders with filtering and pagination',
        description: 'Retrieve orders with various filters including status, merchant, outlet, and date ranges',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED']
            },
            description: 'Filter by order status'
          },
          {
            name: 'outletId',
            in: 'query',
            schema: { type: 'number' },
            description: 'Filter by outlet ID'
          },
          {
            name: 'customerId',
            in: 'query',
            schema: { type: 'number' },
            description: 'Filter by customer ID'
          },
          {
            name: 'productId',
            in: 'query',
            schema: { type: 'number' },
            description: 'Filter by product ID'
          },
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Filter orders from this date'
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Filter orders until this date'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'number', default: 20 },
            description: 'Number of orders to return'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'number', default: 0 },
            description: 'Number of orders to skip'
          }
        ],
        responses: {
          '200': {
            description: 'Orders retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Order' }
                    },
                    total: { type: 'number' },
                    hasMore: { type: 'boolean' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      post: {
        tags: ['Orders'],
        summary: 'Create a new order',
        description: 'Create a new rental or sale order',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderType', 'outletId', 'totalAmount', 'orderItems'],
                properties: {
                  orderType: {
                    type: 'string',
                    enum: ['RENT', 'SALE'],
                    description: 'Type of order',
                    example: 'RENT'
                  },
                  outletId: {
                    type: 'number',
                    description: 'Outlet ID',
                    example: 1
                  },
                  customerId: {
                    type: 'number',
                    description: 'Customer ID (REQUIRED - API will fetch customer details)',
                    example: 28
                  },
                  totalAmount: {
                    type: 'number',
                    description: 'Total order amount',
                    example: 222.0
                  },
                  orderItems: {
                    type: 'array',
                    description: 'Order items (API auto-snapshots product info)',
                    items: {
                      type: 'object',
                      required: ['productId', 'quantity', 'unitPrice'],
                      properties: {
                        productId: {
                          type: 'number',
                          description: 'Product ID (API will snapshot product name, barcode, images)',
                          example: 78
                        },
                        quantity: {
                          type: 'number',
                          minimum: 1,
                          example: 1
                        },
                        unitPrice: {
                          type: 'number',
                          minimum: 0,
                          example: 222.0
                        },
                        totalPrice: {
                          type: 'number',
                          description: 'Total price (optional, API will calculate)',
                          example: 222.0
                        },
                        deposit: {
                          type: 'number',
                          description: 'Deposit amount (optional, default 0)',
                          example: 0.0
                        },
                        notes: {
                          type: 'string',
                          description: 'Item notes (optional)',
                          example: ''
                        }
                      }
                    }
                  },
                  pickupPlanAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Planned pickup date (for RENT orders, API auto-calculates rentalDuration)',
                    example: '2025-10-27T17:00:00.000Z'
                  },
                  returnPlanAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Planned return date (for RENT orders, API auto-calculates rentalDuration)',
                    example: '2025-10-30T17:00:00.000Z'
                  },
                  depositAmount: {
                    type: 'number',
                    description: 'Order deposit amount (optional)',
                    example: 0.0
                  },
                  securityDeposit: {
                    type: 'number',
                    description: 'Security deposit (optional)',
                    example: 55.5
                  },
                  damageFee: {
                    type: 'number',
                    description: 'Damage fee (optional)',
                    example: 0.0
                  },
                  lateFee: {
                    type: 'number',
                    description: 'Late fee (optional)',
                    example: 0.0
                  },
                  discountType: {
                    type: 'string',
                    enum: ['amount', 'percentage'],
                    description: 'Discount type (optional)'
                  },
                  discountValue: {
                    type: 'number',
                    description: 'Discount value (optional)',
                    example: 0.0
                  },
                  discountAmount: {
                    type: 'number',
                    description: 'Discount amount (optional)',
                    example: 0.0
                  },
                  notes: {
                    type: 'string',
                    description: 'Order notes (optional)',
                    example: ''
                  },
                  pickupNotes: {
                    type: 'string',
                    description: 'Pickup notes (optional)',
                    example: ''
                  },
                  isReadyToDeliver: {
                    type: 'boolean',
                    description: 'Ready to deliver flag (optional)',
                    example: false
                  }
                },
                examples: {
                  rentOrder: {
                    summary: 'RENT Order Example',
                    description: 'Example for creating a rental order (RENT type)',
                    value: {
                      orderType: 'RENT',
                      outletId: 1,
                      customerId: 28,
                      totalAmount: 222.0,
                      orderItems: [
                        {
                          productId: 78,
                          quantity: 1,
                          unitPrice: 222.0,
                          totalPrice: 222.0,
                          deposit: 0.0,
                          notes: 'Rental for 3 days'
                        }
                      ],
                      pickupPlanAt: '2025-10-27T17:00:00.000Z',
                      returnPlanAt: '2025-10-30T17:00:00.000Z',
                      depositAmount: 0.0,
                      securityDeposit: 55.5,
                      damageFee: 0.0,
                      lateFee: 0.0,
                      notes: 'Customer requested early pickup',
                      pickupNotes: 'Leave at front desk',
                      isReadyToDeliver: false
                    }
                  },
                  saleOrder: {
                    summary: 'SALE Order Example',
                    description: 'Example for creating a direct sale order (SALE type)',
                    value: {
                      orderType: 'SALE',
                      outletId: 1,
                      customerId: 28,
                      totalAmount: 450.0,
                      orderItems: [
                        {
                          productId: 79,
                          quantity: 1,
                          unitPrice: 450.0,
                          totalPrice: 450.0,
                          deposit: 0.0,
                          notes: 'Direct purchase'
                        }
                      ],
                      depositAmount: 0.0,
                      securityDeposit: 0.0,
                      damageFee: 0.0,
                      lateFee: 0.0,
                      notes: 'Customer paid in full',
                      isReadyToDeliver: true
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Order created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Order' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/orders/{orderId}': {
      get: {
        tags: ['Orders'],
        summary: 'Get order by ID',
        description: 'Retrieve a specific order by its ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'orderId',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Order ID'
          }
        ],
        responses: {
          '200': {
            description: 'Order retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Order' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Order not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      put: {
        tags: ['Orders'],
        summary: 'Update order',
        description: 'Update order details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'orderId',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Order ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED']
                  },
                  notes: { type: 'string' },
                  pickupPlanAt: { type: 'string', format: 'date-time' },
                  returnPlanAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Order updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Order' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/orders/stats': {
      get: {
        tags: ['Order Analytics'],
        summary: 'Get order statistics',
        description: 'Get order statistics and analytics',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Start date for statistics'
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'End date for statistics'
          },
          {
            name: 'outletId',
            in: 'query',
            schema: { type: 'number' },
            description: 'Filter by outlet ID'
          }
        ],
        responses: {
          '200': {
            description: 'Order statistics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        totalOrders: { type: 'number' },
                        totalValue: { type: 'number' },
                        statusBreakdown: {
                          type: 'object',
                          properties: {
                            RESERVED: { type: 'number' },
                            PICKUPED: { type: 'number' },
                            RETURNED: { type: 'number' },
                            COMPLETED: { type: 'number' },
                            CANCELLED: { type: 'number' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from login endpoint'
      },
      'X-Client-Platform': {
        type: 'apiKey',
        in: 'header',
        name: 'X-Client-Platform',
        description: 'Client platform (mobile/web)'
      },
      'X-Device-Type': {
        type: 'apiKey',
        in: 'header',
        name: 'X-Device-Type',
        description: 'Device type (ios/android/browser)'
      },
      'X-App-Version': {
        type: 'apiKey',
        in: 'header',
        name: 'X-App-Version',
        description: 'App version (for mobile)'
      },
      'User-Agent': {
        type: 'apiKey',
        in: 'header',
        name: 'User-Agent',
        description: 'Client user agent'
      }
    },
    schemas: {
      Order: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          orderNumber: { type: 'string' },
          orderType: {
            type: 'string',
            enum: ['RENT', 'SALE']
          },
          status: {
            type: 'string',
            enum: ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED']
          },
          outletId: { type: 'number' },
          customerId: { type: 'number', nullable: true },
          totalAmount: { type: 'number' },
          depositAmount: { type: 'number' },
          pickupPlanAt: { type: 'string', format: 'date-time', nullable: true },
          returnPlanAt: { type: 'string', format: 'date-time', nullable: true },
          pickedUpAt: { type: 'string', format: 'date-time', nullable: true },
          returnedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          orderItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                productId: { type: 'number' },
                quantity: { type: 'number' },
                unitPrice: { type: 'number' },
                totalPrice: { type: 'number' },
                product: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    name: { type: 'string' },
                    barcode: { type: 'string', nullable: true }
                  }
                }
              }
            }
          },
          customer: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'number' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              phone: { type: 'string' }
            }
          },
          outlet: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' }
            }
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          code: { type: 'string' },
          errors: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    }
  }
};
