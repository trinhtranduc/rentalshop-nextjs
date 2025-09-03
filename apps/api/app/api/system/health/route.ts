import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: any;
  error?: string;
}

interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheck[];
  performance: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];
  
  try {
    // 1. Database Health Check
    const dbStartTime = Date.now();
    try {
      await prisma.$connect();
      const productCount = await prisma.product.count();
      const userCount = await prisma.user.count();
      const orderCount = await prisma.order.count();
      
      checks.push({
        name: 'database',
        status: 'healthy',
        responseTime: Date.now() - dbStartTime,
        details: {
          connection: 'connected',
          tables: {
            products: productCount,
            users: userCount,
            orders: orderCount
          }
        }
      });
    } catch (error) {
      checks.push({
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - dbStartTime,
        error: error instanceof Error ? error.message : 'Database connection failed'
      });
    } finally {
      await prisma.$disconnect();
    }

    // 2. API Health Check
    const apiStartTime = Date.now();
    try {
      // Test a simple API operation
      const testResponse = await fetch(`${request.nextUrl.origin}/api/health/database`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (testResponse.ok) {
        checks.push({
          name: 'api',
          status: 'healthy',
          responseTime: Date.now() - apiStartTime,
          details: {
            status: testResponse.status,
            responseTime: Date.now() - apiStartTime
          }
        });
      } else {
        checks.push({
          name: 'api',
          status: 'degraded',
          responseTime: Date.now() - apiStartTime,
          error: `API returned status ${testResponse.status}`
        });
      }
    } catch (error) {
      checks.push({
        name: 'api',
        status: 'unhealthy',
        responseTime: Date.now() - apiStartTime,
        error: error instanceof Error ? error.message : 'API health check failed'
      });
    }

    // 3. External Dependencies Check
    const externalStartTime = Date.now();
    try {
      // Check if we can reach external services (if any)
      // For now, just check if the server is responsive
      checks.push({
        name: 'external_services',
        status: 'healthy',
        responseTime: Date.now() - externalStartTime,
        details: {
          services: ['none_configured']
        }
      });
    } catch (error) {
      checks.push({
        name: 'external_services',
        status: 'degraded',
        responseTime: Date.now() - externalStartTime,
        error: error instanceof Error ? error.message : 'External services check failed'
      });
    }

    // 4. System Resources Check
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    checks.push({
      name: 'system_resources',
      status: memoryPercentage > 90 ? 'unhealthy' : memoryPercentage > 75 ? 'degraded' : 'healthy',
      responseTime: 0,
      details: {
        memory: {
          used: Math.round(usedMemory / 1024 / 1024), // MB
          total: Math.round(totalMemory / 1024 / 1024), // MB
          percentage: Math.round(memoryPercentage)
        }
      }
    });

    // Determine overall health
    const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
    const degradedChecks = checks.filter(check => check.status === 'degraded');
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    if (unhealthyChecks.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedChecks.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const systemHealth: SystemHealth = {
      overall: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      performance: {
        memory: {
          used: Math.round(usedMemory / 1024 / 1024),
          total: Math.round(totalMemory / 1024 / 1024),
          percentage: Math.round(memoryPercentage)
        },
        cpu: {
          usage: 0 // CPU usage is complex to calculate in Node.js
        }
      }
    };

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(systemHealth, { status: statusCode });

  } catch (error) {
    console.error('System health check failed:', error);
    
    return NextResponse.json({
      overall: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: [{
        name: 'system',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'System health check failed'
      }],
      performance: {
        memory: { used: 0, total: 0, percentage: 0 },
        cpu: { usage: 0 }
      }
    }, { status: 503 });
  }
}
