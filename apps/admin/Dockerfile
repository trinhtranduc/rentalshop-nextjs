# ===================================
# STAGE 1: Dependencies
# ===================================
FROM node:22-alpine AS deps
WORKDIR /app

# Install system dependencies
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
# Set NODE_ENV=development to ensure workspace devDependencies are installed
# This includes tsup, typescript, etc. needed for package builds
ENV NODE_ENV=development
# Add retry and network timeout for Railway builds (similar to API Dockerfile)
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
    echo "✅ node_modules created successfully ($(du -sh node_modules | cut -f1))" && \
    # List first few packages to verify installation
    ls -la node_modules | head -10 || true

# ===================================
# STAGE 2: Builder
# ===================================
FROM node:22-alpine AS builder
WORKDIR /app

# Declare build arguments for Railway environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_ENV

# Copy node_modules from deps stage
# Verify deps stage completed successfully before copying
COPY --from=deps /app/node_modules ./node_modules
# Verify node_modules was copied successfully
RUN if [ ! -d "node_modules" ]; then \
      echo "❌ ERROR: node_modules not found after copy from deps stage"; \
      exit 1; \
    fi && \
    echo "✅ node_modules copied successfully from deps stage"

# Copy entire source code (needed for monorepo build)
COPY . .

# Set environment variables for Next.js build (BUILD TIME)
# These will be inlined into the JavaScript bundle
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true

# Build packages using Turbo (respects dependency order)
RUN yarn build

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


