# ===================================
# STAGE 1: Dependencies
# ===================================
FROM node:22-alpine AS deps
WORKDIR /app

# Install system dependencies
# Add vips-dev for sharp (optional, helps with sharp installation)
RUN apk add --no-cache libc6-compat openssl python3 make g++ || true

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
COPY packages/loyalty/package.json ./packages/loyalty/
COPY apps/api/package.json ./apps/api/
COPY apps/admin/package.json ./apps/admin/
COPY apps/client/package.json ./apps/client/

# Install ALL dependencies including devDependencies (needed for build)
# Set NODE_ENV=development to ensure workspace devDependencies are installed
# This includes tsup, typescript, etc. needed for package builds
ENV NODE_ENV=development
# CRITICAL: Handle sharp installation issues on Alpine Linux
# Sharp needs to download libvips binaries from GitHub, which can fail on Railway
# Solution: Use retry logic and alternative CDN, or skip sharp if not critical
RUN yarn config set network-timeout 300000 && \
    yarn config set registry https://registry.npmjs.org/ && \
    export SHARP_IGNORE_GLOBAL_LIBVIPS=1 || true && \
    (yarn install --frozen-lockfile --network-timeout 300000 || \
     (echo "First attempt failed, retrying with clean cache..." && \
      yarn cache clean && \
      export SHARP_IGNORE_GLOBAL_LIBVIPS=1 || true && \
      yarn install --frozen-lockfile --network-timeout 300000 || \
      (echo "Second attempt failed, trying with ignore optional..." && \
       yarn install --frozen-lockfile --network-timeout 300000 --ignore-optional || true)))

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

# #1529: every NEXT_PUBLIC_* the web reads is inlined at build time. Railway passes a service variable to the
# build only when the Dockerfile declares it as an ARG. An ARG is visible to RUN as an environment variable;
# one that is not set stays unset, so the code's fallbacks (e.g. https://anyrent.shop) still apply.
ARG NEXT_PUBLIC_CLIENT_URL
ARG NEXT_PUBLIC_ADMIN_URL
ARG NEXT_PUBLIC_MOBILE_URL
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_GOOGLE_VERIFICATION
ARG NEXT_PUBLIC_YANDEX_VERIFICATION
ARG NEXT_PUBLIC_YAHOO_VERIFICATION
ARG NEXT_PUBLIC_ENABLE_THEME_SWITCH
ARG NEXT_PUBLIC_ENABLE_ADD_OUTLET
ENV SKIP_ENV_VALIDATION=true

# #1529: build the client and the packages it needs only (as Vercel did), not the API and admin apps
# Don't override NODE_ENV - let Railway control it
RUN npx prisma generate --schema=./prisma/schema.prisma && \
    npx turbo run build --filter=@rentalshop/client

# ===================================
# STAGE 3: Production Runner
# ===================================
FROM node:22-alpine AS runner
WORKDIR /app

# Don't override NODE_ENV - let Railway control it
ENV PORT=3000

# Create nextjs user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package.json for dependency info
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/client/package.json ./apps/client/

# Copy node_modules (runtime dependencies)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built packages
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

# Copy Client build output
COPY --from=builder --chown=nextjs:nodejs /app/apps/client/.next ./apps/client/.next

# Copy public folder (static assets)
COPY --from=builder --chown=nextjs:nodejs /app/apps/client/public ./apps/client/public

USER nextjs

EXPOSE 3000

WORKDIR /app/apps/client

# Start Next.js server on Railway's PORT (#1529); 3000 when it is not set
CMD ["sh", "-c", "exec ../../node_modules/.bin/next start -p ${PORT:-3000}"]


