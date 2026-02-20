# ===================================
# STAGE 1: Dependencies
# ===================================
FROM node:22-alpine AS deps
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat openssl

# Copy root package files FIRST for better layer caching
COPY package.json yarn.lock ./

# Copy all workspace package.json files (for proper dependency resolution)
# This layer is cached unless package.json changes
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
# Set NODE_ENV=development to ensure workspace devDependencies are installed
# This includes tsup, typescript, etc. needed for package builds
ENV NODE_ENV=development

# Use yarn cache mount + turbo cache for faster builds (Docker BuildKit feature)
# - Cache yarn packages between builds
# - Increase network timeout for slow connections
# - Use higher concurrency for parallel downloads
# - Retry with exponential backoff
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    --mount=type=cache,target=/app/.turbo \
    yarn install --frozen-lockfile \
      --network-timeout 600000 \
      --network-concurrency 8 \
      --prefer-offline \
      --check-files || \
    (echo "First attempt failed, retrying..." && \
     yarn install --frozen-lockfile --network-timeout 600000 --network-concurrency 8)

# ===================================
# STAGE 2: Builder
# ===================================
FROM node:22-alpine AS builder
WORKDIR /app

# Declare build arguments for Railway environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_ENV

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy entire source code (needed for monorepo build)
COPY . .

# Set environment variables for Next.js build (BUILD TIME)
# These will be inlined into the JavaScript bundle
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true

# Build admin app using Turbo filter (same as Vercel)
# This ensures dependencies are built in correct order
# Use turbo cache mount for faster incremental builds
# Use yarn turbo to ensure it's available from node_modules
# Use --output-logs=new-only to prevent repeated prefixes in logs
RUN --mount=type=cache,target=/app/.turbo \
    SKIP_ENV_VALIDATION=true yarn turbo run build --filter=@rentalshop/admin --output-logs=new-only

# ===================================
# STAGE 3: Production Runner
# ===================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create nextjs user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package.json for dependency info
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/package.json ./apps/admin/

# Copy node_modules (runtime dependencies)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built packages
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

# Copy Admin build output
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next ./apps/admin/.next

# Public folder is optional (may not exist)
RUN mkdir -p ./apps/admin/public

USER nextjs

EXPOSE 3001

WORKDIR /app/apps/admin

# Start Next.js server
CMD ["../../node_modules/.bin/next", "start", "-p", "3001"]


