'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSpec = async () => {
      try {
        const response = await fetch('/api/docs');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSpec(data);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching API spec:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchSpec();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SwaggerUI...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Error Loading SwaggerUI</h1>
          <p className="text-gray-600">{error}</p>
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p className="text-sm text-gray-700">Debug info:</p>
            <p className="text-xs text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">No API Specification Found</h1>
          <p className="text-gray-600">The API specification could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
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
          console.log('SwaggerUI Request:', request);
          return request;
        }}
        responseInterceptor={(response) => {
          console.log('SwaggerUI Response:', response);
          return response;
        }}
      />
    </div>
  );
} 