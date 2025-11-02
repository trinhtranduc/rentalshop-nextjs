/**
 * Swagger documentation for Analytics API
 */
import { getApiUrl } from '@rentalshop/utils';

export const analyticsSwaggerConfig = {
  openapi: '3.0.0',
  info: {
    title: 'Rental Shop Analytics API',
    description: 'Comprehensive analytics API for dashboard, reporting, and business intelligence',
    version: '1.0.0',
    contact: {
      name: 'Rental Shop API Support',
      email: 'support@rentalshop.com'
    }
  },
  servers: [
    {
      url: 'https://api.anyrent.shop',
      description: 'Production server'
    },
    {
      url: 'https://dev-api.anyrent.shop',
      description: 'Development server'
    },
    {
      url: getApiUrl(),
      description: 'Current server'
    },
    {
      url: 'http://localhost:3002',
      description: 'Local development server'
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
      name: 'Dashboard Analytics',
      description: 'Main dashboard analytics and metrics'
    },
    {
      name: 'Order Analytics',
      description: 'Order-related analytics and reporting'
    },
    {
      name: 'Revenue Analytics',
      description: 'Revenue and income analytics'
    },
    {
      name: 'System Analytics',
      description: 'System-wide analytics (Admin only)'
    }
  ],
  paths: {
    '/api/analytics/dashboard': {
      get: {
        tags: ['Dashboard Analytics'],
        summary: 'Get dashboard analytics',
        description: 'Get comprehensive dashboard analytics with role-based data filtering',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Start date for analytics'
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'End date for analytics'
          }
        ],
        responses: {
          '200': {
            description: 'Dashboard analytics retrieved successfully',
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
                        totalRevenue: { type: 'number' },
                        totalCustomers: { type: 'number' },
                        totalProducts: { type: 'number' },
                        ordersByStatus: {
                          type: 'object',
                          properties: {
                            RESERVED: { type: 'number' },
                            PICKUPED: { type: 'number' },
                            RETURNED: { type: 'number' },
                            COMPLETED: { type: 'number' },
                            CANCELLED: { type: 'number' }
                          }
                        },
                        revenueByPeriod: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              period: { type: 'string' },
                              revenue: { type: 'number' }
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
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/analytics/enhanced-dashboard': {
      get: {
        tags: ['Dashboard Analytics'],
        summary: 'Get enhanced dashboard analytics',
        description: 'Get comprehensive enhanced dashboard analytics with detailed metrics',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Start date for analytics'
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'End date for analytics'
          }
        ],
        responses: {
          '200': {
            description: 'Enhanced dashboard analytics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        todayMetrics: {
                          type: 'object',
                          properties: {
                            orders: { type: 'number' },
                            revenue: { type: 'number' },
                            customers: { type: 'number' }
                          }
                        },
                        thisMonthMetrics: {
                          type: 'object',
                          properties: {
                            orders: { type: 'number' },
                            revenue: { type: 'number' },
                            growth: { type: 'number' }
                          }
                        },
                        topProducts: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              productId: { type: 'number' },
                              name: { type: 'string' },
                              orders: { type: 'number' },
                              revenue: { type: 'number' }
                            }
                          }
                        },
                        recentOrders: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/OrderSummary' }
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
    '/api/analytics/orders': {
      get: {
        tags: ['Order Analytics'],
        summary: 'Get order analytics',
        description: 'Get detailed order analytics and statistics',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Start date for order analytics'
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'End date for order analytics'
          },
          {
            name: 'groupBy',
            in: 'query',
            schema: { type: 'string', enum: ['month', 'day'], default: 'month' },
            description: 'Group results by time period'
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
            description: 'Order analytics retrieved successfully',
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
                        statusBreakdown: {
                          type: 'object',
                          properties: {
                            RESERVED: { type: 'number' },
                            PICKUPED: { type: 'number' },
                            RETURNED: { type: 'number' },
                            COMPLETED: { type: 'number' },
                            CANCELLED: { type: 'number' }
                          }
                        },
                        groupedData: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              period: { type: 'string' },
                              orders: { type: 'number' },
                              revenue: { type: 'number' }
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
    '/api/analytics/income': {
      get: {
        tags: ['Revenue Analytics'],
        summary: 'Get income analytics',
        description: 'Get detailed income and revenue analytics',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date' },
            description: 'Start date for income analytics'
          },
          {
            name: 'endDate',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date' },
            description: 'End date for income analytics'
          },
          {
            name: 'groupBy',
            in: 'query',
            schema: { type: 'string', enum: ['month', 'day'], default: 'month' },
            description: 'Group results by time period'
          }
        ],
        responses: {
          '200': {
            description: 'Income analytics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        totalIncome: { type: 'number' },
                        averageDaily: { type: 'number' },
                        incomeByPeriod: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              period: { type: 'string' },
                              income: { type: 'number' },
                              orders: { type: 'number' }
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
    '/api/analytics/system': {
      get: {
        tags: ['System Analytics'],
        summary: 'Get system analytics (Admin only)',
        description: 'Get system-wide analytics and statistics. Requires ADMIN role.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Start date for system analytics'
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'End date for system analytics'
          }
        ],
        responses: {
          '200': {
            description: 'System analytics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        totalMerchants: { type: 'number' },
                        totalOutlets: { type: 'number' },
                        totalUsers: { type: 'number' },
                        totalProducts: { type: 'number' },
                        totalCustomers: { type: 'number' },
                        totalOrders: { type: 'number' },
                        totalRevenue: { type: 'number' },
                        activeMerchants: { type: 'number' },
                        newMerchantsThisMonth: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/analytics/top-products': {
      get: {
        tags: ['Order Analytics'],
        summary: 'Get top products analytics',
        description: 'Get analytics for top performing products',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Start date for top products analytics'
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'End date for top products analytics'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'number', default: 10 },
            description: 'Number of top products to return'
          }
        ],
        responses: {
          '200': {
            description: 'Top products analytics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          productId: { type: 'number' },
                          name: { type: 'string' },
                          orders: { type: 'number' },
                          revenue: { type: 'number' },
                          rentedDays: { type: 'number' }
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
    '/api/analytics/today-metrics': {
      get: {
        tags: ['Dashboard Analytics'],
        summary: 'Get today metrics',
        description: 'Get key metrics for today',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Today metrics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        todayOrders: { type: 'number' },
                        todayRevenue: { type: 'number' },
                        todayCustomers: { type: 'number' },
                        activeRentals: { type: 'number' },
                        returnsToday: { type: 'number' }
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
      OrderSummary: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          orderNumber: { type: 'string' },
          status: { type: 'string' },
          totalAmount: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          customer: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' }
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
