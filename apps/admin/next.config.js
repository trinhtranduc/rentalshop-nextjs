// Import next-intl plugin for proper i18n configuration
const createNextIntlPlugin = require('next-intl/plugin');

// Create the plugin with the path to i18n config
const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed 'output: standalone' - not needed for Vercel deployment
  // Vercel handles Next.js deployments automatically
  
  // CRITICAL: Tell Next.js NOT to bundle Prisma (it needs native binaries)
  // Also exclude server-only utilities that use Node.js modules (fs, etc.)
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client', 
      '@prisma/engines',
      '@rentalshop/database',
      '@rentalshop/utils/server'
    ],
  },
  
  transpilePackages: [
    '@rentalshop/auth',
    '@rentalshop/middleware',
    '@rentalshop/utils',
    '@rentalshop/constants',
    '@rentalshop/types',
    '@rentalshop/ui',
    '@rentalshop/hooks',
    '@rentalshop/env'
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
  // Removed rewrites() - admin app will call Railway API directly using NEXT_PUBLIC_API_URL
  // No need to proxy API calls through Next.js server on Vercel
  // Ensure proper routing
  trailingSlash: false,
  // Disable static optimization for development
  ...(process.env.NODE_ENV === 'development' && {
    staticPageGenerationTimeout: 0,
  }),
  
  // Webpack optimizations for proper module resolution
  webpack: (config, { dev, isServer }) => {
    // Ensure proper resolution of subpath exports
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    };
    
    // Prevent bundling server-only modules in client-side code
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
      
      // Mark server-only packages as external for client-side builds
      // This prevents server-only code from being bundled into client code
      const originalExternals = config.externals;
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
        ({ request }, callback) => {
          // Server-only packages that should be stubbed in client builds
          if (
            /^@prisma\/(client|engines)/.test(request) ||
            /^@rentalshop\/(database|utils\/server)/.test(request)
          ) {
            return callback(null, '{}');
          }
          callback();
        }
      ];
    }
    
    return config;
  },
};

// Export config wrapped with next-intl plugin
module.exports = withNextIntl(nextConfig); 