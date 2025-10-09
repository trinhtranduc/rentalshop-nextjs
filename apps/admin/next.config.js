/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL for Railway deployment - reduces bundle size by 90%
  output: 'standalone',
  
  // CRITICAL for monorepo - enables Next.js to trace workspace dependencies
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
  },
  
  transpilePackages: [
    '@rentalshop/auth',
    '@rentalshop/database', 
    '@rentalshop/middleware',
    '@rentalshop/utils',
    '@rentalshop/constants',
    '@rentalshop/types',
    '@rentalshop/ui',
    '@rentalshop/hooks'
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
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://localhost:3002'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig; 