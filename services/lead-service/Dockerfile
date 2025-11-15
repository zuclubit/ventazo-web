# =============================================================================
# Multi-Stage Docker Build for Lead Service
# Optimized for production with minimal image size and security best practices
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies (Base for both build and production)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies required for native modules
RUN apk add --no-cache libc6-compat

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies for build stage)
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: Builder (Compile TypeScript)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and configuration
COPY . .

# Build TypeScript to JavaScript
# tsup will compile src/app.ts to dist/app.js
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS prod-deps

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# -----------------------------------------------------------------------------
# Stage 4: Production (Final lightweight image)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 lead-service

WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps --chown=lead-service:nodejs /app/node_modules ./node_modules

# Copy compiled JavaScript from builder
COPY --from=builder --chown=lead-service:nodejs /app/dist ./dist

# Copy package.json for metadata
COPY --chown=lead-service:nodejs package.json ./

# Switch to non-root user
USER lead-service

# Expose port (configurable via PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/app.js"]
