'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAuthToken } from '@rentalshop/utils';
import dynamic from 'next/dynamic';
// Note: swagger-ui-react types may not export SwaggerUIProps properly
// We'll use the component type directly

// Dynamic import with proper typing
const SwaggerUI = dynamic(
  () => import('swagger-ui-react'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading API Documentation...</span>
      </div>
    )
  }
) as React.ComponentType<any>;

// Import SwaggerUI CSS
import 'swagger-ui-react/swagger-ui.css';

interface SwaggerUIProps {
  spec: Record<string, any>;
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
  onComplete?: (system: any) => void;
  requestInterceptor?: (request: any) => any;
  responseInterceptor?: (response: any) => any;
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
  tryItOutEnabled = true,
  onComplete,
  requestInterceptor,
  responseInterceptor
}: SwaggerUIProps) {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoized request interceptor with auth token
  const handleRequestInterceptor = useCallback((request: any) => {
    try {
      // Add authentication headers if available
      const token = getAuthToken();
      if (token) {
        request.headers = {
          ...request.headers,
          Authorization: `Bearer ${token}`
        };
      }
      
      // Call custom request interceptor if provided
      if (requestInterceptor) {
        return requestInterceptor(request);
      }
      
      return request;
    } catch (err) {
      console.error('Error in request interceptor:', err);
      return request;
    }
  }, [requestInterceptor]);

  // Memoized response interceptor
  const handleResponseInterceptor = useCallback((response: any) => {
    try {
      // Call custom response interceptor if provided
      if (responseInterceptor) {
        return responseInterceptor(response);
      }
      return response;
    } catch (err) {
      console.error('Error in response interceptor:', err);
      return response;
    }
  }, [responseInterceptor]);

  // Memoized onComplete handler
  const handleComplete = useCallback((system: any) => {
    try {
      console.log('SwaggerUI loaded successfully');
      
      // Add custom styling
      const swaggerContainer = document.querySelector('.swagger-ui');
      if (swaggerContainer) {
        swaggerContainer.classList.add('custom-swagger-ui');
      }
      
      // Security schemes should be available in the UI automatically
      // based on the global security configuration in the OpenAPI spec
      // The "Authorize" button should show the header input fields
      
      // Call custom onComplete if provided
      if (onComplete) {
        onComplete(system);
      }
    } catch (err) {
      console.error('Error in SwaggerUI onComplete:', err);
      setError('Error loading API documentation');
    }
  }, [onComplete]);

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="mt-4 text-gray-600">Loading API Documentation...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Documentation</div>
        <div className="text-gray-600">{error}</div>
        <button 
          onClick={() => {
            setError(null);
            window.location.reload();
          }}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
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
            requestSnippetsEnabled={true}
            requestSnippets={['curl', 'javascript']}
            persistAuthorization={true}
            deepLinking={true}
            onComplete={handleComplete}
            requestInterceptor={handleRequestInterceptor}
            responseInterceptor={handleResponseInterceptor}
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