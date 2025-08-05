export const customerSwaggerConfig = {
  openapi: '3.0.0',
  info: {
    title: 'Rental Shop Customer API',
    description: 'Comprehensive API for customer management including search, CRUD operations, and specialized endpoints',
    version: '1.0.0',
    contact: {
      name: 'Rental Shop API Support',
      email: 'support@rentalshop.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3002',
      description: 'Development server'
    }
  ],
  tags: [
    {
      name: 'Customers',
      description: 'Customer management operations'
    },
    {
      name: 'Customer Search',
      description: 'Customer search and filtering operations'
    }
  ],
  paths: {
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
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
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