'use client';

import { useEffect, useState } from 'react';
import { getAuthToken } from '@rentalshop/utils';
import dynamic from 'next/dynamic';

// @ts-ignore - Dynamic import issue with Next.js and swagger-ui-react types
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

// Import SwaggerUI CSS
import 'swagger-ui-react/swagger-ui.css';

interface SwaggerUIProps {
  spec: any;
  title?: string;
  description?: string;
  showHeader?: boolean;
  className?: string;
  docExpansion?: 'list' | 'full' | 'none';
  defaultModelsExpandDepth?: number;
  defaultModelExpandDepth?: number;
  displayOperationId?: boolean;
  displayRequestDuration?: boolean;
  filter?: boolean;
  showExtensions?: boolean;
  showCommonExtensions?: boolean;
  supportedSubmitMethods?: ('get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'trace')[];
  tryItOutEnabled?: boolean;
}

export default function SwaggerUIComponent({
  spec,
  title = 'API Documentation',
  description = 'Interactive API documentation',
  showHeader = true,
  className = '',
  docExpansion = 'list',
  defaultModelsExpandDepth = 1,
  defaultModelExpandDepth = 1,
  displayOperationId = false,
  displayRequestDuration = true,
  filter = true,
  showExtensions = true,
  showCommonExtensions = true,
  supportedSubmitMethods = ['get', 'post', 'put', 'delete', 'patch'],
  tryItOutEnabled = true
}: SwaggerUIProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-white ${className}`}>
      {showHeader && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">{title}</h1>
            <p className="text-xl opacity-90">{description}</p>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="swagger-ui-wrapper">
          <SwaggerUI
            spec={spec}
            docExpansion={docExpansion}
            defaultModelsExpandDepth={defaultModelsExpandDepth}
            defaultModelExpandDepth={defaultModelExpandDepth}
            displayOperationId={displayOperationId}
            displayRequestDuration={displayRequestDuration}
            filter={filter}
            showExtensions={showExtensions}
            showCommonExtensions={showCommonExtensions}
            supportedSubmitMethods={supportedSubmitMethods}
            tryItOutEnabled={tryItOutEnabled}
            onComplete={(system: any) => {
              // Customize SwaggerUI after it's loaded
              console.log('SwaggerUI loaded successfully');
              
              // Add custom styling
              const swaggerContainer = document.querySelector('.swagger-ui');
              if (swaggerContainer) {
                swaggerContainer.classList.add('custom-swagger-ui');
              }
            }}
            requestInterceptor={(request: any) => {
              // Add authentication headers if available
              const token = getAuthToken();
              if (token) {
                request.headers.Authorization = `Bearer ${token}`;
              }
              return request;
            }}
            responseInterceptor={(response: any) => {
              // Handle response formatting
              return response;
            }}
          />
        </div>
      </div>

      <style jsx global>{`
        .swagger-ui-wrapper {
          background: white;
        }
        
        .custom-swagger-ui {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .custom-swagger-ui .swagger-ui .topbar {
          background: #1f2937;
          padding: 1rem;
        }
        
        .custom-swagger-ui .swagger-ui .info {
          margin: 2rem 0;
        }
        
        .custom-swagger-ui .swagger-ui .scheme-container {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        
        .custom-swagger-ui .swagger-ui .opblock {
          border-radius: 0.5rem;
          margin: 1rem 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .custom-swagger-ui .swagger-ui .opblock.opblock-get {
          border-color: #10b981;
        }
        
        .custom-swagger-ui .swagger-ui .opblock.opblock-post {
          border-color: #3b82f6;
        }
        
        .custom-swagger-ui .swagger-ui .opblock.opblock-put {
          border-color: #f59e0b;
        }
        
        .custom-swagger-ui .swagger-ui .opblock.opblock-delete {
          border-color: #ef4444;
        }
        
        .custom-swagger-ui .swagger-ui .opblock.opblock-patch {
          border-color: #8b5cf6;
        }
        
        .custom-swagger-ui .swagger-ui .btn.execute {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-weight: 500;
        }
        
        .custom-swagger-ui .swagger-ui .btn.execute:hover {
          background: #2563eb;
          border-color: #2563eb;
        }
        
        .custom-swagger-ui .swagger-ui .btn.authorize {
          background: #10b981;
          border-color: #10b981;
          color: white;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-weight: 500;
        }
        
        .custom-swagger-ui .swagger-ui .btn.authorize:hover {
          background: #059669;
          border-color: #059669;
        }
      `}</style>
    </div>
  );
} 