/**
 * Comprehensive Swagger documentation for all Rental Shop APIs
 */
import { getApiUrl, getCurrentEnvironment } from '@rentalshop/utils';
// Import individual swagger configs
import { userSwaggerConfig } from './users';
import { orderSwaggerConfig } from './orders';
import { categorySwaggerConfig } from './categories';
import { planSwaggerConfig } from './plans';
import { merchantSwaggerConfig } from './merchants';
import { outletSwaggerConfig } from './outlets';
import { subscriptionSwaggerConfig } from './subscriptions';
import { calendarSwaggerConfig } from './calendar';

const environment = getCurrentEnvironment();
const apiUrl = getApiUrl();

const getServerDescription = (env: string) => {
  switch (env) {
    case 'production':
      return 'Production Railway server';
    case 'development':
      return 'Development Railway server';
    default:
      return 'Railway development server';
  }
};

export const comprehensiveSwaggerConfig = {
  openapi: '3.0.0',
  info: {
    title: 'Rental Shop API',
    description: 'Complete API documentation for the Rental Shop system including authentication, products, analytics, and more',
    version: '2.0.0',
    contact: {
      name: 'Rental Shop API Support',
      email: 'support@rentalshop.com',
      url: 'https://rentalshop.com/support'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
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
      url: apiUrl,
      description: getServerDescription(environment)
    },
    {
      url: 'http://localhost:3002',
      description: 'Local development server (Fallback)'
    }
  ],
  tags: [
    { name: 'Authentication', description: 'User authentication and authorization endpoints' },
    { name: 'User Management', description: 'User CRUD operations and management' },
    { name: 'User Roles', description: 'Role-based access control operations' },
    { name: 'Products', description: 'Product management operations' },
    { name: 'Product Search', description: 'Product search and filtering operations' },
    { name: 'Product Barcode', description: 'Barcode-based product operations' },
    { name: 'Orders', description: 'Order management operations' },
    { name: 'Order Status', description: 'Order status management and updates' },
    { name: 'Order Analytics', description: 'Order analytics and reporting' },
    { name: 'Customers', description: 'Customer management operations' },
    { name: 'Customer Search', description: 'Customer search and filtering operations' },
    { name: 'Categories', description: 'Category management operations' },
    { name: 'Plans', description: 'Subscription plan management' },
    { name: 'Merchants', description: 'Merchant management operations' },
    { name: 'Outlets', description: 'Outlet management operations' },
    { name: 'Subscriptions', description: 'Subscription management operations' },
    { name: 'Calendar', description: 'Calendar and scheduling endpoints' },
    { name: 'Analytics', description: 'Analytics and reporting endpoints' },
    { name: 'Mobile', description: 'Mobile-optimized endpoints' },
    { name: 'System', description: 'System and utility endpoints' }
  ],
  security: [
    { bearerAuth: [] },
    { clientPlatformHeader: [] },
    { deviceTypeHeader: [] },
    { appVersionHeader: [] },
    { userAgentHeader: [] }
  ],
  paths: {
    // Authentication Endpoints
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Create a new user account with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string', minLength: 2 }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' }
                      }
                    }
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
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        description: 'Authenticate user with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/auth/verify': {
      get: {
        tags: ['Authentication'],
        summary: 'Verify authentication token',
        description: 'Verify if the current authentication token is valid',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Token is valid',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        valid: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Invalid or expired token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },

    // Product Endpoints
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
          }
        }
      }
    },

    // Product Search Endpoints
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

    // Product Barcode Endpoints
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

    // Product by Outlet/Merchant
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

    // Individual Product Operations
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
    },

    // Mobile Endpoints
    '/api/mobile/products': {
      get: {
        tags: ['Mobile'],
        summary: 'Get mobile-optimized products',
        description: 'Get products optimized for mobile applications with simplified data structure',
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
            name: 'limit',
            in: 'query',
            description: 'Number of results per page',
            schema: { type: 'integer', default: 20 }
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Number of results to skip',
            schema: { type: 'integer', default: 0 }
          }
        ],
        responses: {
          '200': {
            description: 'Mobile products retrieved successfully',
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
                          items: { $ref: '#/components/schemas/MobileProduct' }
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

    // Analytics Endpoints
    '/api/analytics/dashboard': {
      get: {
        tags: ['Analytics'],
        summary: 'Get dashboard analytics',
        description: 'Get comprehensive analytics for the dashboard including income, orders, and trends',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'period',
            in: 'query',
            description: 'Time period for analytics',
            schema: { 
              type: 'string', 
              enum: ['today', 'week', 'month', 'year'],
              default: 'week'
            }
          },
          {
            name: 'outletId',
            in: 'query',
            description: 'Filter by specific outlet',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Analytics data retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/DashboardAnalytics' }
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

    // System Endpoints
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Check if the API is running and healthy',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    },

    // Customer Endpoints
    '/api/customers': {
      get: {
        tags: ['Customers'],
        summary: 'Get customers with filtering and pagination',
        description: 'Retrieve customers with various filters including merchant, status, location, and search terms',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'merchantId',
            in: 'query',
            description: 'Filter by specific merchant',
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
            description: 'Search term for customer name, email, or phone',
            schema: { type: 'string' }
          },
          {
            name: 'city',
            in: 'query',
            description: 'Filter by city',
            schema: { type: 'string' }
          },
          {
            name: 'state',
            in: 'query',
            description: 'Filter by state/province',
            schema: { type: 'string' }
          },
          {
            name: 'country',
            in: 'query',
            description: 'Filter by country',
            schema: { type: 'string' }
          },
          {
            name: 'idType',
            in: 'query',
            description: 'Filter by ID type',
            schema: { 
              type: 'string',
              enum: ['passport', 'drivers_license', 'national_id', 'other']
            }
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
          }
        ],
        responses: {
          '200': {
            description: 'Customers retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        customers: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Customer' }
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
          }
        }
      },
      post: {
        tags: ['Customers'],
        summary: 'Create a new customer',
        description: 'Create a new customer with all required information',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CustomerInput' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Customer created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Customer' },
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
          }
        }
      }
    },
    '/api/customers/search': {
      get: {
        tags: ['Customer Search'],
        summary: 'Search customers by name, email, phone, or ID',
        description: 'Advanced customer search with multiple filtering options',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            description: 'Search query for customer name, email, phone, or ID number',
            schema: { type: 'string' }
          },
          {
            name: 'merchantId',
            in: 'query',
            description: 'Filter by specific merchant',
            schema: { type: 'string' }
          },
          {
            name: 'isActive',
            in: 'query',
            description: 'Filter by active status',
            schema: { type: 'boolean' }
          },
          {
            name: 'city',
            in: 'query',
            description: 'Filter by city',
            schema: { type: 'string' }
          },
          {
            name: 'state',
            in: 'query',
            description: 'Filter by state/province',
            schema: { type: 'string' }
          },
          {
            name: 'country',
            in: 'query',
            description: 'Filter by country',
            schema: { type: 'string' }
          },
          {
            name: 'idType',
            in: 'query',
            description: 'Filter by ID type',
            schema: { 
              type: 'string',
              enum: ['passport', 'drivers_license', 'national_id', 'other']
            }
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
                        customers: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/CustomerSearchResult' }
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
    '/api/customers/{id}': {
      get: {
        tags: ['Customers'],
        summary: 'Get customer by ID',
        description: 'Retrieve a specific customer by its ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Customer ID',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Customer retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Customer' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Customer not found',
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
        tags: ['Customers'],
        summary: 'Update customer',
        description: 'Update an existing customer',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Customer ID',
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CustomerUpdateInput' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Customer updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Customer' },
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
            description: 'Customer not found',
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
        tags: ['Customers'],
        summary: 'Delete customer',
        description: 'Soft delete a customer (marks as inactive)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Customer ID',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Customer deleted successfully',
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
            description: 'Customer not found',
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

    // User Management Endpoints
    '/api/users': {
      get: {
        tags: ['User Management'],
        summary: 'Get users with filtering and pagination',
        description: 'Retrieve users with various filters including merchant, outlet, role, and status',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'merchantId',
            in: 'query',
            description: 'Filter by specific merchant',
            schema: { type: 'string' }
          },
          {
            name: 'role',
            in: 'query',
            description: 'Filter by user role',
            schema: { 
              type: 'string',
              enum: ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']
            }
          }
        ],
        responses: {
          '200': {
            description: 'Users retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        users: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/User' }
                        },
                        total: { type: 'integer' }
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

    // Order Management Endpoints - Merge from orderSwaggerConfig
    ...orderSwaggerConfig.paths,

    // User Management Endpoints - Merge from userSwaggerConfig (excluding duplicates)
    ...Object.fromEntries(
      Object.entries(userSwaggerConfig.paths).filter(([path]) => 
        !['/api/auth/register', '/api/auth/login'].includes(path)
      )
    ),

    // Category Management Endpoints - Merge from categorySwaggerConfig
    ...categorySwaggerConfig.paths,

    // Plan Management Endpoints - Merge from planSwaggerConfig
    ...planSwaggerConfig.paths,

    // Merchant Management Endpoints - Merge from merchantSwaggerConfig
    ...merchantSwaggerConfig.paths,

    // Outlet Management Endpoints - Merge from outletSwaggerConfig
    ...outletSwaggerConfig.paths,

    // Subscription Management Endpoints - Merge from subscriptionSwaggerConfig
    ...subscriptionSwaggerConfig.paths,

    // Calendar Management Endpoints - Merge from calendarSwaggerConfig
    ...calendarSwaggerConfig.paths
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from login endpoint'
      },
      clientPlatformHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Client-Platform',
        description: 'Client platform (mobile/web)'
      },
      deviceTypeHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Device-Type',
        description: 'Device type (ios/android/browser)'
      },
      appVersionHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-App-Version',
        description: 'App version (for mobile)'
      },
      userAgentHeader: {
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
      MobileProduct: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          barcode: { type: 'string', nullable: true },
          available: { type: 'integer' },
          rentPrice: { type: 'number' },
          deposit: { type: 'number' },
          images: { type: 'string' },
          isAvailable: { type: 'boolean' },
          outlet: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
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
      DashboardAnalytics: {
        type: 'object',
        properties: {
          totalIncome: { type: 'number' },
          totalOrders: { type: 'integer' },
          activeProducts: { type: 'integer' },
          totalCustomers: { type: 'integer' },
          recentOrders: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                customerName: { type: 'string' },
                amount: { type: 'number' },
                status: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' }
              }
            }
          },
          incomeTrend: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                income: { type: 'number' }
              }
            }
          }
        }
      },
             Customer: {
         type: 'object',
         properties: {
           id: { type: 'string' },
           firstName: { type: 'string' },
           lastName: { type: 'string' },
           email: { type: 'string', format: 'email' },
           phone: { type: 'string' },
           address: { type: 'string', nullable: true },
           city: { type: 'string', nullable: true },
           state: { type: 'string', nullable: true },
           zipCode: { type: 'string', nullable: true },
           country: { type: 'string', nullable: true },
           dateOfBirth: { type: 'string', format: 'date-time', nullable: true },
           idNumber: { type: 'string', nullable: true },
           idType: { 
             type: 'string', 
             enum: ['passport', 'drivers_license', 'national_id', 'other'],
             nullable: true 
           },
           isActive: { type: 'boolean' },
           notes: { type: 'string', nullable: true },
           createdAt: { type: 'string', format: 'date-time' },
           updatedAt: { type: 'string', format: 'date-time' },
           merchantId: { type: 'string' },
           merchant: {
             type: 'object',
             properties: {
               id: { type: 'string' },
               companyName: { type: 'string' }
             }
           }
         }
       },
       CustomerInput: {
         type: 'object',
         required: ['firstName', 'lastName', 'email', 'phone', 'merchantId'],
         properties: {
           firstName: { type: 'string', minLength: 1 },
           lastName: { type: 'string', minLength: 1 },
           email: { type: 'string', format: 'email' },
           phone: { type: 'string' },
           address: { type: 'string', nullable: true },
           city: { type: 'string', nullable: true },
           state: { type: 'string', nullable: true },
           zipCode: { type: 'string', nullable: true },
           country: { type: 'string', nullable: true },
           dateOfBirth: { type: 'string', format: 'date-time', nullable: true },
           idNumber: { type: 'string', nullable: true },
           idType: { 
             type: 'string', 
             enum: ['passport', 'drivers_license', 'national_id', 'other'],
             nullable: true 
           },
           notes: { type: 'string', nullable: true },
           merchantId: { type: 'string' }
         }
       },
       CustomerUpdateInput: {
         type: 'object',
         properties: {
           firstName: { type: 'string', minLength: 1 },
           lastName: { type: 'string', minLength: 1 },
           email: { type: 'string', format: 'email' },
           phone: { type: 'string' },
           address: { type: 'string', nullable: true },
           city: { type: 'string', nullable: true },
           state: { type: 'string', nullable: true },
           zipCode: { type: 'string', nullable: true },
           country: { type: 'string', nullable: true },
           dateOfBirth: { type: 'string', format: 'date-time', nullable: true },
           idNumber: { type: 'string', nullable: true },
           idType: { 
             type: 'string', 
             enum: ['passport', 'drivers_license', 'national_id', 'other'],
             nullable: true 
           },
           notes: { type: 'string', nullable: true },
           isActive: { type: 'boolean' }
         }
       },
       CustomerSearchResult: {
         type: 'object',
         properties: {
           id: { type: 'string' },
           firstName: { type: 'string' },
           lastName: { type: 'string' },
           email: { type: 'string', format: 'email' },
           phone: { type: 'string' },
           address: { type: 'string', nullable: true },
           city: { type: 'string', nullable: true },
           state: { type: 'string', nullable: true },
           zipCode: { type: 'string', nullable: true },
           country: { type: 'string', nullable: true },
           dateOfBirth: { type: 'string', format: 'date-time', nullable: true },
           idNumber: { type: 'string', nullable: true },
           idType: { 
             type: 'string', 
             enum: ['passport', 'drivers_license', 'national_id', 'other'],
             nullable: true 
           },
           isActive: { type: 'boolean' },
           notes: { type: 'string', nullable: true },
           createdAt: { type: 'string', format: 'date-time' },
           updatedAt: { type: 'string', format: 'date-time' },
           merchant: {
             type: 'object',
             properties: {
               id: { type: 'string' },
               companyName: { type: 'string' }
             }
           }
         }
       },
      // Merge schemas from other modules
      ...orderSwaggerConfig.components?.schemas,
      ...userSwaggerConfig.components?.schemas,
      ...categorySwaggerConfig.components?.schemas,
      ...planSwaggerConfig.components?.schemas,
      ...merchantSwaggerConfig.components?.schemas,
      ...outletSwaggerConfig.components?.schemas,
      ...subscriptionSwaggerConfig.components?.schemas,
      ...calendarSwaggerConfig.components?.schemas
    }
  }
}; 