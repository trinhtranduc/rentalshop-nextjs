/**
 * Swagger documentation for Subscriptions API
 */
import { getApiUrl } from '@rentalshop/utils';

export const subscriptionSwaggerConfig = {
  openapi: '3.0.0',
  info: {
    title: 'Rental Shop Subscriptions API',
    description: 'Comprehensive API for subscription and plan management',
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
      name: 'Subscriptions',
      description: 'Subscription management operations'
    },
    {
      name: 'Subscription Plans',
      description: 'Subscription plan operations and management'
    },
    {
      name: 'Subscription Status',
      description: 'Subscription status and monitoring'
    }
  ],
  paths: {
    '/api/subscriptions': {
      get: {
        tags: ['Subscriptions'],
        summary: 'Get subscriptions with filtering',
        description: 'Retrieve subscriptions with various filters including merchant, plan, and status',
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
            name: 'planId',
            in: 'query',
            schema: { type: 'number' },
            description: 'Filter by plan ID'
          },
          {
            name: 'status',
            in: 'query',
            schema: { 
              type: 'string', 
              enum: ['active', 'trial', 'expired', 'cancelled'] 
            },
            description: 'Filter by subscription status'
          },
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Filter subscriptions starting from this date'
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Filter subscriptions until this date'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'number', default: 20 },
            description: 'Number of subscriptions to return'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'number', default: 0 },
            description: 'Number of subscriptions to skip'
          }
        ],
        responses: {
          '200': {
            description: 'Subscriptions retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Subscription' }
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        total: { type: 'number' },
                        hasMore: { type: 'boolean' },
                        limit: { type: 'number' },
                        offset: { type: 'number' }
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
      },
      post: {
        tags: ['Subscriptions'],
        summary: 'Create a new subscription',
        description: 'Create a new subscription for a merchant',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['merchantId', 'planId'],
                properties: {
                  merchantId: {
                    type: 'number',
                    description: 'Merchant ID'
                  },
                  planId: {
                    type: 'number',
                    description: 'Plan ID'
                  },
                  startDate: {
                    type: 'string',
                    format: 'date',
                    description: 'Subscription start date'
                  },
                  customLimits: {
                    type: 'object',
                    description: 'Custom plan limits',
                    properties: {
                      maxProducts: { type: 'number' },
                      maxOutlets: { type: 'number' },
                      maxUsers: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Subscription created successfully',
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
    '/api/subscriptions/{id}': {
      get: {
        tags: ['Subscriptions'],
        summary: 'Get subscription by ID',
        description: 'Retrieve a specific subscription by its ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Subscription ID'
          }
        ],
        responses: {
          '200': {
            description: 'Subscription retrieved successfully',
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
          },
          '404': {
            description: 'Subscription not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      put: {
        tags: ['Subscriptions'],
        summary: 'Update subscription',
        description: 'Update subscription details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Subscription ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['active', 'trial', 'expired', 'cancelled']
                  },
                  endDate: { type: 'string', format: 'date' },
                  customLimits: {
                    type: 'object',
                    properties: {
                      maxProducts: { type: 'number' },
                      maxOutlets: { type: 'number' },
                      maxUsers: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Subscription updated successfully',
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
    '/api/subscriptions/status': {
      get: {
        tags: ['Subscription Status'],
        summary: 'Get current subscription status',
        description: 'Get subscription status for the authenticated merchant or outlet',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Subscription status retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        subscription: { $ref: '#/components/schemas/Subscription' },
                        plan: { $ref: '#/components/schemas/Plan' },
                        limits: {
                          type: 'object',
                          properties: {
                            maxProducts: { type: 'number' },
                            maxOutlets: { type: 'number' },
                            maxUsers: { type: 'number' },
                            currentUsage: {
                              type: 'object',
                              properties: {
                                products: { type: 'number' },
                                outlets: { type: 'number' },
                                users: { type: 'number' }
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
    '/api/subscriptions/{id}/change-plan': {
      post: {
        tags: ['Subscription Plans'],
        summary: 'Change subscription plan',
        description: 'Change the plan for an existing subscription',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Subscription ID'
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
                  newPlanId: {
                    type: 'number',
                    description: 'New plan ID (alternative field name)'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Plan changed successfully',
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
      patch: {
        tags: ['Subscription Plans'],
        summary: 'Change subscription plan (PATCH)',
        description: 'Change the plan for an existing subscription using PATCH method',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Subscription ID'
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
                  newPlanId: {
                    type: 'number',
                    description: 'New plan ID (alternative field name)'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Plan changed successfully',
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
    '/api/subscriptions/{id}/cancel': {
      post: {
        tags: ['Subscriptions'],
        summary: 'Cancel subscription',
        description: 'Cancel an active subscription',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'number' },
            description: 'Subscription ID'
          }
        ],
        responses: {
          '200': {
            description: 'Subscription cancelled successfully',
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
    '/api/subscriptions/stats': {
      get: {
        tags: ['Subscriptions'],
        summary: 'Get subscription statistics',
        description: 'Get subscription statistics and analytics',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Subscription statistics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        totalSubscriptions: { type: 'number' },
                        activeSubscriptions: { type: 'number' },
                        expiredSubscriptions: { type: 'number' },
                        trialSubscriptions: { type: 'number' }
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
      Subscription: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          merchantId: { type: 'number' },
          planId: { type: 'number' },
          status: {
            type: 'string',
            enum: ['active', 'trial', 'expired', 'cancelled']
          },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          merchant: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              companyName: { type: 'string' }
            }
          },
          plan: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              description: { type: 'string', nullable: true }
            }
          }
        }
      },
      Plan: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          price: { type: 'number' },
          currency: { type: 'string' },
          limits: {
            type: 'object',
            properties: {
              maxProducts: { type: 'number' },
              maxOutlets: { type: 'number' },
              maxUsers: { type: 'number' }
            }
          },
          isActive: { type: 'boolean' }
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
