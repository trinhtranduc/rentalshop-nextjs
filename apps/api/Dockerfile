# ===================================
# STAGE 1: Dependencies
# ===================================
# Use node:20 to support @axiomhq/js (requires Node.js >= 20)
# node:20 has glibc, so onnxruntime-node (CPU backend) will still work
FROM node:20 AS deps
WORKDIR /app

# Install system dependencies for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy root package files
COPY package.json yarn.lock ./

# Copy all workspace package.json files (for proper dependency resolution)
COPY packages/ai-service/package.json ./packages/ai-service/
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
      yarn install --frozen-lockfile --network-timeout 300000)) && \
    # Verify node_modules was created successfully
    if [ ! -d "node_modules" ]; then \
      echo "❌ ERROR: node_modules directory not found after yarn install"; \
      exit 1; \
    fi && \
    echo "✅ node_modules created successfully ($(du -sh node_modules | cut -f1))"

# OFFICIAL TUTORIAL APPROACH: Keep onnxruntime-node (it will work with node:18)
# node:18 has glibc, so onnxruntime-node (CPU backend) will work correctly
# No need to remove or mock onnxruntime-node

# ===================================
# STAGE 2: Builder
# ===================================
# Use node:20 to support @axiomhq/js (requires Node.js >= 20)
# node:20 has glibc, so onnxruntime-node (CPU backend) will still work
FROM node:20 AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# OFFICIAL TUTORIAL APPROACH: Keep onnxruntime-node (it will work with node:18)
# node:18 has glibc, so onnxruntime-node (CPU backend) will work correctly
# No need to remove or mock onnxruntime-node

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
# OFFICIAL TUTORIAL APPROACH: No need to force WASM mode
# node:18 has glibc, so onnxruntime-node (CPU backend) will work correctly
# Library will use CPU backend by default in Node.js environment
RUN yarn build

# ===================================
# STAGE 3: Production Runner
# ===================================
# Use node:20 to support @axiomhq/js (requires Node.js >= 20)
# node:20 has glibc, so onnxruntime-node (CPU backend) will still work
FROM node:20 AS runner
WORKDIR /app

# Install OpenSSL for Prisma AND postgresql-client for migrations
RUN apt-get update && apt-get install -y openssl postgresql-client && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3002
# OFFICIAL TUTORIAL APPROACH: No need to force WASM mode
# node:18 has glibc, so onnxruntime-node (CPU backend) will work correctly
# Library will use CPU backend by default in Node.js environment
ENV TRANSFORMERS_CACHE_DIR=/tmp/transformers-cache

# Create nextjs user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package.json for dependency info
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/package.json ./apps/api/

# Copy node_modules (includes Prisma binaries and onnxruntime-node)
# Note: onnxruntime-node will work with node:18 (has glibc)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# CRITICAL: Explicitly verify and ensure @huggingface/transformers is accessible
# In Next.js standalone output, node_modules may not be fully copied
# We need to ensure WASM files are accessible at runtime
# Note: @huggingface/transformers may use @xenova/transformers internally
RUN if [ -d "node_modules/@huggingface/transformers" ]; then \
      echo "✅ @huggingface/transformers found in node_modules"; \
      if [ -d "node_modules/@huggingface/transformers/dist" ]; then \
        echo "✅ WASM files directory found: node_modules/@huggingface/transformers/dist"; \
        ls -la node_modules/@huggingface/transformers/dist/ | head -10 || true; \
      else \
        echo "⚠️ WASM files directory not found - library will download if needed"; \
      fi; \
    elif [ -d "node_modules/@xenova/transformers" ]; then \
      echo "✅ @xenova/transformers found (may be internal dependency)"; \
    else \
      echo "⚠️ WARNING: @huggingface/transformers not found in node_modules"; \
      echo "⚠️ This may cause WASM backend initialization to fail"; \
    fi

# CRITICAL: Create writable cache directory for @huggingface/transformers
# Based on: https://huggingface.co/docs/transformers.js/tutorials/next
# and https://github.com/huggingface/transformers.js/blob/main/examples/next-server/Dockerfile
# The library needs a writable cache directory for model files and WASM files
# Use both locations: /tmp for runtime cache and node_modules/@xenova/.cache for persistent cache
# Note: @huggingface/transformers may use @xenova/.cache internally (as shown in official Dockerfile)
RUN mkdir -p /tmp/transformers-cache && \
    chown -R nextjs:nodejs /tmp/transformers-cache && \
    mkdir -p /app/node_modules/@xenova/.cache && \
    chmod 777 -R /app/node_modules/@xenova 2>/dev/null || true && \
    echo "✅ Created transformers cache directories: /tmp/transformers-cache and /app/node_modules/@xenova/.cache"

# OFFICIAL TUTORIAL APPROACH: Keep onnxruntime-node (it will work with node:18)
# node:18 has glibc, so onnxruntime-node (CPU backend) will work correctly
# No need to remove or mock onnxruntime-node

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
