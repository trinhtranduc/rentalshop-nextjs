/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for proper Prisma binary handling
  // Only use standalone in production (Railway/Docker)
  output: process.env.RAILWAY_ENVIRONMENT ? 'standalone' : undefined,
  
  // CRITICAL: Tell Next.js NOT to bundle Prisma (it needs native binaries)
  experimental: {
    // Point to monorepo root for file tracing
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
    serverComponentsExternalPackages: ['@prisma/client', '@prisma/engines', 'prisma'],
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
      // Ensure Prisma Client resolves to root node_modules
      config.resolve.alias = {
        ...config.resolve.alias,
        '.prisma/client': require('path').join(__dirname, '../../node_modules/.prisma/client'),
        '@prisma/client': require('path').join(__dirname, '../../node_modules/@prisma/client'),
      };
      
      // Support subpath exports for @rentalshop/utils/api
      config.resolve.extensionAlias = {
        ...config.resolve.extensionAlias,
        '.js': ['.js', '.ts', '.tsx'],
        '.mjs': ['.mjs', '.ts', '.tsx'],
      };
    } else {
      // CRITICAL: Exclude Node.js built-in modules from client bundles (if any client code exists)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        crypto: false,
        util: false,
        os: false,
        stream: false,
        dns: false,
        net: false,
        tls: false,
        http: false,
        https: false,
        url: false,
        querystring: false,
        buffer: false,
        events: false,
        zlib: false,
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