// Swagger documentation for product availability APIs

export const productAvailabilitySwagger = {
  '/api/products/availability': {
    get: {
      tags: ['Products'],
      summary: 'Check product availability for a specific date',
      description: 'Get product availability information including stock, rented quantity, and orders for a specific date',
      parameters: [
        {
          name: 'productId',
          in: 'query',
          required: true,
          schema: { type: 'number' },
          description: 'Product ID to check availability for'
        },
        {
          name: 'date',
          in: 'query',
          required: true,
          schema: { type: 'string', format: 'date' },
          description: 'Date to check availability (YYYY-MM-DD format)'
        },
        {
          name: 'outletId',
          in: 'query',
          required: false,
          schema: { type: 'number' },
          description: 'Outlet ID (required for merchants/admins, optional for outlet users - uses assigned outlet if not provided)'
        }
      ],
      responses: {
        200: {
          description: 'Product availability information retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  code: { type: 'string', example: 'PRODUCT_AVAILABILITY_FOUND' },
                  message: { type: 'string', example: 'Product availability information retrieved successfully' },
                  data: {
                    type: 'object',
                    properties: {
                      product: {
                        type: 'object',
                        properties: {
                          id: { type: 'number', example: 1 },
                          name: { type: 'string', example: 'Product 2 - Electronics' },
                          barcode: { type: 'string', example: 'BAR000002' },
                          outletId: { type: 'number', example: 1 },
                          outletName: { type: 'string', example: 'Main Branch' }
                        }
                      },
                      date: { type: 'string', example: '2025-01-15' },
                      summary: {
                        type: 'object',
                        properties: {
                          totalStock: { type: 'number', example: 10 },
                          totalRented: { type: 'number', example: 3 },
                          totalReserved: { type: 'number', example: 2 },
                          totalAvailable: { type: 'number', example: 5 },
                          isAvailable: { type: 'boolean', example: true }
                        }
                      },
                      orders: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'number', example: 1 },
                            orderNumber: { type: 'string', example: 'ORD-001-0001' },
                            orderType: { type: 'string', example: 'RENT' },
                            status: { type: 'string', example: 'PICKUPED' },
                            customerName: { type: 'string', example: 'John Smith' },
                            customerPhone: { type: 'string', example: '+1-555-1000' },
                            pickupPlanAt: { type: 'string', format: 'date-time' },
                            returnPlanAt: { type: 'string', format: 'date-time' },
                            pickedUpAt: { type: 'string', format: 'date-time' },
                            returnedAt: { type: 'string', format: 'date-time' },
                            orderItems: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  id: { type: 'number', example: 1 },
                                  quantity: { type: 'number', example: 2 },
                                  unitPrice: { type: 'number', example: 50.00 },
                                  totalPrice: { type: 'number', example: 100.00 },
                                  product: {
                                    type: 'object',
                                    properties: {
                                      id: { type: 'number', example: 1 },
                                      name: { type: 'string', example: 'Product 2 - Electronics' },
                                      barcode: { type: 'string', example: 'BAR000002' }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      meta: {
                        type: 'object',
                        properties: {
                          totalOrders: { type: 'number', example: 5 },
                          date: { type: 'string', example: '2025-01-15' },
                          checkedAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - Invalid parameters',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  code: { type: 'string', example: 'VALIDATION_ERROR' },
                  message: { type: 'string', example: 'Invalid parameters' },
                  error: { type: 'object' }
                }
              }
            }
          }
        },
        404: {
          description: 'Product not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  code: { type: 'string', example: 'PRODUCT_NOT_FOUND' },
                  message: { type: 'string', example: 'Product not found' }
                }
              }
            }
          }
        },
        401: {
          description: 'Unauthorized - Invalid or expired token',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  code: { type: 'string', example: 'UNAUTHORIZED' },
                  message: { type: 'string', example: 'Invalid or expired token' }
                }
              }
            }
          }
        },
        403: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  code: { type: 'string', example: 'FORBIDDEN' },
                  message: { type: 'string', example: 'Insufficient permissions' }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/products/{id}/availability': {
    get: {
      tags: ['Products'],
      summary: 'Check product availability with precise time analysis',
      description: 'Advanced product availability checking with precise time analysis, conflict detection, and timezone support. Ideal for booking systems and detailed scheduling.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'number' },
          description: 'Product ID to check availability for'
        },
        {
          name: 'date',
          in: 'query',
          required: false,
          schema: { type: 'string', format: 'date' },
          description: 'Single date to check availability (YYYY-MM-DD format) - checks entire day'
        },
        {
          name: 'startDate',
          in: 'query',
          required: false,
          schema: { type: 'string', format: 'date-time' },
          description: 'Start date/time for rental period (ISO datetime format)'
        },
        {
          name: 'endDate',
          in: 'query',
          required: false,
          schema: { type: 'string', format: 'date-time' },
          description: 'End date/time for rental period (ISO datetime format)'
        },
        {
          name: 'quantity',
          in: 'query',
          required: false,
          schema: { type: 'number', minimum: 1, default: 1 },
          description: 'Number of items requested (default: 1)'
        },
        {
          name: 'includeTimePrecision',
          in: 'query',
          required: false,
          schema: { type: 'boolean', default: true },
          description: 'Enable precise hour/minute checking (default: true)'
        },
        {
          name: 'timeZone',
          in: 'query',
          required: false,
          schema: { type: 'string', default: 'UTC' },
          description: 'Timezone for time calculations (default: UTC)'
        },
        {
          name: 'outletId',
          in: 'query',
          required: false,
          schema: { type: 'number' },
          description: 'Outlet ID (required for merchants/admins, optional for outlet users - uses assigned outlet if not provided)'
        }
      ],
      responses: {
        200: {
          description: 'Product availability information retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  code: { type: 'string', example: 'PRODUCT_AVAILABILITY_FOUND' },
                  message: { type: 'string', example: 'Product availability information retrieved successfully' },
                  data: {
                    type: 'object',
                    properties: {
                      product: {
                        type: 'object',
                        properties: {
                          id: { type: 'number', example: 1 },
                          name: { type: 'string', example: 'Product 2 - Electronics' },
                          barcode: { type: 'string', example: 'BAR000002' },
                          outletId: { type: 'number', example: 1 },
                          outletName: { type: 'string', example: 'Main Branch' }
                        }
                      },
                      date: { type: 'string', example: '2025-01-15' },
                      summary: {
                        type: 'object',
                        properties: {
                          totalStock: { type: 'number', example: 10 },
                          totalRented: { type: 'number', example: 3 },
                          totalReserved: { type: 'number', example: 2 },
                          totalAvailable: { type: 'number', example: 5 },
                          isAvailable: { type: 'boolean', example: true }
                        }
                      },
                      orders: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'number', example: 1 },
                            orderNumber: { type: 'string', example: 'ORD-001-0001' },
                            orderType: { type: 'string', example: 'RENT' },
                            status: { type: 'string', example: 'PICKUPED' },
                            customerName: { type: 'string', example: 'John Smith' },
                            customerPhone: { type: 'string', example: '+1-555-1000' },
                            pickupPlanAt: { type: 'string', format: 'date-time' },
                            returnPlanAt: { type: 'string', format: 'date-time' },
                            pickedUpAt: { type: 'string', format: 'date-time' },
                            returnedAt: { type: 'string', format: 'date-time' },
                            orderItems: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  id: { type: 'number', example: 1 },
                                  quantity: { type: 'number', example: 2 },
                                  unitPrice: { type: 'number', example: 50.00 },
                                  totalPrice: { type: 'number', example: 100.00 },
                                  product: {
                                    type: 'object',
                                    properties: {
                                      id: { type: 'number', example: 1 },
                                      name: { type: 'string', example: 'Product 2 - Electronics' },
                                      barcode: { type: 'string', example: 'BAR000002' }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      meta: {
                        type: 'object',
                        properties: {
                          totalOrders: { type: 'number', example: 5 },
                          date: { type: 'string', example: '2025-01-15' },
                          checkedAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - Invalid parameters',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  code: { type: 'string', example: 'VALIDATION_ERROR' },
                  message: { type: 'string', example: 'Invalid parameters' },
                  error: { type: 'object' }
                }
              }
            }
          }
        },
        404: {
          description: 'Product not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  code: { type: 'string', example: 'PRODUCT_NOT_FOUND' },
                  message: { type: 'string', example: 'Product not found' }
                }
              }
            }
          }
        },
        401: {
          description: 'Unauthorized - Invalid or expired token',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  code: { type: 'string', example: 'UNAUTHORIZED' },
                  message: { type: 'string', example: 'Invalid or expired token' }
                }
              }
            }
          }
        },
        403: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  code: { type: 'string', example: 'FORBIDDEN' },
                  message: { type: 'string', example: 'Insufficient permissions' }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/products/{id}/availability': {
    get: {
      tags: ['Products'],
      summary: 'Check product availability with precise time analysis',
      description: 'Advanced product availability checking with precise time analysis, conflict detection, and timezone support. Ideal for booking systems and detailed scheduling.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'number' },
          description: 'Product ID to check availability for'
        },
        {
          name: 'startDate',
          in: 'query',
          required: true,
          schema: { type: 'string', format: 'date-time' },
          description: 'Start date/time for rental period (ISO datetime format)'
        },
        {
          name: 'endDate',
          in: 'query',
          required: true,
          schema: { type: 'string', format: 'date-time' },
          description: 'End date/time for rental period (ISO datetime format)'
        },
        {
          name: 'quantity',
          in: 'query',
          required: false,
          schema: { type: 'number', minimum: 1, default: 1 },
          description: 'Number of items requested (default: 1)'
        },
        {
          name: 'includeTimePrecision',
          in: 'query',
          required: false,
          schema: { type: 'boolean', default: true },
          description: 'Enable precise hour/minute checking (default: true)'
        },
        {
          name: 'timeZone',
          in: 'query',
          required: false,
          schema: { type: 'string', default: 'UTC' },
          description: 'Timezone for time calculations (default: UTC)'
        },
        {
          name: 'outletId',
          in: 'query',
          required: false,
          schema: { type: 'number' },
          description: 'Outlet ID (required for merchants/admins, optional for outlet users - uses assigned outlet if not provided)'
        }
      ],
      responses: {
        200: {
          description: 'Product availability information retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  code: { type: 'string', example: 'AVAILABILITY_CHECKED' },
                  message: { type: 'string', example: 'Available for rental from 1/15/2025, 9:00:00 AM to 1/15/2025, 5:00:00 PM (8 hours)' },
                  data: {
                    type: 'object',
                    properties: {
                      productId: { type: 'number', example: 1 },
                      productName: { type: 'string', example: 'Product 2 - Electronics' },
                      totalStock: { type: 'number', example: 10 },
                      totalAvailableStock: { type: 'number', example: 7 },
                      totalRenting: { type: 'number', example: 3 },
                      requestedQuantity: { type: 'number', example: 2 },
                      rentalPeriod: {
                        type: 'object',
                        properties: {
                          startDate: { type: 'string', format: 'date-time' },
                          endDate: { type: 'string', format: 'date-time' },
                          startDateLocal: { type: 'string', example: '1/15/2025, 9:00:00 AM' },
                          endDateLocal: { type: 'string', example: '1/15/2025, 5:00:00 PM' },
                          durationMs: { type: 'number', example: 28800000 },
                          durationHours: { type: 'number', example: 8 },
                          durationDays: { type: 'number', example: 1 },
                          timeZone: { type: 'string', example: 'UTC' },
                          includeTimePrecision: { type: 'boolean', example: true }
                        }
                      },
                      isAvailable: { type: 'boolean', example: true },
                      stockAvailable: { type: 'boolean', example: true },
                      hasNoConflicts: { type: 'boolean', example: false },
                      availabilityByOutlet: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            outletId: { type: 'number', example: 1 },
                            outletName: { type: 'string', example: 'Main Branch' },
                            stock: { type: 'number', example: 10 },
                            available: { type: 'number', example: 7 },
                            renting: { type: 'number', example: 3 },
                            conflictingQuantity: { type: 'number', example: 2 },
                            effectivelyAvailable: { type: 'number', example: 5 },
                            canFulfillRequest: { type: 'boolean', example: true },
                            conflicts: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  orderNumber: { type: 'string', example: 'ORD-001-0001' },
                                  customerName: { type: 'string', example: 'John Smith' },
                                  pickupDate: { type: 'string', format: 'date-time' },
                                  returnDate: { type: 'string', format: 'date-time' },
                                  pickupDateLocal: { type: 'string', example: '1/15/2025, 10:00:00 AM' },
                                  returnDateLocal: { type: 'string', example: '1/15/2025, 4:00:00 PM' },
                                  quantity: { type: 'number', example: 2 },
                                  conflictDuration: { type: 'number', example: 21600000 },
                                  conflictHours: { type: 'number', example: 6 },
                                  conflictType: { type: 'string', example: 'period_overlap' }
                                }
                              }
                            }
                          }
                        }
                      },
                      bestOutlet: {
                        type: 'object',
                        properties: {
                          outletId: { type: 'number', example: 1 },
                          outletName: { type: 'string', example: 'Main Branch' },
                          effectivelyAvailable: { type: 'number', example: 5 }
                        }
                      },
                      totalConflictsFound: { type: 'number', example: 1 },
                      message: { type: 'string', example: 'Available for rental from 1/15/2025, 9:00:00 AM to 1/15/2025, 5:00:00 PM (8 hours)' }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - Invalid parameters',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  code: { type: 'string', example: 'VALIDATION_ERROR' },
                  message: { type: 'string', example: 'Invalid parameters' },
                  error: { type: 'object' }
                }
              }
            }
          }
        },
        404: {
          description: 'Product not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  code: { type: 'string', example: 'PRODUCT_NOT_FOUND' },
                  message: { type: 'string', example: 'Product not found' }
                }
              }
            }
          }
        },
        401: {
          description: 'Unauthorized - Invalid or expired token',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  code: { type: 'string', example: 'UNAUTHORIZED' },
                  message: { type: 'string', example: 'Invalid or expired token' }
                }
              }
            }
          }
        },
        403: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  code: { type: 'string', example: 'FORBIDDEN' },
                  message: { type: 'string', example: 'Insufficient permissions' }
                }
              }
            }
          }
        }
      }
    }
  }
};

export default productAvailabilitySwagger;