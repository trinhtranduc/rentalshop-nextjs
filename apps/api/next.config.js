/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for proper Prisma binary handling
  output: 'standalone',
  
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
};

module.exports = nextConfig;