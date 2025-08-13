import Link from 'next/link';

export default function ProductDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Product API Documentation</h1>
              <p className="mt-2 text-gray-600">
                Complete documentation for all product-related endpoints
              </p>
            </div>
            <Link 
              href="/api/products/swagger"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              🚀 Interactive Swagger UI
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Links */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Navigation</h2>
              <nav className="space-y-2">
                <a href="#overview" className="block text-blue-600 hover:text-blue-800">Overview</a>
                <a href="#authentication" className="block text-blue-600 hover:text-blue-800">Authentication</a>
                <a href="#endpoints" className="block text-blue-600 hover:text-blue-800">Endpoints</a>
                <a href="#models" className="block text-blue-600 hover:text-blue-800">Data Models</a>
                <a href="#examples" className="block text-blue-600 hover:text-blue-800">Examples</a>
              </nav>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">API Base URL</h3>
                <code className="block bg-gray-100 px-3 py-2 rounded text-sm">
                  http://localhost:3002/api
                </code>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overview */}
            <section id="overview" className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
              <p className="text-gray-600 mb-4">
                The Product API provides comprehensive endpoints for managing products in the rental shop system. 
                All endpoints require authentication and support various filtering, searching, and pagination options.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">🔍 Search & Filter</h3>
                  <p className="text-blue-700 text-sm">
                    Advanced search by name, barcode, category, outlet, and more
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">📊 CRUD Operations</h3>
                  <p className="text-green-700 text-sm">
                    Create, read, update, and delete products with validation
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-2">🏪 Multi-Outlet</h3>
                  <p className="text-purple-700 text-sm">
                    Support for multiple outlets and merchant management
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-orange-900 mb-2">📱 Mobile Optimized</h3>
                  <p className="text-orange-700 text-sm">
                    Specialized endpoints for mobile applications
                  </p>
                </div>
              </div>
            </section>

            {/* Authentication */}
            <section id="authentication" className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication</h2>
              <p className="text-gray-600 mb-4">
                All Product API endpoints require authentication using JWT Bearer tokens.
              </p>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Authorization Header</h3>
                <code className="text-sm">
                  Authorization: Bearer &lt;your-jwt-token&gt;
                </code>
              </div>
              
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Important</h3>
                <p className="text-yellow-700 text-sm">
                  Make sure to include the Bearer token in all requests. Without proper authentication, 
                  you'll receive a 401 Unauthorized response.
                </p>
              </div>
            </section>

            {/* Endpoints */}
            <section id="endpoints" className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">API Endpoints</h2>
              
              <div className="space-y-6">
                {/* GET /api/products */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">GET</span>
                    <code className="text-sm font-mono">/api/products</code>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    Get products with filtering and pagination
                  </p>
                  <div className="text-xs text-gray-500">
                    Query params: outletId, categoryId, isActive, search, page, limit, sortBy, sortOrder
                  </div>
                </div>

                {/* POST /api/products */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">POST</span>
                    <code className="text-sm font-mono">/api/products</code>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    Create a new product
                  </p>
                  <div className="text-xs text-gray-500">
                    Required: name, stock, rentPrice, deposit, categoryId, outletId
                  </div>
                </div>

                {/* GET /api/products/search */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">GET</span>
                    <code className="text-sm font-mono">/api/products/search</code>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    Search products by name or barcode
                  </p>
                  <div className="text-xs text-gray-500">
                    Query params: q, outletId, merchantId, categoryId, isActive, inStock, limit, offset
                  </div>
                </div>

                {/* GET /api/products/barcode/{barcode} */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">GET</span>
                    <code className="text-sm font-mono">/api/products/barcode/{'{barcode}'}</code>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    Find product by exact barcode
                  </p>
                  <div className="text-xs text-gray-500">
                    Path param: barcode (string)
                  </div>
                </div>

                {/* GET /api/products/outlet/{outletId} */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">GET</span>
                    <code className="text-sm font-mono">/api/products/outlet/{'{outletId}'}</code>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    Get products by outlet
                  </p>
                  <div className="text-xs text-gray-500">
                    Path param: outletId (string)
                  </div>
                </div>

                {/* GET /api/products/merchant/{merchantId} */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">GET</span>
                    <code className="text-sm font-mono">/api/products/merchant/{'{merchantId}'}</code>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    Get products by merchant
                  </p>
                  <div className="text-xs text-gray-500">
                    Path param: merchantId (string)
                  </div>
                </div>

                {/* GET /api/products/{id} */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">GET</span>
                    <code className="text-sm font-mono">/api/products/{'{id}'}</code>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    Get product by ID
                  </p>
                  <div className="text-xs text-gray-500">
                    Path param: id (string)
                  </div>
                </div>

                {/* PUT /api/products/{id} */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">PUT</span>
                    <code className="text-sm font-mono">/api/products/{'{id}'}</code>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    Update product
                  </p>
                  <div className="text-xs text-gray-500">
                    Path param: id (string) | Body: ProductUpdateInput
                  </div>
                </div>

                {/* DELETE /api/products/{id} */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">DELETE</span>
                    <code className="text-sm font-mono">/api/products/{'{id}'}</code>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    Delete product (soft delete)
                  </p>
                  <div className="text-xs text-gray-500">
                    Path param: id (string)
                  </div>
                </div>

                {/* GET /api/products/{id}/availability */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">GET</span>
                    <code className="text-sm font-mono">/api/products/{'{id}'}/availability</code>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    Check product availability
                  </p>
                  <div className="text-xs text-gray-500">
                    Path param: id (string)
                  </div>
                </div>
              </div>
            </section>

            {/* Data Models */}
            <section id="models" className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Models</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Product</h3>
                  <div className="bg-gray-100 p-4 rounded-lg text-sm">
                    <pre className="whitespace-pre-wrap">
{`{
  id: string
  name: string
  description: string | null
  barcode: string | null
  stock: number
  renting: number
  available: number
  rentPrice: number
  salePrice: number | null
  deposit: number
  images: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  outlet: {
    id: string
    name: string
    merchant: {
      id: string
      companyName: string
    }
  }
  category: {
    id: string
    name: string
  }
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">ProductInput (Create)</h3>
                  <div className="bg-gray-100 p-4 rounded-lg text-sm">
                    <pre className="whitespace-pre-wrap">
{`{
  name: string (required)
  description?: string
  barcode?: string
  stock: number (required, min: 0)
  rentPrice: number (required, min: 0)
  salePrice?: number (min: 0)
  deposit: number (required, min: 0)
  categoryId: string (required)
  outletId: string (required)
  images?: string[]
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">ProductUpdateInput (Update)</h3>
                  <div className="bg-gray-100 p-4 rounded-lg text-sm">
                    <pre className="whitespace-pre-wrap">
{`{
  name?: string (min: 1)
  description?: string
  barcode?: string
  stock?: number (min: 0)
  rentPrice?: number (min: 0)
  salePrice?: number (min: 0)
  deposit?: number (min: 0)
  categoryId?: string
  outletId?: string
  images?: string[]
  isActive?: boolean
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </section>

            {/* Examples */}
            <section id="examples" className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Examples</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Search Products</h3>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <code className="text-sm">
                      GET /api/products/search?q=laptop&outletId=123&limit=10
                    </code>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Create Product</h3>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <code className="text-sm">
                      POST /api/products<br/>
                      {`{
  "name": "MacBook Pro 16",
  "description": "Latest MacBook Pro for rent",
  "stock": 5,
  "rentPrice": 50.00,
  "deposit": 500.00,
  "categoryId": "cat_123",
  "outletId": "outlet_456"
}`}
                    </code>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Find by Barcode</h3>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <code className="text-sm">
                      GET /api/products/barcode/1234567890123
                    </code>
                  </div>
                </div>
              </div>
            </section>

            {/* Interactive Documentation */}
            <section className="bg-blue-50 rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-blue-900 mb-4">
                  🚀 Try It Out!
                </h2>
                <p className="text-blue-700 mb-6">
                  Use our interactive Swagger UI to test all endpoints with real requests and responses.
                </p>
                <Link 
                  href="/api/products/swagger"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Open Interactive Documentation
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 