/**
 * Swagger documentation for Categories API
 */
import { getApiUrl } from '@rentalshop/utils';

export const categorySwaggerConfig = {
  openapi: '3.0.0',
  info: {
    title: 'Rental Shop Categories API',
    description: 'Comprehensive API for product category management including CRUD operations',
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
      name: 'Categories',
      description: 'Product category management operations'
    }
  ],
  paths: {
    '/api/categories': {
      get: {
        tags: ['Categories'],
        summary: 'Get categories with filtering and pagination',
        description: 'Retrieve product categories with role-based access control. Returns simple array if no search params, paginated structure if search params provided.',
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
            description: 'Search query for category name'
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Alternative search parameter'
          },
          {
            name: 'merchantId',
            in: 'query',
            schema: { type: 'number' },
            description: 'Filter by merchant ID (Admin only)'
          },
          {
            name: 'isActive',
            in: 'query',
            schema: { 
              type: 'string', 
              enum: ['true', 'false', 'all'],
              default: 'true'
            },
            description: 'Filter by active status'
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: { type: 'string', default: 'name' },
            description: 'Sort field'
          },
          {
            name: 'sortOrder',
            in: 'query',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
            description: 'Sort order'
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'number', default: 1 },
            description: 'Page number (for paginated mode)'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'number', default: 25 },
            description: 'Number of categories to return (for paginated mode)'
          }
        ],
        responses: {
          '200': {
            description: 'Categories retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      type: 'object',
                      description: 'Simple array response (no search params)',
                      properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Category' }
                        }
                      }
                    },
                    {
                      type: 'object',
                      description: 'Paginated response (with search params)',
                      properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                          type: 'object',
                          properties: {
                            categories: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/Category' }
                            },
                            total: { type: 'number' },
                            page: { type: 'number' },
                            limit: { type: 'number' },
                            hasMore: { type: 'boolean' },
                            totalPages: { type: 'number' }
                          }
                        },
                        code: { type: 'string', example: 'CATEGORIES_FOUND' },
                        message: { type: 'string', example: 'Found 10 categories' }
                      }
                    }
                  ]
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
        tags: ['Categories'],
        summary: 'Create a new category',
        description: 'Create a new product category for the authenticated merchant',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: {
                    type: 'string',
                    description: 'Category name',
                    minLength: 1
                  },
                  description: {
                    type: 'string',
                    description: 'Category description'
                  },
                  isActive: {
                    type: 'boolean',
                    default: true,
                    description: 'Whether category is active'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Category created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Category' },
                    code: { type: 'string', example: 'CATEGORY_CREATED_SUCCESS' },
                    message: { type: 'string', example: 'Category created successfully' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Validation error - Category name required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '409': {
            description: 'Conflict - Category name already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/categories/{id}': {
      get: {
        tags: ['Categories'],
        summary: 'Get category by ID',
        description: 'Retrieve a specific category by its ID with role-based access control',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Category ID'
          }
        ],
        responses: {
          '200': {
            description: 'Category retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Category' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Invalid category ID',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '403': {
            description: 'No data available - user not assigned to merchant/outlet',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Category not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      put: {
        tags: ['Categories'],
        summary: 'Update category',
        description: 'Update category details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Category ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { 
                    type: 'string',
                    minLength: 1
                  },
                  description: { type: 'string' },
                  isActive: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Category updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Category' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete category',
        description: 'Delete a category (soft delete)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Category ID'
          }
        ],
        responses: {
          '200': {
            description: 'Category deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Category deleted successfully' }
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
      Category: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          merchantId: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          merchant: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              companyName: { type: 'string' }
            }
          },
          _count: {
            type: 'object',
            properties: {
              products: { type: 'number' }
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
