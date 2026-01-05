#!/bin/bash
# =============================================================================
# Frontend Deployment Script - Zuclubit CRM (Ventazo)
# Deploys to Cloudflare Pages using OpenNext
# =============================================================================
# Usage: ./scripts/deploy-frontend.sh [--branch <branch>] [--preview]
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ventazo"
WEB_DIR="apps/web"
PRODUCTION_URL="https://ventazo.pages.dev"
CUSTOM_DOMAIN="https://crm.zuclubit.com"

# Default values
BRANCH="main"
PREVIEW_MODE=false

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --branch)
                BRANCH="$2"
                shift 2
                ;;
            --preview)
                PREVIEW_MODE=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v npx &> /dev/null; then
        log_error "npx is not available. Ensure Node.js is installed."
        exit 1
    fi

    # Check wrangler auth
    if ! npx wrangler whoami &> /dev/null; then
        log_error "Not authenticated to Cloudflare. Run: npx wrangler login"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    cd "$ROOT_DIR"

    # Install root dependencies
    npm install

    # Install web app dependencies
    cd "$ROOT_DIR/$WEB_DIR"
    npm install

    log_success "Dependencies installed"
}

# Build for Cloudflare Pages
build_for_cloudflare() {
    log_info "Building for Cloudflare Pages with OpenNext..."
    cd "$ROOT_DIR/$WEB_DIR"

    # Clean previous build
    rm -rf .open-next .next

    # Build using OpenNext for Cloudflare
    npm run build:cf

    log_success "Build completed"
}

# Deploy to Cloudflare Pages
deploy_to_cloudflare() {
    log_info "Deploying to Cloudflare Pages..."
    cd "$ROOT_DIR/$WEB_DIR"

    local deploy_args="--project-name=${PROJECT_NAME}"

    if [ "$PREVIEW_MODE" = true ]; then
        deploy_args="$deploy_args --branch=preview"
        log_info "Deploying as preview..."
    else
        deploy_args="$deploy_args --branch=${BRANCH} --commit-dirty=true"
        log_info "Deploying to production (branch: ${BRANCH})..."
    fi

    # Deploy
    npx wrangler pages deploy .open-next/assets $deploy_args

    log_success "Deployment initiated"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."

    local url="$PRODUCTION_URL"
    if [ "$PREVIEW_MODE" = true ]; then
        log_warn "Preview deployment - URL will be shown in Cloudflare dashboard"
        return 0
    fi

    # Wait for deployment to propagate
    sleep 10

    local retries=0
    local max_retries=12
    while [ $retries -lt $max_retries ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            log_success "Deployment verified at $url"
            return 0
        fi

        retries=$((retries + 1))
        log_warn "Verification attempt $retries/$max_retries, retrying in 10s..."
        sleep 10
    done

    log_warn "Could not verify deployment. It may still be propagating."
    return 0
}

# Show deployment info
show_deployment_info() {
    echo ""
    log_info "Deployment URLs:"
    echo "  Production: ${PRODUCTION_URL}"
    echo "  Custom Domain: ${CUSTOM_DOMAIN}"
    echo ""
    echo "  Cloudflare Dashboard: https://dash.cloudflare.com/?to=/:account/pages/view/${PROJECT_NAME}"
    echo ""
}

# Main function
main() {
    parse_args "$@"

    echo ""
    echo "=============================================="
    echo "  Zuclubit CRM - Frontend Deployment"
    echo "  (Cloudflare Pages + OpenNext)"
    echo "=============================================="
    echo ""

    local start_time=$(date +%s)

    check_prerequisites
    install_dependencies
    build_for_cloudflare
    deploy_to_cloudflare
    verify_deployment

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    log_success "Deployment completed in ${duration}s"
    show_deployment_info
}

# Run main
main "$@"
