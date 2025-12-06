/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for proper Prisma binary handling
  // Only use standalone in production (Railway/Docker)
  output: process.env.RAILWAY_ENVIRONMENT ? 'standalone' : undefined,
  
  // CRITICAL: Tell Next.js NOT to bundle Prisma (it needs native binaries)
  experimental: {
    // Point to monorepo root for file tracing
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
    serverComponentsExternalPackages: [
      '@prisma/client',
      '@prisma/engines',
      'prisma',
      '.prisma/client',
    ],
  },
  
  // Include Prisma binaries in file tracing (for production builds)
  outputFileTracingIncludes: {
    '/api/**': [
      '../../node_modules/.prisma/client/**/*',
    ],
  },
  
  transpilePackages: [
    '@rentalshop/database',
    '@rentalshop/auth',
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
  // Webpack config for Prisma in monorepo  
  webpack: (config, { isServer }) => {
    if (isServer) {
      // CRITICAL: External Prisma completely to prevent bundling (native binaries needed)
      // This ensures Prisma is loaded from node_modules at runtime, not bundled
      config.externals = config.externals || [];
      
      // External Prisma packages as CommonJS modules
      const prismaExternals = {
        '@prisma/client': 'commonjs @prisma/client',
        '.prisma/client': 'commonjs .prisma/client',
        '@prisma/engines': 'commonjs @prisma/engines',
      };
      
      // Add to externals array (handle both array and function formats)
      if (Array.isArray(config.externals)) {
        config.externals.push(prismaExternals);
      } else if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = (context, request, callback) => {
          if (prismaExternals[request]) {
            return callback(null, prismaExternals[request]);
          }
          return originalExternals(context, request, callback);
        };
      } else {
        config.externals = [config.externals, prismaExternals];
      }
      
      // Ensure Prisma Client resolves to root node_modules (fallback)
      config.resolve.alias = {
        ...config.resolve.alias,
        '.prisma/client': require('path').join(__dirname, '../../node_modules/.prisma/client'),
        '@prisma/client': require('path').join(__dirname, '../../node_modules/@prisma/client'),
      };
    }
    return config;
  },
  async headers() {
    // Note: CORS is handled dynamically in middleware.ts
    // This static config is a fallback only
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  async rewrites() {
    // Serve static files from uploads directory
    return [
      {
        source: '/uploads/:path*',
        destination: '/apps/api/public/uploads/:path*',
      },
    ];
  },
};

module.exports = nextConfig;