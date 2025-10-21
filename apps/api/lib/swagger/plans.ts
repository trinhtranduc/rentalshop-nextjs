/**
 * Swagger documentation for Plans API
 */
import { getApiUrl } from '@rentalshop/utils';

export const planSwaggerConfig = {
  openapi: '3.0.0',
  info: {
    title: 'Rental Shop Plans API',
    description: 'Comprehensive API for subscription plan management including CRUD operations and analytics',
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
      name: 'Plans',
      description: 'Subscription plan management operations'
    },
    {
      name: 'Plan Statistics',
      description: 'Plan analytics and statistics'
    }
  ],
  paths: {
    '/api/plans': {
      get: {
        tags: ['Plans'],
        summary: 'Get plans with filtering and pagination',
        description: 'Retrieve subscription plans with various filters including status, popularity, and search terms. Admin only.',
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
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search query for plan name or description'
          },
          {
            name: 'isActive',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filter by active status'
          },
          {
            name: 'isPopular',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filter by popular status'
          },
          {
            name: 'includeInactive',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Include inactive plans in results'
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: { 
              type: 'string', 
              enum: ['name', 'price', 'basePrice', 'createdAt', 'sortOrder'],
              default: 'sortOrder'
            },
            description: 'Sort field'
          },
          {
            name: 'sortOrder',
            in: 'query',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
            description: 'Sort order'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'number', default: 50 },
            description: 'Number of plans to return'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'number', default: 0 },
            description: 'Number of plans to skip'
          }
        ],
        responses: {
          '200': {
            description: 'Plans retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        plans: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Plan' }
                        },
                        total: { type: 'number' },
                        hasMore: { type: 'boolean' }
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
      },
      post: {
        tags: ['Plans'],
        summary: 'Create a new plan',
        description: 'Create a new subscription plan. Admin only.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'price', 'basePrice'],
                properties: {
                  name: {
                    type: 'string',
                    description: 'Plan name'
                  },
                  description: {
                    type: 'string',
                    description: 'Plan description'
                  },
                  price: {
                    type: 'number',
                    minimum: 0,
                    description: 'Plan price'
                  },
                  basePrice: {
                    type: 'number',
                    minimum: 0,
                    description: 'Base plan price'
                  },
                  currency: {
                    type: 'string',
                    default: 'USD',
                    description: 'Currency code'
                  },
                  billingPeriod: {
                    type: 'string',
                    enum: ['monthly', 'yearly', 'lifetime'],
                    description: 'Billing period'
                  },
                  isActive: {
                    type: 'boolean',
                    default: true,
                    description: 'Whether plan is active'
                  },
                  isPopular: {
                    type: 'boolean',
                    default: false,
                    description: 'Whether plan is marked as popular'
                  },
                  features: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Plan features list'
                  },
                  limits: {
                    type: 'object',
                    properties: {
                      maxProducts: { type: 'number' },
                      maxOutlets: { type: 'number' },
                      maxUsers: { type: 'number' }
                    },
                    description: 'Plan limits'
                  },
                  sortOrder: {
                    type: 'number',
                    description: 'Sort order for display'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Plan created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Plan' },
                    code: { type: 'string', example: 'PLAN_CREATED_SUCCESS' },
                    message: { type: 'string', example: 'Plan created successfully' }
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
    '/api/plans/{id}': {
      get: {
        tags: ['Plans'],
        summary: 'Get plan by ID',
        description: 'Retrieve a specific plan by its ID. Admin only.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Plan ID'
          }
        ],
        responses: {
          '200': {
            description: 'Plan retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Plan' },
                    code: { type: 'string', example: 'PLAN_RETRIEVED_SUCCESS' },
                    message: { type: 'string', example: 'Plan retrieved successfully' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Plan not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      put: {
        tags: ['Plans'],
        summary: 'Update plan',
        description: 'Update plan details. Admin only.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Plan ID'
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
                  description: { type: 'string' },
                  price: { type: 'number', minimum: 0 },
                  basePrice: { type: 'number', minimum: 0 },
                  currency: { type: 'string' },
                  billingPeriod: { type: 'string', enum: ['monthly', 'yearly', 'lifetime'] },
                  isActive: { type: 'boolean' },
                  isPopular: { type: 'boolean' },
                  features: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  limits: {
                    type: 'object',
                    properties: {
                      maxProducts: { type: 'number' },
                      maxOutlets: { type: 'number' },
                      maxUsers: { type: 'number' }
                    }
                  },
                  sortOrder: { type: 'number' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Plan updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Plan' },
                    code: { type: 'string', example: 'PLAN_UPDATED_SUCCESS' },
                    message: { type: 'string', example: 'Plan updated successfully' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Plans'],
        summary: 'Delete plan',
        description: 'Delete a plan (soft delete). Admin only.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Plan ID'
          }
        ],
        responses: {
          '200': {
            description: 'Plan deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Plan deleted successfully' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/plans/public': {
      get: {
        tags: ['Plans'],
        summary: 'Get public plans',
        description: 'Get active plans for public display (no authentication required)',
        responses: {
          '200': {
            description: 'Public plans retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Plan' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/plans/stats': {
      get: {
        tags: ['Plan Statistics'],
        summary: 'Get plan statistics',
        description: 'Get plan usage statistics and analytics. Admin only.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Plan statistics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        totalPlans: { type: 'number' },
                        activePlans: { type: 'number' },
                        popularPlans: { type: 'number' },
                        planUsage: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              planId: { type: 'number' },
                              planName: { type: 'string' },
                              subscriptionCount: { type: 'number' }
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
      Plan: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          price: { type: 'number' },
          basePrice: { type: 'number' },
          currency: { type: 'string' },
          billingPeriod: {
            type: 'string',
            enum: ['monthly', 'yearly', 'lifetime']
          },
          isActive: { type: 'boolean' },
          isPopular: { type: 'boolean' },
          features: {
            type: 'array',
            items: { type: 'string' }
          },
          limits: {
            type: 'object',
            properties: {
              maxProducts: { type: 'number' },
              maxOutlets: { type: 'number' },
              maxUsers: { type: 'number' }
            }
          },
          sortOrder: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          subscriptions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                status: { type: 'string' }
              }
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
