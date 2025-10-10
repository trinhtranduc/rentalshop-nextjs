import React from 'react';

export default function AnalyticsDocsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Analytics API Documentation</h1>
      
      <div className="space-y-8">
        {/* Overview */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Overview</h2>
          <p className="text-gray-600 mb-4">
            The Analytics API provides comprehensive insights into rental shop performance including real income, 
            future income, and order statistics with various filtering options.
          </p>
        </section>

        {/* Dashboard Analytics */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Dashboard Analytics</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">GET /api/analytics/dashboard</h3>
            <p className="text-gray-600 mb-4">Get comprehensive analytics for common time periods.</p>
            
            <h4 className="font-medium mb-2">Query Parameters:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>period</code> - Time period (today, week, month, year, last7days, last30days)</li>
              <li><code>merchantId</code> - Filter by specific merchant (optional)</li>
              <li><code>outletId</code> - Filter by specific outlet (optional)</li>
            </ul>
            
            <h4 className="font-medium mb-2 mt-4">Example:</h4>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`GET /api/analytics/dashboard?period=month&merchantId=merchant123

Response:
{
  "success": true,
  "data": {
    "realIncome": {
      "totalIncome": 15000,
      "averageOrderValue": 150,
      "orderCount": 100,
      "groupedData": [...],
      "period": {...}
    },
    "futureIncome": {
      "totalIncome": 5000,
      "averageOrderValue": 125,
      "orderCount": 40,
      "groupedData": [...],
      "period": {...}
    },
    "orderStats": {
      "totalOrders": 140,
      "statusBreakdown": {
        "COMPLETED": 100,
        "BOOKED": 40
      },
      "groupedData": [...],
      "period": {...}
    },
    "summary": {
      "totalRealIncome": 15000,
      "totalFutureIncome": 5000,
      "totalOrders": 140,
      "averageOrderValue": 150,
      "completionRate": 71.43
    },
    "period": "month",
    "dateRange": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-31T23:59:59.999Z"
    }
  }
}`}
            </pre>
          </div>
        </section>

        {/* Real Income */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Real Income Analytics</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">GET /api/analytics/real-income</h3>
            <p className="text-gray-600 mb-4">Get real income from completed payments.</p>
            
            <h4 className="font-medium mb-2">Query Parameters:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>startDate</code> - Start date (YYYY-MM-DD) - Required</li>
              <li><code>endDate</code> - End date (YYYY-MM-DD) - Required</li>
              <li><code>groupBy</code> - Group by (merchant, outlet, date, month, year) - Optional</li>
              <li><code>merchantId</code> - Filter by specific merchant (optional)</li>
              <li><code>outletId</code> - Filter by specific outlet (optional)</li>
            </ul>
            
            <h4 className="font-medium mb-2 mt-4">Example:</h4>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`GET /api/analytics/real-income?startDate=2024-01-01&endDate=2024-01-31&groupBy=merchant

Response:
{
  "success": true,
  "data": {
    "totalIncome": 15000,
    "averageOrderValue": 150,
    "orderCount": 100,
    "groupedData": [
      {
        "merchantId": "merchant123",
        "merchantName": "ABC Rentals",
        "totalIncome": 8000,
        "orderCount": 50
      },
      {
        "merchantId": "merchant456",
        "merchantName": "XYZ Rentals",
        "totalIncome": 7000,
        "orderCount": 50
      }
    ],
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-31T23:59:59.999Z"
    }
  }
}`}
            </pre>
          </div>
        </section>

        {/* Future Income */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Future Income Analytics</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">GET /api/analytics/future-income</h3>
            <p className="text-gray-600 mb-4">Get future income from booked but not completed rentals.</p>
            
            <h4 className="font-medium mb-2">Query Parameters:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>startDate</code> - Start date (YYYY-MM-DD) - Required</li>
              <li><code>endDate</code> - End date (YYYY-MM-DD) - Required</li>
              <li><code>groupBy</code> - Group by (merchant, outlet, date, month, year) - Optional</li>
              <li><code>merchantId</code> - Filter by specific merchant (optional)</li>
              <li><code>outletId</code> - Filter by specific outlet (optional)</li>
            </ul>
          </div>
        </section>

        {/* Order Statistics */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Order Statistics</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">GET /api/analytics/orders</h3>
            <p className="text-gray-600 mb-4">Get order statistics with status breakdown.</p>
            
            <h4 className="font-medium mb-2">Query Parameters:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>startDate</code> - Start date (YYYY-MM-DD) - Required</li>
              <li><code>endDate</code> - End date (YYYY-MM-DD) - Required</li>
              <li><code>groupBy</code> - Group by (merchant, outlet, date, month, year) - Optional</li>
              <li><code>merchantId</code> - Filter by specific merchant (optional)</li>
              <li><code>outletId</code> - Filter by specific outlet (optional)</li>
            </ul>
            
            <h4 className="font-medium mb-2 mt-4">Example:</h4>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`GET /api/analytics/orders?startDate=2024-01-01&endDate=2024-01-31&groupBy=outlet

Response:
{
  "success": true,
  "data": {
    "totalOrders": 140,
    "statusBreakdown": {
      "PENDING": 20,
              "BOOKED": 40,
      "ACTIVE": 30,
      "COMPLETED": 100,
      "CANCELLED": 10
    },
    "groupedData": [
      {
        "outletId": "outlet123",
        "outletName": "Downtown Branch",
        "merchantName": "ABC Rentals",
        "totalOrders": 80,
        "statusBreakdown": {
          "COMPLETED": 60,
          "BOOKED": 20
        }
      }
    ],
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-31T23:59:59.999Z"
    }
  }
}`}
            </pre>
          </div>
        </section>

        {/* Comprehensive Analytics */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Comprehensive Analytics</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">GET /api/analytics/comprehensive</h3>
            <p className="text-gray-600 mb-4">Get all analytics data in a single request.</p>
            
            <h4 className="font-medium mb-2">Query Parameters:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>startDate</code> - Start date (YYYY-MM-DD) - Required</li>
              <li><code>endDate</code> - End date (YYYY-MM-DD) - Required</li>
              <li><code>groupBy</code> - Group by (merchant, outlet, date, month, year) - Optional</li>
              <li><code>merchantId</code> - Filter by specific merchant (optional)</li>
              <li><code>outletId</code> - Filter by specific outlet (optional)</li>
            </ul>
          </div>
        </section>

        {/* Usage Examples */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Usage Examples</h2>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Today's Dashboard</h4>
              <code className="text-sm">GET /api/analytics/dashboard?period=today</code>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">This Month's Income by Merchant</h4>
              <code className="text-sm">GET /api/analytics/real-income?startDate=2024-01-01&endDate=2024-01-31&groupBy=merchant</code>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Last 7 Days Orders by Outlet</h4>
              <code className="text-sm">GET /api/analytics/orders?startDate=2024-01-24&endDate=2024-01-31&groupBy=outlet</code>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Specific Merchant Analytics</h4>
              <code className="text-sm">GET /api/analytics/dashboard?period=month&merchantId=merchant123</code>
            </div>
          </div>
        </section>

        {/* Error Handling */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Error Handling</h2>
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Common Error Responses:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>400 Bad Request:</strong> Missing required parameters or invalid date format</li>
              <li><strong>500 Internal Server Error:</strong> Database or server error</li>
            </ul>
            
            <h4 className="font-medium mb-2 mt-4">Example Error Response:</h4>
            <pre className="bg-gray-800 text-red-400 p-3 rounded text-sm">
{`{
  "error": "startDate and endDate are required"
}`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
} 