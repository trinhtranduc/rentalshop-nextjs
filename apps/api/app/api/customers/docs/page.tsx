import React from 'react';

export default function CustomerAPIDocs() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Customer API Documentation</h1>
      
      <div className="space-y-8">
        {/* Overview */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Overview</h2>
          <p className="text-gray-600 mb-4">
            The Customer API provides comprehensive customer management functionality including creation, 
            retrieval, updating, and deletion of customer records. All endpoints require authentication 
            and support proper validation and error handling.
          </p>
        </section>

        {/* Authentication */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="font-medium mb-2">All endpoints require a valid JWT token in the Authorization header:</p>
            <code className="bg-gray-200 px-2 py-1 rounded text-sm">
              Authorization: Bearer &lt;your-jwt-token&gt;
            </code>
          </div>
        </section>

        {/* GET /api/customers */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">GET /api/customers</h2>
          <p className="text-gray-600 mb-4">Retrieve customers with filtering, pagination, and search capabilities.</p>
          
          <h3 className="text-lg font-medium mb-2">Query Parameters:</h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <ul className="space-y-2">
              <li><strong>merchantId</strong> - Filter by merchant ID</li>
              <li><strong>isActive</strong> - Filter by active status (true/false)</li>
              <li><strong>search</strong> - Search in name, email, phone, or ID number</li>
              <li><strong>city</strong> - Filter by city</li>
              <li><strong>state</strong> - Filter by state</li>
              <li><strong>country</strong> - Filter by country</li>
              <li><strong>idType</strong> - Filter by ID type (passport, drivers_license, national_id, other)</li>
              <li><strong>page</strong> - Page number (default: 1)</li>
              <li><strong>limit</strong> - Items per page (default: 20, max: 100)</li>
              <li><strong>customerId</strong> - Get specific customer by ID</li>
            </ul>
          </div>

          <h3 className="text-lg font-medium mb-2">Response Format:</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm overflow-x-auto">
{`{
  "success": true,
  "data": {
    "customers": [...],
    "total": 100,
    "page": 1,
    "totalPages": 5,
    "hasMore": true
  }
}`}
            </pre>
          </div>
        </section>

        {/* POST /api/customers */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">POST /api/customers</h2>
          <p className="text-gray-600 mb-4">Create a new customer record.</p>
          
          <h3 className="text-lg font-medium mb-2">Request Body:</h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <pre className="text-sm overflow-x-auto">
{`{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "string (required, valid email)",
  "phone": "string (required, min 8 chars, valid format)",
  "merchantId": "string (required)",
  "address": "string (optional)",
  "city": "string (optional)",
  "state": "string (optional)",
  "zipCode": "string (optional)",
  "country": "string (optional)",
  "dateOfBirth": "string (optional, ISO date)",
  "idNumber": "string (optional)",
  "idType": "string (optional, enum: passport, drivers_license, national_id, other)",
  "notes": "string (optional)"
}`}
            </pre>
          </div>

          <h3 className="text-lg font-medium mb-2">Response Format:</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm overflow-x-auto">
{`{
  "success": true,
  "data": {
    "id": "string",
    "publicId": 123,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "merchantId": "string",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "message": "Customer created successfully"
}`}
            </pre>
          </div>
        </section>

        {/* PUT /api/customers */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">PUT /api/customers</h2>
          <p className="text-gray-600 mb-4">Update an existing customer record.</p>
          
          <h3 className="text-lg font-medium mb-2">Query Parameters:</h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p><strong>customerId</strong> - The ID of the customer to update (required)</p>
          </div>

          <h3 className="text-lg font-medium mb-2">Request Body:</h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm">All fields are optional. Only include the fields you want to update.</p>
            <pre className="text-sm overflow-x-auto mt-2">
{`{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "email": "string (optional, valid email)",
  "phone": "string (optional, min 8 chars, valid format)",
  "address": "string (optional)",
  "city": "string (optional)",
  "state": "string (optional)",
  "zipCode": "string (optional)",
  "country": "string (optional)",
  "dateOfBirth": "string (optional, ISO date)",
  "idNumber": "string (optional)",
  "idType": "string (optional, enum: passport, drivers_license, national_id, other)",
  "notes": "string (optional)",
  "isActive": "boolean (optional)"
}`}
            </pre>
          </div>
        </section>

        {/* DELETE /api/customers */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">DELETE /api/customers</h2>
          <p className="text-gray-600 mb-4">Soft delete a customer (sets isActive to false).</p>
          
          <h3 className="text-lg font-medium mb-2">Query Parameters:</h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p><strong>customerId</strong> - The ID of the customer to delete (required)</p>
          </div>
        </section>

        {/* Error Handling */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Error Handling</h2>
          <div className="space-y-4">
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <h3 className="text-lg font-medium text-red-800 mb-2">400 Bad Request</h3>
              <p className="text-red-700">Invalid request payload or validation errors</p>
            </div>
            
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <h3 className="text-lg font-medium text-red-800 mb-2">401 Unauthorized</h3>
              <p className="text-red-700">Missing or invalid authentication token</p>
            </div>
            
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <h3 className="text-lg font-medium text-red-800 mb-2">404 Not Found</h3>
              <p className="text-red-700">Customer not found</p>
            </div>
            
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <h3 className="text-lg font-medium text-red-800 mb-2">500 Internal Server Error</h3>
              <p className="text-red-700">Server-side error</p>
            </div>
          </div>
        </section>

        {/* Validation Rules */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Validation Rules</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <ul className="space-y-2 text-sm">
              <li><strong>firstName</strong>: Required, minimum 1 character</li>
              <li><strong>lastName</strong>: Required, minimum 1 character</li>
              <li><strong>email</strong>: Required, valid email format</li>
              <li><strong>phone</strong>: Required, minimum 8 characters, only numbers, +, -, spaces, parentheses</li>
              <li><strong>merchantId</strong>: Required, valid merchant ID</li>
              <li><strong>dateOfBirth</strong>: Optional, valid ISO date string</li>
              <li><strong>idType</strong>: Optional, must be one of: passport, drivers_license, national_id, other</li>
            </ul>
          </div>
        </section>

        {/* Example Usage */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Example Usage</h2>
          
          <h3 className="text-lg font-medium mb-2">Create Customer:</h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <pre className="text-sm overflow-x-auto">
{`curl -X POST http://localhost:3000/api/customers \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "merchantId": "merchant_123",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }'`}
            </pre>
          </div>

          <h3 className="text-lg font-medium mb-2">Search Customers:</h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <pre className="text-sm overflow-x-auto">
{`curl "http://localhost:3000/api/customers?search=john&limit=10&page=1" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`}
            </pre>
          </div>

          <h3 className="text-lg font-medium mb-2">Update Customer:</h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <pre className="text-sm overflow-x-auto">
{`curl -X PUT "http://localhost:3000/api/customers?customerId=CUSTOMER_ID" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "+1987654321",
    "city": "Los Angeles"
  }'`}
            </pre>
          </div>
        </section>

        {/* Testing */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Testing</h2>
          <p className="text-gray-600 mb-4">
            Use the test endpoint to validate your payload before making actual API calls:
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <p className="text-blue-800">
              <strong>POST /api/customers/test</strong> - Validates customer creation payload without creating a record
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
