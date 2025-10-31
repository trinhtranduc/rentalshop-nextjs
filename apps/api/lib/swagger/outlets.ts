/**
 * Swagger documentation for Outlets API
 */
import { getApiUrl } from '@rentalshop/utils';

export const outletSwaggerConfig = {
  openapi: '3.0.0',
  info: {
    title: 'Rental Shop Outlets API',
    description: 'Comprehensive API for outlet management including CRUD operations and analytics',
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
  tags: [
    {
      name: 'Outlets',
      description: 'Outlet management operations'
    },
    {
      name: 'Outlet Analytics',
      description: 'Outlet analytics and reporting'
    }
  ],
  paths: {
    '/api/outlets': {
      get: {
        tags: ['Outlets'],
        summary: 'Get outlets with filtering and pagination',
        description: 'Retrieve outlets with various filters including merchant, status, and search terms',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Client-Platform',
            in: 'header',
            required: false,
            schema: {
              type: 'string',
              enum: ['mobile', 'web'],
              example: 'web'
            },
            description: 'Client platform (mobile/web)'
          },
          {
            name: 'X-Device-Type',
            in: 'header',
            required: false,
            schema: {
              type: 'string',
              enum: ['ios', 'android', 'browser'],
              example: 'browser'
            },
            description: 'Device type (ios/android/browser)'
          },
          {
            name: 'X-App-Version',
            in: 'header',
            required: false,
            schema: {
              type: 'string',
              example: '1.0.0'
            },
            description: 'App version (for mobile)'
          },
          {
            name: 'User-Agent',
            in: 'header',
            required: false,
            schema: {
              type: 'string',
              example: 'RentalShop-Web/1.0.0'
            },
            description: 'Client user agent'
          },
          {
            name: 'merchantId',
            in: 'query',
            schema: { type: 'number' },
            description: 'Filter by merchant ID'
          },
          {
            name: 'isActive',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filter by active status'
          },
          {
            name: 'q',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search query for outlet name or address'
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Alternative search parameter'
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: { type: 'string', default: 'createdAt' },
            description: 'Sort field'
          },
          {
            name: 'sortOrder',
            in: 'query',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            description: 'Sort order'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'number', default: 20 },
            description: 'Number of outlets to return'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'number', default: 0 },
            description: 'Number of outlets to skip'
          }
        ],
        responses: {
          '200': {
            description: 'Outlets retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Outlet' }
                    },
                    total: { type: 'number' },
                    hasMore: { type: 'boolean' },
                    page: { type: 'number' },
                    limit: { type: 'number' }
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
        tags: ['Outlets'],
        summary: 'Create a new outlet',
        description: 'Create a new outlet for a merchant',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'address', 'merchantId'],
                properties: {
                  name: {
                    type: 'string',
                    description: 'Outlet name'
                  },
                  address: {
                    type: 'string',
                    description: 'Outlet address'
                  },
                  phone: {
                    type: 'string',
                    description: 'Outlet phone number'
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'Outlet email'
                  },
                  merchantId: {
                    type: 'number',
                    description: 'Merchant ID'
                  },
                  isActive: {
                    type: 'boolean',
                    default: true,
                    description: 'Whether outlet is active'
                  },
                  description: {
                    type: 'string',
                    description: 'Outlet description'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Outlet created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Outlet' }
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
    '/api/outlets/{outletId}': {
      get: {
        tags: ['Outlets'],
        summary: 'Get outlet by ID',
        description: 'Retrieve a specific outlet by its ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'outletId',
            in: 'query',
            required: true,
            schema: { type: 'number' },
            description: 'Outlet ID'
          }
        ],
        responses: {
          '200': {
            description: 'Outlet retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Outlet' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Outlet not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      put: {
        tags: ['Outlets'],
        summary: 'Update outlet',
        description: 'Update outlet details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'outletId',
            in: 'query',
            required: true,
            schema: { type: 'number' },
            description: 'Outlet ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  address: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  isActive: { type: 'boolean' },
                  description: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Outlet updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Outlet' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Outlets'],
        summary: 'Delete outlet',
        description: 'Delete an outlet (soft delete)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'outletId',
            in: 'query',
            required: true,
            schema: { type: 'number' },
            description: 'Outlet ID'
          }
        ],
        responses: {
          '200': {
            description: 'Outlet deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Outlet deleted successfully' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/outlets/stats': {
      get: {
        tags: ['Outlet Analytics'],
        summary: 'Get outlet statistics',
        description: 'Get outlet statistics and analytics',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'merchantId',
            in: 'query',
            schema: { type: 'number' },
            description: 'Filter by merchant ID'
          },
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
          }
        ],
        responses: {
          '200': {
            description: 'Outlet statistics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        totalOutlets: { type: 'number' },
                        activeOutlets: { type: 'number' },
                        totalOrders: { type: 'number' },
                        totalRevenue: { type: 'number' }
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
      }
    },
    schemas: {
      Outlet: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          address: { type: 'string' },
          phone: { type: 'string', nullable: true },
          email: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          description: { type: 'string', nullable: true },
          merchantId: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          merchant: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              companyName: { type: 'string' }
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
