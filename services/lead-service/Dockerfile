# =============================================================================
# Multi-Stage Docker Build for Lead Service (Standalone)
# Optimized for production with minimal image size and security best practices
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies required for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files for dependency installation
COPY package.json ./

# Install ALL dependencies (including devDependencies for build stage)
RUN npm install

# -----------------------------------------------------------------------------
# Stage 2: Builder (Compile TypeScript)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and configuration
COPY . .

# Build TypeScript to JavaScript using tsup
RUN npm run build

# Verify build output
RUN ls -la dist/

# -----------------------------------------------------------------------------
# Stage 3: Production Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS prod-deps

WORKDIR /app

# Install dependencies for native modules including vips for sharp
RUN apk add --no-cache \
    libc6-compat \
    vips-dev \
    build-base \
    python3

# Copy package files
COPY package.json ./

# Install only production dependencies
RUN npm install --omit=dev
RUN npm cache clean --force

# Remove build dependencies to reduce image size
RUN apk del build-base python3

# -----------------------------------------------------------------------------
# Stage 4: Production (Final lightweight image)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Set NODE_ENV to production
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

# Install runtime dependencies (vips for sharp image processing)
RUN apk add --no-cache libc6-compat dumb-init vips

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
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start with dumb-init to handle signals properly
# V8 flags for better performance:
# --max-old-space-size=768: Limit heap to 768MB (leaving ~256MB for other V8 areas)
# --optimize-for-size: Reduce memory usage
CMD ["dumb-init", "node", "--max-old-space-size=768", "dist/app.js"]
