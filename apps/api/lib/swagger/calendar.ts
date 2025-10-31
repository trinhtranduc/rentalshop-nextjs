/**
 * Swagger documentation for Calendar APIs
 */
export const calendarSwaggerConfig = {
  paths: {
    '/api/calendar/orders': {
      get: {
        tags: ['Calendar'],
        summary: 'Get calendar orders',
        description: 'Retrieve orders grouped by date for calendar display with pickup and return schedules',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            description: 'Start date for calendar range (ISO 8601 format)',
            required: true,
            schema: { 
              type: 'string', 
              format: 'date',
              example: '2025-01-01'
            }
          },
          {
            name: 'endDate',
            in: 'query',
            description: 'End date for calendar range (ISO 8601 format)',
            required: true,
            schema: { 
              type: 'string', 
              format: 'date',
              example: '2025-01-31'
            }
          },
          {
            name: 'outletId',
            in: 'query',
            description: 'Filter by specific outlet',
            schema: { type: 'string' }
          },
          {
            name: 'merchantId',
            in: 'query',
            description: 'Filter by specific merchant',
            schema: { type: 'string' }
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by order status',
            schema: { 
              type: 'string',
              enum: ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED']
            }
          },
          {
            name: 'orderType',
            in: 'query',
            description: 'Filter by order type',
            schema: { 
              type: 'string',
              enum: ['RENT', 'SALE']
            }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of orders per day (default: 10)',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
          }
        ],
        responses: {
          '200': {
            description: 'Calendar orders retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        calendar: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/CalendarDay' }
                        },
                        summary: {
                          type: 'object',
                          properties: {
                            totalOrders: { type: 'integer' },
                            totalRevenue: { type: 'number' },
                            totalPickups: { type: 'integer' },
                            totalReturns: { type: 'integer' },
                            averageOrderValue: { type: 'number' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
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
    }
  },
  components: {
    schemas: {
      CalendarDay: {
        type: 'object',
        properties: {
          date: { 
            type: 'string', 
            format: 'date',
            description: 'Date in YYYY-MM-DD format'
          },
          orders: {
            type: 'array',
            items: { $ref: '#/components/schemas/CalendarOrderSummary' }
          },
          summary: {
            type: 'object',
            properties: {
              totalOrders: { type: 'integer' },
              totalRevenue: { type: 'number' },
              totalPickups: { type: 'integer' },
              totalReturns: { type: 'integer' },
              averageOrderValue: { type: 'number' }
            }
          }
        }
      },
      CalendarOrderSummary: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          orderNumber: { type: 'string' },
          customerName: { type: 'string' },
          customerPhone: { type: 'string' },
          totalAmount: { type: 'number' },
          status: { 
            type: 'string',
            enum: ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED']
          },
          outletName: { type: 'string' },
          notes: { type: 'string' },
          pickupPlanAt: { 
            type: 'string', 
            format: 'date-time',
            description: 'Planned pickup date and time'
          },
          returnPlanAt: { 
            type: 'string', 
            format: 'date-time',
            description: 'Planned return date and time'
          },
          isOverdue: { type: 'boolean' },
          duration: { type: 'integer', description: 'Duration in days' },
          orderItems: {
            type: 'array',
            items: { $ref: '#/components/schemas/CalendarOrderItem' }
          }
        }
      },
      CalendarOrderItem: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          quantity: { type: 'integer' },
          unitPrice: { type: 'number' },
          totalPrice: { type: 'number' },
          notes: { type: 'string' },
          // Flattened product data
          productId: { type: 'integer' },
          productName: { type: 'string' },
          productBarcode: { type: 'string' },
          productImages: { 
            type: 'array',
            items: { type: 'string' }
          },
          productRentPrice: { type: 'number' },
          productDeposit: { type: 'number' }
        }
      }
    }
  }
};
