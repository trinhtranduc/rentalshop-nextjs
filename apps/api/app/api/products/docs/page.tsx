import React from 'react';

export default function ProductSearchDocsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Product Search API Documentation</h1>
      
      <div className="space-y-8">
        {/* Overview */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Overview</h2>
          <p className="text-gray-600 mb-4">
            The Product Search API provides comprehensive product search functionality including search by name, 
            barcode, outlet, and merchant with various filtering options.
          </p>
        </section>

        {/* General Search */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">General Product Search</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">GET /api/products/search</h3>
            <p className="text-gray-600 mb-4">Search products by name with various filters.</p>
            
            <h4 className="font-medium mb-2">Query Parameters:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>q</code> - Search query for product name (optional)</li>
              <li><code>outletId</code> - Filter by specific outlet (optional)</li>
              <li><code>merchantId</code> - Filter by specific merchant (optional)</li>
              <li><code>categoryId</code> - Filter by specific category (optional)</li>
              <li><code>isActive</code> - Filter by active status (true/false, optional)</li>
              <li><code>inStock</code> - Only products with available stock (true/false, optional)</li>
              <li><code>limit</code> - Number of results per page (1-100, default: 20)</li>
              <li><code>offset</code> - Number of results to skip (default: 0)</li>
            </ul>
            
            <h4 className="font-medium mb-2 mt-4">Example:</h4>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`GET /api/products/search?q=laptop&outletId=outlet123&inStock=true&limit=10

Response:
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product123",
        "name": "MacBook Pro 13-inch",
        "description": "Apple MacBook Pro with M2 chip",
        "barcode": "1234567890123",
        "stock": 5,
        "renting": 2,
        "available": 3,
        "rentPrice": 50.00,
        "salePrice": 1200.00,
        "deposit": 200.00,
        "images": "[\"image1.jpg\", \"image2.jpg\"]",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "outlet": {
          "id": "outlet123",
          "name": "Downtown Branch",
          "merchant": {
            "id": "merchant123",
            "companyName": "ABC Rentals"
          }
        },
        "category": {
          "id": "category123",
          "name": "Electronics"
        }
      }
    ],
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}`}
            </pre>
          </div>
        </section>

        {/* Barcode Search */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Barcode Search</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">GET /api/products/barcode/[barcode]</h3>
            <p className="text-gray-600 mb-4">Search for a product by exact barcode match.</p>
            
            <h4 className="font-medium mb-2">Path Parameters:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>barcode</code> - Product barcode (required)</li>
            </ul>
            
            <h4 className="font-medium mb-2 mt-4">Example:</h4>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`GET /api/products/barcode/1234567890123

Response:
{
  "success": true,
  "data": {
    "id": "product123",
    "name": "MacBook Pro 13-inch",
    "description": "Apple MacBook Pro with M2 chip",
    "barcode": "1234567890123",
    "stock": 5,
    "renting": 2,
    "available": 3,
    "rentPrice": 50.00,
    "salePrice": 1200.00,
    "deposit": 200.00,
    "images": "[\"image1.jpg\", \"image2.jpg\"]",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "outlet": {
      "id": "outlet123",
      "name": "Downtown Branch",
      "merchant": {
        "id": "merchant123",
        "companyName": "ABC Rentals"
      }
    },
    "category": {
      "id": "category123",
      "name": "Electronics"
    }
  }
}`}
            </pre>
          </div>
        </section>

        {/* Products by Outlet */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Products by Outlet</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">GET /api/products/outlet/[outletId]</h3>
            <p className="text-gray-600 mb-4">Get all products from a specific outlet with optional filters.</p>
            
            <h4 className="font-medium mb-2">Path Parameters:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>outletId</code> - Outlet ID (required)</li>
            </ul>
            
            <h4 className="font-medium mb-2">Query Parameters:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>categoryId</code> - Filter by specific category (optional)</li>
              <li><code>isActive</code> - Filter by active status (true/false, optional)</li>
              <li><code>inStock</code> - Only products with available stock (true/false, optional)</li>
              <li><code>limit</code> - Number of results per page (1-100, default: 20)</li>
              <li><code>offset</code> - Number of results to skip (default: 0)</li>
            </ul>
            
            <h4 className="font-medium mb-2 mt-4">Example:</h4>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`GET /api/products/outlet/outlet123?categoryId=category123&inStock=true&limit=15

Response:
{
  "success": true,
  "data": {
    "products": [...],
    "total": 45,
    "limit": 15,
    "offset": 0,
    "hasMore": true
  }
}`}
            </pre>
          </div>
        </section>

        {/* Products by Merchant */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Products by Merchant</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">GET /api/products/merchant/[merchantId]</h3>
            <p className="text-gray-600 mb-4">Get all products from a specific merchant with optional filters.</p>
            
            <h4 className="font-medium mb-2">Path Parameters:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>merchantId</code> - Merchant ID (required)</li>
            </ul>
            
            <h4 className="font-medium mb-2">Query Parameters:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>categoryId</code> - Filter by specific category (optional)</li>
              <li><code>isActive</code> - Filter by active status (true/false, optional)</li>
              <li><code>inStock</code> - Only products with available stock (true/false, optional)</li>
              <li><code>limit</code> - Number of results per page (1-100, default: 20)</li>
              <li><code>offset</code> - Number of results to skip (default: 0)</li>
            </ul>
            
            <h4 className="font-medium mb-2 mt-4">Example:</h4>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`GET /api/products/merchant/merchant123?categoryId=category123&isActive=true&limit=20

Response:
{
  "success": true,
  "data": {
    "products": [...],
    "total": 120,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}`}
            </pre>
          </div>
        </section>

        {/* Usage Examples */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Usage Examples</h2>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Search for laptops</h4>
              <code className="text-sm">GET /api/products/search?q=laptop&inStock=true</code>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Find product by barcode</h4>
              <code className="text-sm">GET /api/products/barcode/1234567890123</code>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Get all active products from an outlet</h4>
              <code className="text-sm">GET /api/products/outlet/outlet123?isActive=true</code>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Get electronics from a merchant</h4>
              <code className="text-sm">GET /api/products/merchant/merchant123?categoryId=electronics&inStock=true</code>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Search with pagination</h4>
              <code className="text-sm">GET /api/products/search?q=phone&limit=10&offset=20</code>
            </div>
          </div>
        </section>

        {/* Error Handling */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Error Handling</h2>
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Common Error Responses:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>400 Bad Request:</strong> Invalid parameters or missing required fields</li>
              <li><strong>404 Not Found:</strong> Product not found (for barcode search)</li>
              <li><strong>500 Internal Server Error:</strong> Database or server error</li>
            </ul>
            
            <h4 className="font-medium mb-2 mt-4">Example Error Responses:</h4>
            <pre className="bg-gray-800 text-red-400 p-3 rounded text-sm">
{`// Invalid limit
{
  "error": "Limit must be between 1 and 100"
}

// Product not found
{
  "error": "Product not found"
}

// Missing barcode
{
  "error": "Barcode is required"
}`}
            </pre>
          </div>
        </section>

        {/* Response Format */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Response Format</h2>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Product Object Structure:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>id</code> - Unique product identifier</li>
              <li><code>name</code> - Product name</li>
              <li><code>description</code> - Product description (nullable)</li>
              <li><code>barcode</code> - Product barcode (nullable)</li>
              <li><code>stock</code> - Total available stock</li>
              <li><code>renting</code> - Currently being rented</li>
              <li><code>available</code> - Available for rent (stock - renting)</li>
              <li><code>rentPrice</code> - Daily rental price</li>
              <li><code>salePrice</code> - Sale price (nullable)</li>
              <li><code>deposit</code> - Security deposit amount</li>
              <li><code>images</code> - JSON string of image URLs</li>
              <li><code>isActive</code> - Product active status</li>
              <li><code>createdAt</code> - Creation timestamp</li>
              <li><code>updatedAt</code> - Last update timestamp</li>
              <li><code>outlet</code> - Associated outlet information</li>
              <li><code>category</code> - Product category information</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
} 