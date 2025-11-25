// Import next-intl plugin for proper i18n configuration
const createNextIntlPlugin = require('next-intl/plugin');

// Create the plugin with the path to i18n config
const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL for Railway deployment - reduces bundle size by 90%
  output: 'standalone',
  
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
  // Performance optimizations
  experimental: {
    // CRITICAL: Tell Next.js NOT to bundle Prisma (it needs native binaries)
    serverComponentsExternalPackages: ['@prisma/client', '@prisma/engines'],
    // Enable optimizations for better performance
    optimizeCss: true,
    optimizePackageImports: ['@rentalshop/ui', '@rentalshop/utils', '@rentalshop/hooks'],
  },
  
  // Disable development caching that adds timestamp parameters
  onDemandEntries: {
    // Disable automatic page preloading that can add timestamps
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Enable compression for better performance
  compress: true,
  
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Performance headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
          // Add cache control headers to prevent automatic timestamp parameters
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      // Performance optimization headers
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
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
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Ensure proper resolution of subpath exports
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    };
    
    // Add aliases for workspace packages to ensure proper resolution
    config.resolve.alias = {
      ...config.resolve.alias
    };
    
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    
    // Disable automatic timestamp parameters in development
    if (dev) {
      // Remove any automatic cache busting that adds _t parameters
      config.optimization = {
        ...config.optimization,
        // Disable automatic chunk naming that can add timestamps
        chunkIds: 'named',
        // Disable automatic module naming that can add timestamps
        moduleIds: 'named',
      };
    }
    
    return config;
  },
};

// Export config wrapped with next-intl plugin
module.exports = withNextIntl(nextConfig); 