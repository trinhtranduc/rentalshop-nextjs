'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

interface SwaggerUIProps {
  spec: any;
  title?: string;
  description?: string;
  showHeader?: boolean;
  className?: string;
}

export default function SwaggerUIComponent({
  spec,
  title = 'API Documentation',
  description = 'Interactive API documentation',
  showHeader = true,
  className = ''
}: SwaggerUIProps) {
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
        <SwaggerUI 
          spec={spec}
          docExpansion="list"
          defaultModelsExpandDepth={2}
          defaultModelExpandDepth={2}
          displayOperationId={false}
          displayRequestDuration={true}
          filter={true}
          showExtensions={true}
          showCommonExtensions={true}
          tryItOutEnabled={true}
          requestInterceptor={(request) => {
            // Add authentication token if available
            const token = localStorage.getItem('authToken');
            if (token) {
              request.headers.Authorization = `Bearer ${token}`;
            }
            return request;
          }}
          responseInterceptor={(response) => {
            // Handle responses
            return response;
          }}
          onComplete={(system) => {
            // Add custom styling
            const swaggerContainer = document.querySelector('.swagger-ui');
            if (swaggerContainer) {
              swaggerContainer.classList.add('custom-swagger');
            }
          }}
        />
      </div>

      <style jsx global>{`
        .custom-swagger {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .custom-swagger .swagger-ui .info {
          margin: 0;
          padding: 0;
        }
        
        .custom-swagger .swagger-ui .info .title {
          display: none;
        }
        
        .custom-swagger .swagger-ui .info .description {
          display: none;
        }
        
        .custom-swagger .swagger-ui .scheme-container {
          background: #f8f9fa;
          padding: 20px;
          margin: 0;
          border-radius: 8px;
        }
        
        .custom-swagger .swagger-ui .opblock {
          border-radius: 8px;
          margin-bottom: 16px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .custom-swagger .swagger-ui .opblock.opblock-get {
          border-color: #61affe;
        }
        
        .custom-swagger .swagger-ui .opblock.opblock-post {
          border-color: #49cc90;
        }
        
        .custom-swagger .swagger-ui .opblock.opblock-put {
          border-color: #fca130;
        }
        
        .custom-swagger .swagger-ui .opblock.opblock-delete {
          border-color: #f93e3e;
        }
        
        .custom-swagger .swagger-ui .btn.execute {
          background-color: #4990e2;
          border-color: #4990e2;
        }
        
        .custom-swagger .swagger-ui .btn.execute:hover {
          background-color: #357abd;
          border-color: #357abd;
        }

        .custom-swagger .swagger-ui .opblock-tag {
          font-size: 18px;
          font-weight: 600;
          margin: 20px 0 10px 0;
          padding: 10px 0;
          border-bottom: 2px solid #e5e7eb;
        }

        .custom-swagger .swagger-ui .opblock-tag-section {
          margin-bottom: 30px;
        }

        .custom-swagger .swagger-ui .opblock-summary-description {
          font-size: 14px;
          color: #6b7280;
        }

        .custom-swagger .swagger-ui .opblock-summary-operation-id {
          font-size: 12px;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
} 