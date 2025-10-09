/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL for Railway deployment - reduces bundle size by 90%
  output: 'standalone',
  
  // CRITICAL for monorepo - enables Next.js to trace workspace dependencies
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  
  transpilePackages: [
    '@rentalshop/auth',
    '@rentalshop/database', 
    '@rentalshop/middleware',
    '@rentalshop/utils',
    '@rentalshop/constants',
    '@rentalshop/types'
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Prevent webpack from bundling Prisma during build
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark Prisma as external to prevent bundling
      const externals = config.externals || [];
      config.externals = [
        ...externals,
        '@prisma/client',
        '.prisma/client',
        'prisma',
      ];
      
      // Add alias to ensure Prisma Client is loaded from correct location
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        '.prisma/client': require.resolve('@prisma/client'),
      };
    }
    return config;
  },
  // CORS headers
  async headers() {
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
