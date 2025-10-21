import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl, getCurrentEnvironment } from '@rentalshop/utils';

export async function GET(request: NextRequest) {
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

  const specs = {
    openapi: '3.0.0',
    info: {
      title: 'Rental Shop API',
      version: '2.0.0',
      description: 'REST API for rental shop management system with comprehensive endpoints for authentication, products, customers, analytics, and more',
      contact: {
        name: 'RentalShop Support',
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
        description: 'Development Railway server (Recommended for Local)',
      },
      {
        url: 'https://apis-development.up.railway.app',
        description: 'Production Railway server',
      },
      {
        url: apiUrl,
        description: getServerDescription(environment),
      },
      {
        url: 'http://localhost:3002',
        description: 'Local development server (Fallback)',
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Mobile',
        description: 'Mobile-specific API endpoints'
      },
      {
        name: 'Notifications',
        description: 'Push notification management'
      },
      {
        name: 'Sync',
        description: 'Data synchronization endpoints'
      }
    ],
    paths: {
      '/api/auth/login': {
        post: {
          summary: 'User login',
          description: 'Authenticate user with email and password',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'User\'s email address',
                      example: 'user@example.com'
                    },
                    password: {
                      type: 'string',
                      minLength: 6,
                      description: 'User\'s password',
                      example: 'password123'
                    }
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
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      message: {
                        type: 'string',
                        example: 'Login successful'
                      },
                      data: {
                        type: 'object',
                        properties: {
                          user: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              email: { type: 'string' },
                              name: { type: 'string' },
                              role: { type: 'string' }
                            }
                          },
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Validation failed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Validation failed' },
                      errors: { type: 'array' }
                    }
                  }
                }
              }
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Invalid email or password' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/register': {
        post: {
          summary: 'User registration',
          description: 'Register a new user account',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'User\'s email address',
                      example: 'user@example.com'
                    },
                    password: {
                      type: 'string',
                      minLength: 6,
                      description: 'User\'s password',
                      example: 'password123'
                    },
                    name: {
                      type: 'string',
                      description: 'User\'s full name',
                      example: 'John Doe'
                    }
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
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'User registered successfully' },
                      data: {
                        type: 'object',
                        properties: {
                          user: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              email: { type: 'string' },
                              name: { type: 'string' },
                              role: { type: 'string' }
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
      '/api/mobile/auth/login': {
        post: {
          summary: 'Mobile user login',
          description: 'Authenticate mobile user with email and password',
          tags: ['Mobile', 'Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'deviceId'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'User\'s email address',
                      example: 'user@example.com'
                    },
                    password: {
                      type: 'string',
                      minLength: 6,
                      description: 'User\'s password',
                      example: 'password123'
                    },
                    deviceId: {
                      type: 'string',
                      description: 'Mobile device identifier',
                      example: 'device-123456'
                    },
                    pushToken: {
                      type: 'string',
                      description: 'Push notification token',
                      example: 'fcm-token-123'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Mobile login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Mobile login successful' },
                      data: {
                        type: 'object',
                        properties: {
                          user: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              email: { type: 'string' },
                              name: { type: 'string' },
                              role: { type: 'string' }
                            }
                          },
                          token: { type: 'string' },
                          refreshToken: { type: 'string' },
                          deviceId: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Validation failed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Validation failed' }
                    }
                  }
                }
              }
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Invalid email or password' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/mobile/notifications/register-device': {
        post: {
          summary: 'Register mobile device for push notifications',
          description: 'Register a mobile device to receive push notifications',
          tags: ['Mobile', 'Notifications'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['deviceId', 'pushToken', 'platform'],
                  properties: {
                    deviceId: {
                      type: 'string',
                      description: 'Mobile device identifier',
                      example: 'device-123456'
                    },
                    pushToken: {
                      type: 'string',
                      description: 'Push notification token',
                      example: 'fcm-token-123'
                    },
                    platform: {
                      type: 'string',
                      enum: ['ios', 'android'],
                      description: 'Mobile platform',
                      example: 'ios'
                    },
                    userId: {
                      type: 'string',
                      description: 'User ID (optional)',
                      example: 'user-123'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Device registered successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Device registered successfully' },
                      data: {
                        type: 'object',
                        properties: {
                          deviceId: { type: 'string' },
                          registeredAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Validation failed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Missing required fields' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/mobile/sync/check': {
        get: {
          summary: 'Check sync status',
          description: 'Check if mobile app needs to sync data with server',
          tags: ['Mobile', 'Sync'],
          parameters: [
            {
              in: 'query',
              name: 'lastSync',
              schema: {
                type: 'string',
                format: 'date-time'
              },
              description: 'Last sync timestamp',
              example: '2024-01-01T00:00:00Z'
            },
            {
              in: 'query',
              name: 'userId',
              schema: {
                type: 'string'
              },
              description: 'User ID',
              example: 'user-123'
            }
          ],
          responses: {
            '200': {
              description: 'Sync status check successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Sync check completed' },
                      data: {
                        type: 'object',
                        properties: {
                          needsSync: {
                            type: 'boolean',
                            description: 'Whether sync is needed'
                          },
                          lastServerUpdate: {
                            type: 'string',
                            format: 'date-time'
                          },
                          syncItems: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['products', 'orders', 'user']
                                },
                                count: { type: 'number' }
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
            '400': {
              description: 'Invalid parameters',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'User ID is required' }
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
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Validation errors if applicable'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  };

  return NextResponse.json(specs);
} 