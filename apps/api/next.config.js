/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporarily disabled standalone mode due to Prisma binary issues
  // TODO: Re-enable after fixing Prisma binary tracing
  // output: 'standalone',
  
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
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    // Include Prisma engine files in output - CRITICAL for standalone mode
    outputFileTracingIncludes: {
      '/**/*': ['../../node_modules/.prisma/client/**/*'],
    },
  },
  // Webpack config for Prisma in monorepo  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '.prisma/client': require('path').join(__dirname, '../../node_modules/.prisma/client'),
      };
    }
    return config;
  },
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