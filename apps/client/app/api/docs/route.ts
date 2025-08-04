import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const specs = {
    openapi: '3.0.0',
    info: {
      title: 'Rental Shop API',
      version: '1.0.0',
      description: 'REST API for rental shop management system',
      contact: {
        name: 'RentalShop Support',
        email: 'support@rentalshop.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Development server',
      },
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
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
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