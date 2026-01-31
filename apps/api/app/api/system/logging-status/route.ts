import { NextRequest, NextResponse } from 'next/server';
import { withApiLogging } from '@/lib/api-logging-wrapper';
import { withAuthRoles } from '@rentalshop/auth';
import { USER_ROLE } from '@rentalshop/constants';
import { ResponseBuilder } from '@rentalshop/utils';

/**
 * GET /api/system/logging-status
 * Check logging configuration status (Axiom, file logging, etc.)
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
    const logLevel = process.env.LOG_LEVEL || 
      (process.env.NODE_ENV === 'production' ? 'warn' : 'info');
    
    // Check if Axiom client can be initialized
    let axiomClientStatus = 'not_configured';
    if (hasAxiomToken && hasAxiomOrgId) {
      try {
        // Dynamic import to check if package is available
        const { Axiom } = require('@axiomhq/js');
        const testClient = new Axiom({
          token: process.env.AXIOM_TOKEN,
          orgId: process.env.AXIOM_ORG_ID,
        });
        axiomClientStatus = 'configured';
      } catch (error) {
        axiomClientStatus = `error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    
    return NextResponse.json(
      ResponseBuilder.success('LOGGING_STATUS', {
        environment: process.env.NODE_ENV || 'development',
        fileLogging: {
          enabled: true,
          location: 'logs/combined.log, logs/error.log',
          rotation: 'daily, 10MB, keep 5 files'
        },
        consoleLogging: {
          enabled: true,
          format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
          level: logLevel
        },
        axiomLogging: {
          enabled: hasAxiomToken && hasAxiomOrgId,
          status: axiomClientStatus,
          tokenConfigured: hasAxiomToken,
          orgIdConfigured: hasAxiomOrgId,
          dataset: axiomDataset,
          logLevel: axiomLogLevel,
          note: hasAxiomToken && hasAxiomOrgId 
            ? 'Axiom logging is configured and should be working'
            : 'Set AXIOM_TOKEN and AXIOM_ORG_ID environment variables to enable Axiom logging'
        },
        apiLogging: {
          enabled: true,
          wrapper: 'withApiLogging',
          coverage: 'All API routes use withApiLogging wrapper'
        }
      })
    );
  })
);
