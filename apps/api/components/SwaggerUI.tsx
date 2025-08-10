'use client';

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
      
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">API Documentation</h3>
          <p className="text-gray-600 mb-6">
            The SwaggerUI component is temporarily disabled due to type compatibility issues.
          </p>
          <div className="bg-white rounded-lg border p-6 text-left">
            <h4 className="text-lg font-semibold mb-3">Available Endpoints:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Authentication: POST /api/auth/login, POST /api/auth/register</li>
              <li>• Products: GET /api/products, POST /api/products</li>
              <li>• Customers: GET /api/customers, POST /api/customers</li>
              <li>• Orders: GET /api/orders, POST /api/orders</li>
              <li>• Analytics: GET /api/analytics/revenue, GET /api/analytics/orders</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 