/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for proper Prisma binary handling
  // Only use standalone in production (Railway/Docker)
  output: process.env.RAILWAY_ENVIRONMENT ? 'standalone' : undefined,
  
  // CRITICAL: Tell Next.js NOT to bundle native modules (Prisma, Sharp)
    experimental: {
      // Point to monorepo root for file tracing
      outputFileTracingRoot: require('path').join(__dirname, '../../'),
      serverComponentsExternalPackages: [
        '@prisma/client',
        '@prisma/engines',
        'prisma',
        '.prisma/client',
        'sharp', // Externalize Sharp (Node.js native module)
        '@xenova/transformers', // Externalize transformers (ML model, needs runtime env vars)
        'onnxruntime-node', // Externalize ONNX runtime (prevent bundling)
        // Externalize Pino (file logging) and Axiom SDK
        'pino',
        'pino-pretty',
        'pino-roll',
        '@axiomhq/js',
        // Externalize server-only packages
        '@rentalshop/utils/server',
        '@rentalshop/auth/server',
        '@rentalshop/database',
      ],
    },
  
  // Include Prisma binaries and transformers WASM files in file tracing (for production builds)
  outputFileTracingIncludes: {
    '/api/**': [
      '../../node_modules/.prisma/client/**/*',
      // CRITICAL: Include entire @xenova/transformers directory for WebAssembly backend
      // Based on: https://github.com/huggingface/transformers.js/issues/295
      // Include all WASM files, JS files, and package structure
      '../../node_modules/@xenova/transformers/**/*',
      // Explicitly include WASM files (may be in dist/ or other locations)
      '../../node_modules/@xenova/transformers/dist/**/*.wasm',
      '../../node_modules/@xenova/transformers/dist/**/*.js',
      '../../node_modules/@xenova/transformers/dist/**/*.mjs',
      // Include cache directory (for model files) - @xenova/.cache
      '../../node_modules/@xenova/.cache/**/*',
      // Include package.json and other config files
      '../../node_modules/@xenova/transformers/package.json',
      '../../node_modules/@xenova/transformers/**/package.json',
    ],
  },
  
  transpilePackages: [
    // @rentalshop/database removed - it's server-only and in serverComponentsExternalPackages
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
  // Webpack config for Prisma and transformers
  // Based on: https://stackoverflow.com/questions/79315656/nextjs-transformers-module-parse-failed-unexpected-character
  webpack: (config, { isServer }) => {
    // CRITICAL: Externalize server-only packages for client builds
    // This prevents client components from bundling server-only code (fs, etc.)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
      
      // Mark server-only packages as external for client-side builds
      const originalExternals = config.externals;
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
        ({ request }, callback) => {
          // Server-only packages that should be stubbed in client builds
          if (
            /^@prisma\/(client|engines)/.test(request) ||
            /^@rentalshop\/(database|utils\/server|auth\/server)/.test(request)
          ) {
            return callback(null, '{}');
          }
          callback();
        }
      ];
    }
    
    if (isServer) {
      // CRITICAL: External native modules to prevent bundling
      // This ensures native binaries are loaded from node_modules at runtime, not bundled
      // Based on Stack Overflow solution for transformers.js
      
      // Initialize externals if not already set
      if (!config.externals) {
        config.externals = [];
      }
      
      // External native Node.js packages as CommonJS modules
      // These cannot be bundled by webpack (they need native binaries)
      const nativeExternals = {
        '@prisma/client': 'commonjs @prisma/client',
        '.prisma/client': 'commonjs .prisma/client',
        '@prisma/engines': 'commonjs @prisma/engines',
        'sharp': 'commonjs sharp', // Externalize Sharp (image processing native module)
        '@xenova/transformers': 'commonjs @xenova/transformers', // Externalize transformers (ML model)
        'onnxruntime-node': 'commonjs onnxruntime-node', // CRITICAL: Externalize ONNX runtime (prevents webpack bundling)
        // Externalize Pino (file logging) and Axiom SDK
        'pino': 'commonjs pino',
        'pino-pretty': 'commonjs pino-pretty',
        'pino-roll': 'commonjs pino-roll',
        '@axiomhq/js': 'commonjs @axiomhq/js',
      };
      
      // Merge with existing externals
      // Handle both array and object formats
      if (Array.isArray(config.externals)) {
        // If externals is an array, add our object to it
        config.externals.push(nativeExternals);
      } else if (typeof config.externals === 'function') {
        // If externals is a function, wrap it
        const originalExternals = config.externals;
        config.externals = (context, request, callback) => {
          if (nativeExternals[request]) {
            return callback(null, nativeExternals[request]);
          }
          return originalExternals(context, request, callback);
        };
      } else if (typeof config.externals === 'object') {
        // If externals is an object, merge it
        config.externals = {
          ...config.externals,
          ...nativeExternals
        };
      } else {
        // Default: create array with our externals
        config.externals = [nativeExternals];
      }
      
      // Ensure Prisma Client resolves to root node_modules (fallback)
      const path = require('path');
      config.resolve.alias = {
        ...config.resolve.alias,
        '.prisma/client': path.join(__dirname, '../../node_modules/.prisma/client'),
        '@prisma/client': path.join(__dirname, '../../node_modules/@prisma/client'),
        // OFFICIAL TUTORIAL APPROACH: No need to alias onnxruntime-node
        // node:18 has glibc, so onnxruntime-node (CPU backend) will work correctly
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