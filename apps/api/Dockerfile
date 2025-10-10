# ===================================
# STAGE 1: Dependencies
# ===================================
FROM node:22-alpine AS deps
WORKDIR /app

# Install system dependencies for Prisma
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
RUN yarn install --frozen-lockfile

# ===================================
# STAGE 2: Builder
# ===================================
FROM node:22-alpine AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy entire source code (needed for monorepo build)
COPY . .

# Generate Prisma Client with all binary targets
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build packages using Turbo (respects dependency order)
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true
RUN yarn build

# ===================================
# STAGE 3: Production Runner
# ===================================
FROM node:22-alpine AS runner
WORKDIR /app

# Install OpenSSL for Prisma (required for debian-openssl-3.0.x binary)
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3002

# Create nextjs user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package.json for dependency info
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/package.json ./apps/api/

# Copy node_modules (includes Prisma binaries)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built packages
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

# Copy API build output
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/.next ./apps/api/.next
# Public folder is optional (may not exist for API-only apps)
RUN mkdir -p ./apps/api/public

# Copy Prisma schema (needed for runtime)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# CRITICAL: Copy Prisma binaries to correct location
RUN mkdir -p ./apps/api/.next/server/.prisma/client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma/client/* ./apps/api/.next/server/.prisma/client/

USER nextjs

EXPOSE 3002

WORKDIR /app/apps/api

# Start Next.js server (normal mode, not standalone)
CMD ["../../node_modules/.bin/next", "start", "-p", "3002"]
