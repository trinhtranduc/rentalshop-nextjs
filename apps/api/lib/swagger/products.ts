/**
 * Swagger documentation for Product APIs
 */
import { getApiUrl } from '@rentalshop/utils';

export const productSwaggerConfig = {
  openapi: '3.0.0',
  info: {
    title: 'Rental Shop Product API',
    description: 'Comprehensive API for product management including search, CRUD operations, and specialized endpoints',
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
      name: 'Products',
      description: 'Product management operations'
    },
    {
      name: 'Product Search',
      description: 'Product search and filtering operations'
    },
    {
      name: 'Product Barcode',
      description: 'Barcode-based product operations'
    }
  ],
  paths: {
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'Get products with filtering and pagination',
        description: 'Retrieve products with various filters including outlet, category, price range, and search terms',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'outletId',
            in: 'query',
            description: 'Filter by specific outlet',
            schema: { type: 'string' }
          },
          {
            name: 'categoryId',
            in: 'query',
            description: 'Filter by specific category',
            schema: { type: 'string' }
          },
          {
            name: 'isActive',
            in: 'query',
            description: 'Filter by active status',
            schema: { type: 'boolean' }
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search term for product name',
            schema: { type: 'string' }
          },
          {
            name: 'minPrice',
            in: 'query',
            description: 'Minimum rent price filter',
            schema: { type: 'number' }
          },
          {
            name: 'maxPrice',
            in: 'query',
            description: 'Maximum rent price filter',
            schema: { type: 'number' }
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number for pagination',
            schema: { type: 'integer', default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of items per page',
            schema: { type: 'integer', default: 20 }
          },
          {
            name: 'sortBy',
            in: 'query',
            description: 'Sort field',
            schema: { 
              type: 'string', 
              enum: ['name', 'rentPrice', 'createdAt'],
              default: 'createdAt'
            }
          },
          {
            name: 'sortOrder',
            in: 'query',
            description: 'Sort order',
            schema: { 
              type: 'string', 
              enum: ['asc', 'desc'],
              default: 'desc'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Products retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        products: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Product' }
                        },
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        totalPages: { type: 'integer' },
                        hasMore: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized - Access token required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      post: {
        tags: ['Products'],
        summary: 'Create a new product',
        description: 'Create a new product with all required information',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductInput' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Product created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Product' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' }
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
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/products/search': {
      get: {
        tags: ['Product Search'],
        summary: 'Search products by name or barcode',
        description: 'Advanced product search with multiple filtering options',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            description: 'Search query for product name or barcode',
            schema: { type: 'string' }
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
            name: 'categoryId',
            in: 'query',
            description: 'Filter by specific category',
            schema: { type: 'string' }
          },
          {
            name: 'isActive',
            in: 'query',
            description: 'Filter by active status',
            schema: { type: 'boolean' }
          },
          {
            name: 'inStock',
            in: 'query',
            description: 'Only products with available stock',
            schema: { type: 'boolean' }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of results per page (1-100)',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Number of results to skip',
            schema: { type: 'integer', minimum: 0, default: 0 }
          }
        ],
        responses: {
          '200': {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        products: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/ProductSearchResult' }
                        },
                        total: { type: 'integer' },
                        limit: { type: 'integer' },
                        offset: { type: 'integer' },
                        hasMore: { type: 'boolean' }
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
    },
    '/api/products/barcode/{barcode}': {
      get: {
        tags: ['Product Barcode'],
        summary: 'Find product by barcode',
        description: 'Search for a product using its exact barcode',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'barcode',
            in: 'path',
            required: true,
            description: 'Product barcode',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Product found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/ProductSearchResult' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Product not found',
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
    },
    '/api/products/outlet/{outletId}': {
      get: {
        tags: ['Products'],
        summary: 'Get products by outlet',
        description: 'Retrieve all products from a specific outlet with optional filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'outletId',
            in: 'path',
            required: true,
            description: 'Outlet ID',
            schema: { type: 'string' }
          },
          {
            name: 'categoryId',
            in: 'query',
            description: 'Filter by specific category',
            schema: { type: 'string' }
          },
          {
            name: 'isActive',
            in: 'query',
            description: 'Filter by active status',
            schema: { type: 'boolean' }
          },
          {
            name: 'inStock',
            in: 'query',
            description: 'Only products with available stock',
            schema: { type: 'boolean' }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of results per page (1-100)',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Number of results to skip',
            schema: { type: 'integer', minimum: 0, default: 0 }
          }
        ],
        responses: {
          '200': {
            description: 'Products retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        products: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/ProductSearchResult' }
                        },
                        total: { type: 'integer' },
                        limit: { type: 'integer' },
                        offset: { type: 'integer' },
                        hasMore: { type: 'boolean' }
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
    },
    '/api/products/merchant/{merchantId}': {
      get: {
        tags: ['Products'],
        summary: 'Get products by merchant',
        description: 'Retrieve all products from a specific merchant with optional filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'merchantId',
            in: 'path',
            required: true,
            description: 'Merchant ID',
            schema: { type: 'string' }
          },
          {
            name: 'categoryId',
            in: 'query',
            description: 'Filter by specific category',
            schema: { type: 'string' }
          },
          {
            name: 'isActive',
            in: 'query',
            description: 'Filter by active status',
            schema: { type: 'boolean' }
          },
          {
            name: 'inStock',
            in: 'query',
            description: 'Only products with available stock',
            schema: { type: 'boolean' }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of results per page (1-100)',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Number of results to skip',
            schema: { type: 'integer', minimum: 0, default: 0 }
          }
        ],
        responses: {
          '200': {
            description: 'Products retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        products: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/ProductSearchResult' }
                        },
                        total: { type: 'integer' },
                        limit: { type: 'integer' },
                        offset: { type: 'integer' },
                        hasMore: { type: 'boolean' }
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
    },
    '/api/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get product by ID',
        description: 'Retrieve a specific product by its ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Product ID',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Product retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Product' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Product not found',
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
      },
      put: {
        tags: ['Products'],
        summary: 'Update product',
        description: 'Update an existing product',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Product ID',
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductUpdateInput' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Product updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Product' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' }
              }
            }
          },
          '404': {
            description: 'Product not found',
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
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete product',
        description: 'Soft delete a product (marks as inactive)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Product ID',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Product deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Product not found',
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
    },
    '/api/products/{id}/availability': {
      get: {
        tags: ['Products'],
        summary: 'Check product availability',
        description: 'Check if a product is available for rent',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Product ID',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Availability status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        available: { type: 'boolean' },
                        stock: { type: 'integer' },
                        renting: { type: 'integer' },
                        availableCount: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Product not found',
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
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          barcode: { type: 'string', nullable: true },
          stock: { type: 'integer' },
          renting: { type: 'integer' },
          available: { type: 'integer' },
          rentPrice: { type: 'number' },
          salePrice: { type: 'number', nullable: true },
          deposit: { type: 'number' },
          images: { type: 'string' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          outlet: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              merchant: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  companyName: { type: 'string' }
                }
              }
            }
          },
          category: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      },
      ProductSearchResult: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          barcode: { type: 'string', nullable: true },
          stock: { type: 'integer' },
          renting: { type: 'integer' },
          available: { type: 'integer' },
          rentPrice: { type: 'number' },
          salePrice: { type: 'number', nullable: true },
          deposit: { type: 'number' },
          images: { type: 'string' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          outlet: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              merchant: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  companyName: { type: 'string' }
                }
              }
            }
          },
          category: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      },
      ProductInput: {
        type: 'object',
        required: ['name', 'stock', 'rentPrice', 'deposit', 'categoryId', 'outletId'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          barcode: { type: 'string' },
          stock: { type: 'integer', minimum: 0 },
          rentPrice: { type: 'number', minimum: 0 },
          salePrice: { type: 'number', minimum: 0 },
          deposit: { type: 'number', minimum: 0 },
          categoryId: { type: 'string' },
          outletId: { type: 'string' },
          images: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      ProductUpdateInput: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          barcode: { type: 'string' },
          stock: { type: 'integer', minimum: 0 },
          rentPrice: { type: 'number', minimum: 0 },
          salePrice: { type: 'number', minimum: 0 },
          deposit: { type: 'number', minimum: 0 },
          categoryId: { type: 'string' },
          outletId: { type: 'string' },
          images: {
            type: 'array',
            items: { type: 'string' }
          },
          isActive: { type: 'boolean' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'string' }
        }
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
}; 