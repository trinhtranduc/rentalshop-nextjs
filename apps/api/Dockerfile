# ===================================
# STAGE 1: Dependencies
# ===================================
FROM node:22-alpine AS deps
WORKDIR /app

# Install system dependencies for Prisma
# Note: We use pure JavaScript mode for @xenova/transformers (no onnxruntime-node needed)
# This avoids glibc dependency issues on Alpine Linux
RUN apk add --no-cache libc6-compat openssl

# Copy root package files
COPY package.json yarn.lock ./

# Copy all workspace package.json files (for proper dependency resolution)
COPY packages/auth/package.json ./packages/auth/
COPY packages/constants/package.json ./packages/constants/
COPY packages/database/package.json ./packages/database/
COPY packages/env/package.json ./packages/env/
COPY packages/errors/package.json ./packages/errors/
COPY packages/hooks/package.json ./packages/hooks/
COPY packages/middleware/package.json ./packages/middleware/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/
COPY packages/validation/package.json ./packages/validation/
COPY apps/api/package.json ./apps/api/
COPY apps/admin/package.json ./apps/admin/
COPY apps/client/package.json ./apps/client/

# Install ALL dependencies including devDependencies (needed for build)
ENV NODE_ENV=development
# Add retry and network timeout for Railway builds
RUN yarn config set network-timeout 300000 && \
    yarn config set registry https://registry.npmjs.org/ && \
    (yarn install --frozen-lockfile --network-timeout 300000 || \
     (echo "First attempt failed, retrying..." && \
      yarn cache clean && \
      yarn install --frozen-lockfile --network-timeout 300000))

# CRITICAL: Remove onnxruntime-node and create mock module
# onnxruntime-node requires glibc which Alpine Linux doesn't have
# @xenova/transformers will fall back to pure JavaScript/WebAssembly mode
RUN if [ -d "node_modules/onnxruntime-node" ]; then \
      echo "🗑️ Removing onnxruntime-node to force pure JavaScript mode..." && \
      rm -rf node_modules/onnxruntime-node && \
      echo "✅ onnxruntime-node removed successfully"; \
    else \
      echo "ℹ️ onnxruntime-node not found (already removed or not installed)"; \
    fi && \
    # Create mock module directory and file
    # Mock module with create() method that throws to force WebAssembly fallback
    # @xenova/transformers will catch this error and automatically use WebAssembly
    mkdir -p node_modules/onnxruntime-node && \
    echo "// Mock onnxruntime-node module for WebAssembly fallback" > node_modules/onnxruntime-node/index.js && \
    echo "// @xenova/transformers will detect this is not a real module and use WebAssembly instead" >> node_modules/onnxruntime-node/index.js && \
    echo "// This mock throws errors to force WebAssembly fallback" >> node_modules/onnxruntime-node/index.js && \
    echo "const mockInferenceSession = {" >> node_modules/onnxruntime-node/index.js && \
    echo "  create: function() {" >> node_modules/onnxruntime-node/index.js && \
    echo "    throw new Error('onnxruntime-node is disabled - using WebAssembly mode');" >> node_modules/onnxruntime-node/index.js && \
    echo "  }" >> node_modules/onnxruntime-node/index.js && \
    echo "};" >> node_modules/onnxruntime-node/index.js && \
    echo "module.exports = {" >> node_modules/onnxruntime-node/index.js && \
    echo "  InferenceSession: mockInferenceSession," >> node_modules/onnxruntime-node/index.js && \
    echo "  create: function() {" >> node_modules/onnxruntime-node/index.js && \
    echo "    throw new Error('onnxruntime-node is disabled - using WebAssembly mode');" >> node_modules/onnxruntime-node/index.js && \
    echo "  }" >> node_modules/onnxruntime-node/index.js && \
    echo "};" >> node_modules/onnxruntime-node/index.js && \
    echo "✅ Mock onnxruntime-node module created (throws errors to force WebAssembly fallback)"

# ===================================
# STAGE 2: Builder
# ===================================
FROM node:22-alpine AS builder
WORKDIR /app

# Install OpenSSL for Prisma
# Note: We use pure JavaScript mode for @xenova/transformers (no native modules needed)
RUN apk add --no-cache openssl

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# CRITICAL: Remove onnxruntime-node and create mock module before building
# onnxruntime-node requires glibc which Alpine Linux doesn't have
# @xenova/transformers will fall back to pure JavaScript/WebAssembly mode
RUN if [ -d "node_modules/onnxruntime-node" ]; then \
      echo "🗑️ Removing onnxruntime-node to force pure JavaScript mode..." && \
      rm -rf node_modules/onnxruntime-node && \
      echo "✅ onnxruntime-node removed successfully"; \
    else \
      echo "ℹ️ onnxruntime-node not found (already removed or not installed)"; \
    fi && \
    # Create mock module directory and file
    # Mock module with create() method that throws to force WebAssembly fallback
    # @xenova/transformers will catch this error and automatically use WebAssembly
    mkdir -p node_modules/onnxruntime-node && \
    echo "// Mock onnxruntime-node module for WebAssembly fallback" > node_modules/onnxruntime-node/index.js && \
    echo "// @xenova/transformers will detect this is not a real module and use WebAssembly instead" >> node_modules/onnxruntime-node/index.js && \
    echo "// This mock throws errors to force WebAssembly fallback" >> node_modules/onnxruntime-node/index.js && \
    echo "const mockInferenceSession = {" >> node_modules/onnxruntime-node/index.js && \
    echo "  create: function() {" >> node_modules/onnxruntime-node/index.js && \
    echo "    throw new Error('onnxruntime-node is disabled - using WebAssembly mode');" >> node_modules/onnxruntime-node/index.js && \
    echo "  }" >> node_modules/onnxruntime-node/index.js && \
    echo "};" >> node_modules/onnxruntime-node/index.js && \
    echo "module.exports = {" >> node_modules/onnxruntime-node/index.js && \
    echo "  InferenceSession: mockInferenceSession," >> node_modules/onnxruntime-node/index.js && \
    echo "  create: function() {" >> node_modules/onnxruntime-node/index.js && \
    echo "    throw new Error('onnxruntime-node is disabled - using WebAssembly mode');" >> node_modules/onnxruntime-node/index.js && \
    echo "  }" >> node_modules/onnxruntime-node/index.js && \
    echo "};" >> node_modules/onnxruntime-node/index.js && \
    echo "✅ Mock onnxruntime-node module created (throws errors to force WebAssembly fallback)"

# Copy entire source code (needed for monorepo build)
COPY . .

# Generate Prisma Client with all binary targets
# Generate at root level first
RUN npx prisma generate --schema=./prisma/schema.prisma

# CRITICAL: Copy Prisma Client to apps/api/node_modules for Next.js build
# Next.js collects page data during build and needs Prisma Client accessible
RUN mkdir -p apps/api/node_modules/.prisma && \
    mkdir -p apps/api/node_modules/@prisma && \
    cp -r node_modules/.prisma/client apps/api/node_modules/.prisma/ && \
    cp -r node_modules/@prisma/client apps/api/node_modules/@prisma/

# ============================================================================
# MIGRATION STRATEGY
# ============================================================================
# Database migrations run at RUNTIME via start.sh (not during build)
# This ensures:
# 1. Migrations run when database is available (Railway injects DATABASE_URL)
# 2. Migrations can retry if database is not ready yet
# 3. Each deployment automatically applies pending migrations
# 4. No need to manually run migrations after deployment
# ============================================================================

# Build packages using Turbo (respects dependency order)
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true
# CRITICAL: Set environment variables for @xenova/transformers to use WebAssembly mode
# USE_BROWSER=true forces WebAssembly mode (browser-compatible runtime)
# This prevents onnxruntime-node from being loaded (which requires glibc on Alpine)
ENV USE_ONNXRUNTIME=false
ENV USE_BROWSER=true
ENV ONNXRUNTIME_NODE_DISABLE=true
RUN yarn build

# ===================================
# STAGE 3: Production Runner
# ===================================
FROM node:22-alpine AS runner
WORKDIR /app

# Install OpenSSL for Prisma AND postgresql-client for migrations
RUN apk add --no-cache openssl postgresql-client

ENV NODE_ENV=production
ENV PORT=3002
# CRITICAL: Set environment variables for @xenova/transformers to use WebAssembly mode
# USE_BROWSER=true forces WebAssembly mode (browser-compatible runtime)
ENV USE_ONNXRUNTIME=false
ENV USE_BROWSER=true
ENV ONNXRUNTIME_NODE_DISABLE=true

# Create nextjs user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package.json for dependency info
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/package.json ./apps/api/

# Copy node_modules (includes Prisma binaries)
# Note: onnxruntime-node should have been removed in builder stage
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# CRITICAL: Create writable cache directory for @xenova/transformers
# Based on: https://github.com/huggingface/transformers.js/issues/295
# The library needs a writable cache directory for model files and WASM files
RUN mkdir -p /tmp/transformers-cache && \
    chown -R nextjs:nodejs /tmp/transformers-cache && \
    echo "✅ Created transformers cache directory: /tmp/transformers-cache"

# CRITICAL: Ensure onnxruntime-node mock module exists in production image
# If real package exists, remove it and create mock
RUN if [ -d "node_modules/onnxruntime-node" ] && [ -f "node_modules/onnxruntime-node/package.json" ]; then \
      echo "⚠️ WARNING: Real onnxruntime-node found in production image, removing..." && \
      rm -rf node_modules/onnxruntime-node && \
      echo "✅ Real onnxruntime-node removed from production image"; \
    fi && \
    # Ensure mock module exists
    # Official approach: Return empty object to allow @xenova/transformers to detect
    # that onnxruntime-node is unavailable and automatically fallback to WebAssembly
    mkdir -p node_modules/onnxruntime-node && \
    echo "// Mock onnxruntime-node module for WebAssembly fallback" > node_modules/onnxruntime-node/index.js && \
    echo "// @xenova/transformers will detect this is not a real module and use WebAssembly instead" >> node_modules/onnxruntime-node/index.js && \
    echo "// This mock throws errors to force WebAssembly fallback" >> node_modules/onnxruntime-node/index.js && \
    echo "const mockInferenceSession = {" >> node_modules/onnxruntime-node/index.js && \
    echo "  create: function() {" >> node_modules/onnxruntime-node/index.js && \
    echo "    throw new Error('onnxruntime-node is disabled - using WebAssembly mode');" >> node_modules/onnxruntime-node/index.js && \
    echo "  }" >> node_modules/onnxruntime-node/index.js && \
    echo "};" >> node_modules/onnxruntime-node/index.js && \
    echo "module.exports = {" >> node_modules/onnxruntime-node/index.js && \
    echo "  InferenceSession: mockInferenceSession," >> node_modules/onnxruntime-node/index.js && \
    echo "  create: function() {" >> node_modules/onnxruntime-node/index.js && \
    echo "    throw new Error('onnxruntime-node is disabled - using WebAssembly mode');" >> node_modules/onnxruntime-node/index.js && \
    echo "  }" >> node_modules/onnxruntime-node/index.js && \
    echo "};" >> node_modules/onnxruntime-node/index.js && \
    echo "✅ Mock onnxruntime-node module ensured in production image (throws errors to force WebAssembly fallback)"

# Copy built packages
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

# Copy API build output
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/.next ./apps/api/.next
# Public folder is optional (may not exist for API-only apps)
RUN mkdir -p ./apps/api/public

# Create uploads directory for Railway Volume mount
RUN mkdir -p ./apps/api/public/uploads

# Copy Prisma schema AND migrations (needed for runtime migrations)
# Migrations folder is required for 'prisma migrate deploy' to work
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy start script (runs migrations + starts server)
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/start.sh ./apps/api/start.sh
RUN chmod +x ./apps/api/start.sh

# Note: Railway Volume will be mounted at /app/public/uploads via Railway Dashboard
# No VOLUME keyword needed - Railway handles volume mounting automatically

# CRITICAL: Copy Prisma binaries to correct location
RUN mkdir -p ./apps/api/.next/server/.prisma/client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma/client/* ./apps/api/.next/server/.prisma/client/

USER nextjs

EXPOSE 3002

WORKDIR /app/apps/api

# ============================================================================
# STARTUP COMMAND
# ============================================================================
# The start.sh script will:
# 1. Generate Prisma Client (if needed)
# 2. Check database connection (with retries)
# 3. Check migration status
# 4. Run pending migrations (prisma migrate deploy)
# 5. Start Next.js server
# ============================================================================
CMD ["sh", "start.sh"]
