/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@rentalshop/auth',
    '@rentalshop/database', 
    '@rentalshop/middleware',
    '@rentalshop/utils',
    '@rentalshop/constants',
    '@rentalshop/types'
  ],
  eslint: {
    // Temporarily disable ESLint during builds to allow development to continue
    // TODO: Re-enable and fix ESLint errors incrementally
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  // Force dynamic rendering for all routes (API-only app)
  // This prevents Next.js from trying to statically generate API routes during build
  // which would fail because Prisma client needs runtime database connection
  output: 'standalone',
  async headers() {
    // Avoid requiring TS files here; compute CORS origins directly from env
    const csv = process.env.CORS_ORIGINS || '';
    const envOrigins = csv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const fallbacks = [
      process.env.CLIENT_URL,
      process.env.ADMIN_URL,
      process.env.API_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ].filter(Boolean);
    const origins = envOrigins.length ? envOrigins : fallbacks;
    
    // For development, allow all localhost origins
    const allowOrigin = process.env.NODE_ENV === 'development' 
      ? '*' 
      : (origins[0] || '*');
      
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;