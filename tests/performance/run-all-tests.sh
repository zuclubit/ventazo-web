#!/bin/bash
#
# Zuclubit CRM - Performance Test Runner
# Usage: ./run-all-tests.sh [smoke|load|stress|soak|all]
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="${SCRIPT_DIR}/reports"
K6_DIR="${SCRIPT_DIR}/k6"
PLAYWRIGHT_DIR="${SCRIPT_DIR}/playwright"
LIGHTHOUSE_DIR="${SCRIPT_DIR}/lighthouse"

# Environment
export K6_ENV="${K6_ENV:-staging}"
export FRONTEND_URL="${FRONTEND_URL:-https://crm.zuclubit.com}"
export BACKEND_URL="${BACKEND_URL:-https://zuclubit-lead-service.fly.dev}"

# Create reports directory
mkdir -p "${REPORTS_DIR}"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           ZUCLUBIT CRM - PERFORMANCE TEST SUITE              ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  Environment: ${K6_ENV}"
    echo "║  Frontend:    ${FRONTEND_URL}"
    echo "║  Backend:     ${BACKEND_URL}"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
}

check_dependencies() {
    log_info "Checking dependencies..."

    local missing=()

    # Check k6
    if ! command -v k6 &> /dev/null; then
        missing+=("k6")
    fi

    # Check npm (for playwright and lighthouse)
    if ! command -v npm &> /dev/null; then
        missing+=("npm")
    fi

    # Check playwright
    if ! npx playwright --version &> /dev/null 2>&1; then
        log_warning "Playwright not installed. Installing..."
        npm install -D @playwright/test
        npx playwright install chromium
    fi

    # Check lighthouse
    if ! npx lhci --version &> /dev/null 2>&1; then
        log_warning "Lighthouse CI not installed. Installing..."
        npm install -g @lhci/cli
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing[*]}"
        echo ""
        echo "Install with:"
        echo "  brew install k6"
        echo "  npm install -D @playwright/test"
        echo "  npm install -g @lhci/cli"
        exit 1
    fi

    log_success "All dependencies available"
}

run_k6_smoke() {
    log_info "Running k6 smoke tests..."
    cd "${K6_DIR}"
    k6 run --env K6_ENV="${K6_ENV}" scenarios/smoke-test.js \
        --out json="${REPORTS_DIR}/k6-smoke-results.json" \
        2>&1 | tee "${REPORTS_DIR}/k6-smoke.log"
    log_success "Smoke tests completed"
}

run_k6_load() {
    log_info "Running k6 load tests..."
    cd "${K6_DIR}"
    k6 run --env K6_ENV="${K6_ENV}" scenarios/load-test.js \
        --out json="${REPORTS_DIR}/k6-load-results.json" \
        2>&1 | tee "${REPORTS_DIR}/k6-load.log"
    log_success "Load tests completed"
}

run_k6_stress() {
    log_info "Running k6 stress tests..."
    cd "${K6_DIR}"
    k6 run --env K6_ENV="${K6_ENV}" scenarios/stress-test.js \
        --out json="${REPORTS_DIR}/k6-stress-results.json" \
        2>&1 | tee "${REPORTS_DIR}/k6-stress.log"
    log_success "Stress tests completed"
}

run_k6_soak() {
    log_info "Running k6 soak tests (this will take a while)..."
    cd "${K6_DIR}"
    k6 run --env K6_ENV="${K6_ENV}" scenarios/soak-test.js \
        --out json="${REPORTS_DIR}/k6-soak-results.json" \
        2>&1 | tee "${REPORTS_DIR}/k6-soak.log"
    log_success "Soak tests completed"
}

run_playwright() {
    log_info "Running Playwright E2E performance tests..."
    cd "${PLAYWRIGHT_DIR}"

    # Ensure Playwright is installed
    if [ ! -d "node_modules" ]; then
        npm install
    fi

    npx playwright test --config=playwright.config.ts \
        --reporter=html \
        2>&1 | tee "${REPORTS_DIR}/playwright.log"

    # Move report
    if [ -d "playwright-report" ]; then
        mv playwright-report "${REPORTS_DIR}/"
    fi

    log_success "Playwright tests completed"
}

run_lighthouse() {
    log_info "Running Lighthouse audits..."
    cd "${LIGHTHOUSE_DIR}"

    npx lhci autorun --config=lighthouserc.js \
        2>&1 | tee "${REPORTS_DIR}/lighthouse.log"

    # Move reports if generated
    if [ -d ".lighthouseci" ]; then
        mv .lighthouseci "${REPORTS_DIR}/lighthouse-ci"
    fi

    log_success "Lighthouse audits completed"
}

generate_summary() {
    log_info "Generating summary report..."

    cat > "${REPORTS_DIR}/SUMMARY.md" << EOF
# Performance Test Summary

**Date:** $(date)
**Environment:** ${K6_ENV}
**Frontend URL:** ${FRONTEND_URL}
**Backend URL:** ${BACKEND_URL}

## Test Results

### Backend Load Tests (k6)
$(if [ -f "${REPORTS_DIR}/k6-smoke.log" ]; then echo "- Smoke test: ✓ Completed"; fi)
$(if [ -f "${REPORTS_DIR}/k6-load.log" ]; then echo "- Load test: ✓ Completed"; fi)
$(if [ -f "${REPORTS_DIR}/k6-stress.log" ]; then echo "- Stress test: ✓ Completed"; fi)
$(if [ -f "${REPORTS_DIR}/k6-soak.log" ]; then echo "- Soak test: ✓ Completed"; fi)

### Frontend E2E Tests (Playwright)
$(if [ -f "${REPORTS_DIR}/playwright.log" ]; then echo "- E2E performance tests: ✓ Completed"; fi)

### Web Vitals Audits (Lighthouse)
$(if [ -f "${REPORTS_DIR}/lighthouse.log" ]; then echo "- Lighthouse audits: ✓ Completed"; fi)

## Reports Location
- k6 results: \`reports/k6-*.json\`
- Playwright report: \`reports/playwright-report/index.html\`
- Lighthouse report: \`reports/lighthouse-ci/\`

---
Generated by Zuclubit Performance Test Suite
EOF

    log_success "Summary generated: ${REPORTS_DIR}/SUMMARY.md"
}

# Main execution
main() {
    local test_type="${1:-smoke}"

    print_header
    check_dependencies

    case "${test_type}" in
        smoke)
            run_k6_smoke
            ;;
        load)
            run_k6_smoke
            run_k6_load
            ;;
        stress)
            run_k6_smoke
            run_k6_stress
            ;;
        soak)
            run_k6_smoke
            run_k6_soak
            ;;
        playwright)
            run_playwright
            ;;
        lighthouse)
            run_lighthouse
            ;;
        frontend)
            run_playwright
            run_lighthouse
            ;;
        backend)
            run_k6_smoke
            run_k6_load
            ;;
        all)
            run_k6_smoke
            run_k6_load
            run_playwright
            run_lighthouse
            ;;
        *)
            echo "Usage: $0 [smoke|load|stress|soak|playwright|lighthouse|frontend|backend|all]"
            echo ""
            echo "Test types:"
            echo "  smoke       - Quick validation (default)"
            echo "  load        - Normal load testing"
            echo "  stress      - Find breaking points"
            echo "  soak        - Long-running stability"
            echo "  playwright  - E2E performance tests"
            echo "  lighthouse  - Web Vitals audits"
            echo "  frontend    - All frontend tests"
            echo "  backend     - All backend tests"
            echo "  all         - Run all tests"
            exit 1
            ;;
    esac

    generate_summary

    echo ""
    log_success "All tests completed!"
    echo "Reports available in: ${REPORTS_DIR}"
    echo ""
}

main "$@"
