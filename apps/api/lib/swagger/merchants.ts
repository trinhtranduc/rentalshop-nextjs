/**
 * Swagger documentation for Merchants API
 */
import { getApiUrl } from '@rentalshop/utils';

export const merchantSwaggerConfig = {
  openapi: '3.0.0',
  info: {
    title: 'Rental Shop Merchants API',
    description: 'Comprehensive API for merchant management including CRUD operations, subscription management, and analytics',
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
  tags: [
    {
      name: 'Merchants',
      description: 'Merchant management operations'
    },
    {
      name: 'Merchant Subscriptions',
      description: 'Merchant subscription and plan management'
    },
    {
      name: 'Merchant Analytics',
      description: 'Merchant analytics and reporting'
    }
  ],
  paths: {
    '/api/merchants': {
      get: {
        tags: ['Merchants'],
        summary: 'Get merchants with filtering and pagination',
        description: 'Retrieve merchants with various filters including status, plan, and search terms',
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
            name: 'q',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search query for merchant name, email, or phone'
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['active', 'inactive', 'trial', 'expired'] },
            description: 'Filter by merchant status'
          },
          {
            name: 'plan',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by subscription plan'
          },
          {
            name: 'isActive',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filter by active status'
          },
          {
            name: 'subscriptionStatus',
            in: 'query',
            schema: { type: 'string', enum: ['active', 'trial', 'expired', 'cancelled'] },
            description: 'Filter by subscription status'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'number', default: 10 },
            description: 'Number of merchants to return'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'number', default: 0 },
            description: 'Number of merchants to skip'
          }
        ],
        responses: {
          '200': {
            description: 'Merchants retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Merchant' }
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
        tags: ['Merchants'],
        summary: 'Create a new merchant',
        description: 'Create a new merchant account',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['companyName', 'email', 'phone'],
                properties: {
                  companyName: {
                    type: 'string',
                    description: 'Company name'
                  },
                  name: {
                    type: 'string',
                    description: 'Contact person name'
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'Contact email'
                  },
                  phone: {
                    type: 'string',
                    description: 'Contact phone number'
                  },
                  address: {
                    type: 'string',
                    description: 'Business address'
                  },
                  businessType: {
                    type: 'string',
                    enum: ['INDIVIDUAL', 'COMPANY'],
                    description: 'Type of business'
                  },
                  description: {
                    type: 'string',
                    description: 'Business description'
                  },
                  isActive: {
                    type: 'boolean',
                    default: true,
                    description: 'Whether merchant is active'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Merchant created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Merchant' }
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
    '/api/merchants/{merchantId}': {
      get: {
        tags: ['Merchants'],
        summary: 'Get merchant by ID',
        description: 'Retrieve a specific merchant by its ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'merchantId',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Merchant ID'
          }
        ],
        responses: {
          '200': {
            description: 'Merchant retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Merchant' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Merchant not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      put: {
        tags: ['Merchants'],
        summary: 'Update merchant',
        description: 'Update merchant details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'merchantId',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Merchant ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  companyName: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  address: { type: 'string' },
                  businessType: { type: 'string', enum: ['INDIVIDUAL', 'COMPANY'] },
                  description: { type: 'string' },
                  isActive: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Merchant updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Merchant' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Merchants'],
        summary: 'Delete merchant',
        description: 'Delete a merchant (soft delete)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'merchantId',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Merchant ID'
          }
        ],
        responses: {
          '200': {
            description: 'Merchant deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Merchant deleted successfully' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/merchants/{merchantId}/plan': {
      get: {
        tags: ['Merchant Subscriptions'],
        summary: 'Get merchant subscription plan',
        description: 'Get current subscription plan for a merchant',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'merchantId',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Merchant ID'
          }
        ],
        responses: {
          '200': {
            description: 'Subscription plan retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Subscription' }
                  }
                }
              }
            }
          }
        }
      },
      put: {
        tags: ['Merchant Subscriptions'],
        summary: 'Update merchant subscription plan',
        description: 'Update or change merchant subscription plan',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'merchantId',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Merchant ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['planId'],
                properties: {
                  planId: {
                    type: 'number',
                    description: 'New plan ID'
                  },
                  startDate: {
                    type: 'string',
                    format: 'date',
                    description: 'Plan start date'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Subscription plan updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Subscription' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/merchants/{merchantId}/orders': {
      get: {
        tags: ['Merchants'],
        summary: 'Get merchant orders',
        description: 'Get all orders for a specific merchant',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'merchantId',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Merchant ID'
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
            description: 'Merchant orders retrieved successfully',
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
                    total: { type: 'number' }
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
      Merchant: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          companyName: { type: 'string' },
          name: { type: 'string', nullable: true },
          email: { type: 'string' },
          phone: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          businessType: {
            type: 'string',
            enum: ['INDIVIDUAL', 'COMPANY']
          },
          description: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          outlets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' }
              }
            }
          },
          subscription: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'number' },
              status: {
                type: 'string',
                enum: ['active', 'trial', 'expired', 'cancelled']
              },
              plan: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' }
                }
              }
            }
          }
        }
      },
      Subscription: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          status: {
            type: 'string',
            enum: ['active', 'trial', 'expired', 'cancelled']
          },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date', nullable: true },
          plan: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              description: { type: 'string', nullable: true }
            }
          },
          merchant: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              companyName: { type: 'string' }
            }
          }
        }
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          orderNumber: { type: 'string' },
          orderType: { type: 'string', enum: ['RENT', 'SALE'] },
          status: { type: 'string' },
          totalAmount: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' }
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
