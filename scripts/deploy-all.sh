#!/bin/bash
# =============================================================================
# Full Stack Deployment Script - Zuclubit CRM
# Deploys both backend (Fly.io) and frontend (Cloudflare Pages)
# =============================================================================
# Usage: ./scripts/deploy-all.sh [--backend-only] [--frontend-only] [--parallel]
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Flags
DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true
PARALLEL_DEPLOY=false

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_header() { echo -e "\n${CYAN}$1${NC}\n"; }

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend-only)
                DEPLOY_FRONTEND=false
                shift
                ;;
            --frontend-only)
                DEPLOY_BACKEND=false
                shift
                ;;
            --parallel)
                PARALLEL_DEPLOY=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --backend-only   Deploy only the backend (Fly.io)"
    echo "  --frontend-only  Deploy only the frontend (Cloudflare Pages)"
    echo "  --parallel       Deploy backend and frontend in parallel"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy both sequentially"
    echo "  $0 --parallel         # Deploy both in parallel"
    echo "  $0 --backend-only     # Deploy only backend"
    echo "  $0 --frontend-only    # Deploy only frontend"
}

# Deploy backend
deploy_backend() {
    log_header "========== BACKEND DEPLOYMENT =========="
    "$SCRIPT_DIR/deploy-backend.sh"
}

# Deploy frontend
deploy_frontend() {
    log_header "========== FRONTEND DEPLOYMENT =========="
    "$SCRIPT_DIR/deploy-frontend.sh"
}

# Main function
main() {
    parse_args "$@"

    echo ""
    echo "=============================================="
    echo "     Zuclubit CRM - Full Stack Deployment"
    echo "=============================================="
    echo ""
    echo "  Backend:  $([ "$DEPLOY_BACKEND" = true ] && echo "Yes" || echo "No")"
    echo "  Frontend: $([ "$DEPLOY_FRONTEND" = true ] && echo "Yes" || echo "No")"
    echo "  Parallel: $([ "$PARALLEL_DEPLOY" = true ] && echo "Yes" || echo "No")"
    echo ""

    local start_time=$(date +%s)
    local backend_status=0
    local frontend_status=0

    if [ "$PARALLEL_DEPLOY" = true ] && [ "$DEPLOY_BACKEND" = true ] && [ "$DEPLOY_FRONTEND" = true ]; then
        log_info "Starting parallel deployment..."

        # Deploy in parallel
        deploy_backend &
        local backend_pid=$!

        deploy_frontend &
        local frontend_pid=$!

        # Wait for both
        wait $backend_pid || backend_status=$?
        wait $frontend_pid || frontend_status=$?
    else
        # Sequential deployment
        if [ "$DEPLOY_BACKEND" = true ]; then
            deploy_backend || backend_status=$?
        fi

        if [ "$DEPLOY_FRONTEND" = true ]; then
            deploy_frontend || frontend_status=$?
        fi
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo "=============================================="
    echo "           DEPLOYMENT SUMMARY"
    echo "=============================================="
    echo ""

    if [ "$DEPLOY_BACKEND" = true ]; then
        if [ $backend_status -eq 0 ]; then
            log_success "Backend:  Deployed successfully"
            echo "          URL: https://zuclubit-lead-service.fly.dev"
        else
            log_error "Backend:  Deployment failed"
        fi
    fi

    if [ "$DEPLOY_FRONTEND" = true ]; then
        if [ $frontend_status -eq 0 ]; then
            log_success "Frontend: Deployed successfully"
            echo "          URL: https://ventazo.pages.dev"
            echo "          Custom: https://crm.zuclubit.com"
        else
            log_error "Frontend: Deployment failed"
        fi
    fi

    echo ""
    echo "  Total time: ${duration}s"
    echo ""

    # Exit with error if any deployment failed
    if [ $backend_status -ne 0 ] || [ $frontend_status -ne 0 ]; then
        exit 1
    fi
}

# Run main
main "$@"
