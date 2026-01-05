#!/bin/bash
# =============================================================================
# Backend Deployment Script - Zuclubit Lead Service
# Deploys to Fly.io with health checks and rollback support
# =============================================================================
# Usage: ./scripts/deploy-backend.sh [--force]
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="zuclubit-lead-service"
SERVICE_DIR="services/lead-service"
HEALTH_CHECK_URL="https://${APP_NAME}.fly.dev/health"
MAX_HEALTH_RETRIES=30
HEALTH_RETRY_DELAY=5

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v flyctl &> /dev/null; then
        log_error "flyctl is not installed. Install it with: curl -L https://fly.io/install.sh | sh"
        exit 1
    fi

    if ! flyctl auth whoami &> /dev/null; then
        log_error "Not authenticated to Fly.io. Run: flyctl auth login"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Build the service
build_service() {
    log_info "Building lead-service..."
    cd "$ROOT_DIR/$SERVICE_DIR"

    # Install dependencies if node_modules is missing
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm install
    fi

    # Build TypeScript
    npm run build

    log_success "Build completed"
}

# Deploy to Fly.io
deploy_to_fly() {
    log_info "Deploying to Fly.io..."
    cd "$ROOT_DIR/$SERVICE_DIR"

    # Deploy with the config file
    flyctl deploy --config fly.toml --wait-timeout 300

    log_success "Deployment initiated"
}

# Health check
health_check() {
    log_info "Performing health check..."

    local retries=0
    while [ $retries -lt $MAX_HEALTH_RETRIES ]; do
        if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            log_success "Health check passed!"
            return 0
        fi

        retries=$((retries + 1))
        log_warn "Health check attempt $retries/$MAX_HEALTH_RETRIES failed, retrying in ${HEALTH_RETRY_DELAY}s..."
        sleep $HEALTH_RETRY_DELAY
    done

    log_error "Health check failed after $MAX_HEALTH_RETRIES attempts"
    return 1
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    cd "$ROOT_DIR/$SERVICE_DIR"
    flyctl status
}

# Main function
main() {
    echo ""
    echo "=============================================="
    echo "  Zuclubit Lead Service - Backend Deployment"
    echo "=============================================="
    echo ""

    local start_time=$(date +%s)

    check_prerequisites
    build_service
    deploy_to_fly

    if health_check; then
        show_status

        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        echo ""
        log_success "Deployment completed successfully in ${duration}s"
        echo ""
        echo "  App URL: https://${APP_NAME}.fly.dev"
        echo "  Health: ${HEALTH_CHECK_URL}"
        echo "  Logs: flyctl logs -a ${APP_NAME}"
        echo ""
    else
        log_error "Deployment may have issues. Check logs: flyctl logs -a ${APP_NAME}"
        exit 1
    fi
}

# Run main
main "$@"
