import { NextRequest, NextResponse } from 'next/server';
import { withApiLogging } from '@/lib/api-logging-wrapper';
import { withAuthRoles } from '@rentalshop/auth';
import { USER_ROLE } from '@rentalshop/constants';
import { ResponseBuilder } from '@rentalshop/utils';
// Dynamic import for server-only logger
let logInfo: any, logWarn: any, logError: any, logDebug: any;
if (typeof window === 'undefined') {
  const loggerModule = require('@rentalshop/utils/server');
  logInfo = loggerModule.logInfo;
  logWarn = loggerModule.logWarn;
  logError = loggerModule.logError;
  logDebug = loggerModule.logDebug;
}

/**
 * POST /api/system/test-axiom
 * Test Axiom logging by sending test logs
 * Requires ADMIN role
 * 
 * Body (optional):
 * {
 *   "level": "info" | "warn" | "error" | "debug",
 *   "message": "Custom test message",
 *   "data": { "key": "value" }
 * }
 */
export const POST = withApiLogging(
  withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest) => {
    try {
      const body = await request.json().catch(() => ({}));
      const level = body.level || 'info';
      const message = body.message || 'Test Axiom logging';
      const testData = body.data || { testId: Date.now(), timestamp: new Date().toISOString() };

      // Check Axiom configuration
      const hasAxiomToken = !!process.env.AXIOM_TOKEN;
      const hasAxiomOrgId = !!process.env.AXIOM_ORG_ID;
      const axiomDataset = process.env.AXIOM_DATASET || 
        (process.env.NODE_ENV === 'production' ? 'anyrent-logs-prod' : 'anyrent-logs-dev');
      const axiomLogLevel = process.env.AXIOM_LOG_LEVEL || 
        (process.env.NODE_ENV === 'production' ? 'warn' : 'info');

      // Send test log based on level
      const logContext = {
        ...testData,
        testEndpoint: '/api/system/test-axiom',
        axiomConfigured: hasAxiomToken && hasAxiomOrgId,
        axiomDataset,
        axiomLogLevel,
      };

      switch (level.toLowerCase()) {
        case 'debug':
          logDebug(message, logContext);
          break;
        case 'warn':
          logWarn(message, logContext);
          break;
        case 'error':
          logError(message, new Error('Test error for Axiom logging'), logContext);
          break;
        case 'info':
        default:
          logInfo(message, logContext);
          break;
      }

      return NextResponse.json(
        ResponseBuilder.success('AXIOM_TEST_LOG_SENT', {
          message: 'Test log sent to Axiom',
          level,
          messageText: message,
          data: testData,
          axiomConfiguration: {
            enabled: hasAxiomToken && hasAxiomOrgId,
            tokenConfigured: hasAxiomToken,
            orgIdConfigured: hasAxiomOrgId,
            dataset: axiomDataset,
            logLevel: axiomLogLevel,
            note: hasAxiomToken && hasAxiomOrgId
              ? `Log sent to Axiom dataset: ${axiomDataset}. Check Axiom dashboard to verify.`
              : 'Axiom not configured. Set AXIOM_TOKEN and AXIOM_ORG_ID to enable Axiom logging.',
          },
          instructions: {
            step1: 'Check Axiom dashboard: https://app.axiom.co',
            step2: `Select dataset: ${axiomDataset}`,
            step3: `Query: ['message'] = '${message}' or ['testId'] = ${testData.testId}`,
            step4: 'Logs should appear within a few seconds',
          },
        })
      );
    } catch (error) {
      const errorResponse = ResponseBuilder.error('AXIOM_TEST_ERROR');
      // Add error details to response
      if (error instanceof Error) {
        errorResponse.error = error.message;
      }
      return NextResponse.json(errorResponse, { status: 500 });
    }
  })
);

/**
 * GET /api/system/test-axiom
 * Get Axiom test configuration and instructions
 * Requires ADMIN role
 */
export const GET = withApiLogging(
  withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest) => {
    const hasAxiomToken = !!process.env.AXIOM_TOKEN;
    const hasAxiomOrgId = !!process.env.AXIOM_ORG_ID;
    const axiomDataset = process.env.AXIOM_DATASET || 
      (process.env.NODE_ENV === 'production' ? 'anyrent-logs-prod' : 'anyrent-logs-dev');
    const axiomLogLevel = process.env.AXIOM_LOG_LEVEL || 
      (process.env.NODE_ENV === 'production' ? 'warn' : 'info');

    return NextResponse.json(
      ResponseBuilder.success('AXIOM_TEST_INFO', {
        axiomConfiguration: {
          enabled: hasAxiomToken && hasAxiomOrgId,
          tokenConfigured: hasAxiomToken,
          orgIdConfigured: hasAxiomOrgId,
          dataset: axiomDataset,
          logLevel: axiomLogLevel,
        },
        howToTest: {
          method: 'POST',
          endpoint: '/api/system/test-axiom',
          body: {
            level: 'info | warn | error | debug',
            message: 'Your test message',
            data: { 'customKey': 'customValue' },
          },
          example: {
            curl: `curl -X POST https://your-api.railway.app/api/system/test-axiom \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"level": "info", "message": "Test Axiom logging", "data": {"testId": 123}}'`,
          },
        },
        verifyLogs: {
          step1: 'Go to Axiom Dashboard: https://app.axiom.co',
          step2: `Select dataset: ${axiomDataset}`,
          step3: 'Query logs using Axiom Query Language (AQL)',
          step4: 'Example query: ["level"] = "info" and ["testEndpoint"] = "/api/system/test-axiom"',
        },
        environmentVariables: {
          required: ['AXIOM_TOKEN', 'AXIOM_ORG_ID'],
          optional: ['AXIOM_DATASET', 'AXIOM_LOG_LEVEL', 'LOG_LEVEL'],
          currentValues: {
            AXIOM_TOKEN: hasAxiomToken ? '***configured***' : 'not set',
            AXIOM_ORG_ID: hasAxiomOrgId ? '***configured***' : 'not set',
            AXIOM_DATASET: axiomDataset,
            AXIOM_LOG_LEVEL: axiomLogLevel,
            NODE_ENV: process.env.NODE_ENV || 'development',
          },
        },
      })
    );
  })
);
