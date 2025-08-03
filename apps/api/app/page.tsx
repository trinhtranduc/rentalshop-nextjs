export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text-primary">
          Rental Shop API
        </h1>
        <p className="text-text-secondary mt-2">
          REST API for rental shop management system
        </p>
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Available Endpoints
          </h2>
          <div className="space-y-2">
            <p className="text-text-secondary">
              • <code className="bg-bg-secondary px-2 py-1 rounded">POST /api/auth/login</code> - User login
            </p>
            <p className="text-text-secondary">
              • <code className="bg-bg-secondary px-2 py-1 rounded">POST /api/auth/register</code> - User registration
            </p>
            <p className="text-text-secondary">
              • <code className="bg-bg-secondary px-2 py-1 rounded">GET /api/docs</code> - API documentation
            </p>
          </div>
        </div>
      </main>
    </div>
  )
} 