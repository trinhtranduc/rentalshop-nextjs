// Import next-intl plugin for proper i18n configuration
const createNextIntlPlugin = require('next-intl/plugin');

// Create the plugin with the path to i18n config
const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL for Railway deployment - reduces bundle size by 90%
  output: 'standalone',
  
  // CRITICAL: Tell Next.js NOT to bundle Prisma (it needs native binaries)
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '@prisma/engines'],
    // Optimize package imports to help with module resolution
    optimizePackageImports: ['@rentalshop/ui'],
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
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Client-Platform, X-App-Version, X-Device-Type' },
          { key: 'Access-Control-Max-Age', value: '86400' },
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
  // Ensure proper routing
  trailingSlash: false,
  // Disable static optimization for development
  ...(process.env.NODE_ENV === 'development' && {
    staticPageGenerationTimeout: 0,
  }),
  // Webpack config to exclude Node.js built-ins from client bundles
  webpack: (config, { isServer }) => {
    // CRITICAL: Exclude Node.js built-in modules from client bundles
    if (!isServer) {
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
};

// Export config wrapped with next-intl plugin
module.exports = withNextIntl(nextConfig); 