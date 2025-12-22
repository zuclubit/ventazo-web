#!/bin/bash

# =============================================================================
# Teams, Territories & Quotas Module - Comprehensive Test Suite
# =============================================================================
#
# Prerequisites:
# 1. PostgreSQL database running (via docker-compose or locally)
# 2. Lead Service running on port 3000
# 3. Database tables created (run: npx tsx scripts/create-teams-tables.ts)
#
# Usage:
#   chmod +x scripts/test-teams-module.sh
#   ./scripts/test-teams-module.sh
#
# =============================================================================

set -e

# Configuration
TENANT="550e8400-e29b-41d4-a716-446655440000"
USER_ID="550e8400-e29b-41d4-a716-446655440001"
USER_ID_2="550e8400-e29b-41d4-a716-446655440002"
BASE_URL="http://localhost:3000/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

test_endpoint() {
    local name="$1"
    local expected_status="$2"
    local response_check="$3"
    shift 3

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
    echo "=== Test $TOTAL_TESTS: $name ==="

    response=$(curl -s -w "\n%{http_code}" "$@")
    body=$(echo "$response" | head -n -1)
    status=$(echo "$response" | tail -n 1)

    if [ "$status" = "$expected_status" ]; then
        if [ -n "$response_check" ]; then
            if echo "$body" | grep -q "$response_check"; then
                log_info "PASSED - Status: $status"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                log_error "FAILED - Expected response containing: $response_check"
                echo "Got: $body"
                FAILED_TESTS=$((FAILED_TESTS + 1))
            fi
        else
            log_info "PASSED - Status: $status"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        fi
    else
        log_error "FAILED - Expected status: $expected_status, Got: $status"
        echo "Response: $body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    echo "$body"
}

# Store IDs for later use
TEAM_ID=""
SUBTEAM_ID=""
TERRITORY_ID=""
QUOTA_ID=""
ASSIGNMENT_ID=""

# =============================================================================
# PREREQUISITE CHECKS
# =============================================================================
echo "=============================================="
echo "      TEAMS MODULE TEST SUITE"
echo "=============================================="
echo ""

# Check if server is running
echo "Checking server health..."
if ! curl -s http://localhost:3000/health | grep -q "healthy"; then
    log_error "Server is not running or unhealthy. Start with: npx tsx src/app.ts"
    exit 1
fi
log_info "Server is healthy"

# =============================================================================
# TEAMS CRUD TESTS
# =============================================================================
echo ""
echo "=============================================="
echo "          TEAMS CRUD TESTS"
echo "=============================================="

# Create Team
test_endpoint "Create Team (POST /teams)" "201" "id" \
    -X POST "$BASE_URL/teams" \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: $TENANT" \
    -d '{
        "name": "Enterprise Sales Team",
        "description": "Team focused on enterprise accounts",
        "type": "sales",
        "settings": {
            "autoAssignment": true,
            "roundRobinEnabled": true,
            "maxLeadsPerMember": 50,
            "workingHours": {
                "start": "09:00",
                "end": "18:00",
                "timezone": "America/New_York",
                "workDays": [1, 2, 3, 4, 5]
            },
            "notifications": {
                "newLeadAlert": true,
                "quotaReminders": true,
                "performanceReports": true
            }
        }
    }'

# Extract team ID from response (if successful)
TEAM_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created Team ID: $TEAM_ID"

# Create Child Team
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Create Child Team (POST /teams)" "201" "id" \
        -X POST "$BASE_URL/teams" \
        -H "Content-Type: application/json" \
        -H "x-tenant-id: $TENANT" \
        -d "{
            \"name\": \"Enterprise West Region\",
            \"description\": \"West coast enterprise sales\",
            \"type\": \"sales\",
            \"parentTeamId\": \"$TEAM_ID\",
            \"settings\": {
                \"autoAssignment\": true,
                \"roundRobinEnabled\": true
            }
        }"
    SUBTEAM_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

# List Teams
test_endpoint "List Teams (GET /teams)" "200" "teams" \
    -X GET "$BASE_URL/teams" \
    -H "x-tenant-id: $TENANT"

# Get Team Hierarchy
test_endpoint "Get Team Hierarchy (GET /teams/hierarchy)" "200" "" \
    -X GET "$BASE_URL/teams/hierarchy" \
    -H "x-tenant-id: $TENANT"

# Get Team by ID
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Get Team by ID (GET /teams/:id)" "200" "$TEAM_ID" \
        -X GET "$BASE_URL/teams/$TEAM_ID" \
        -H "x-tenant-id: $TENANT"
fi

# Update Team
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Update Team (PATCH /teams/:id)" "200" "Updated" \
        -X PATCH "$BASE_URL/teams/$TEAM_ID" \
        -H "Content-Type: application/json" \
        -H "x-tenant-id: $TENANT" \
        -d '{
            "description": "Updated: Team focused on large enterprise accounts",
            "settings": {
                "maxLeadsPerMember": 75
            }
        }'
fi

# =============================================================================
# TEAM MEMBERS TESTS
# =============================================================================
echo ""
echo "=============================================="
echo "        TEAM MEMBERS TESTS"
echo "=============================================="

# Add Team Member
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Add Team Member (POST /teams/:id/members)" "201" "" \
        -X POST "$BASE_URL/teams/$TEAM_ID/members" \
        -H "Content-Type: application/json" \
        -H "x-tenant-id: $TENANT" \
        -d "{
            \"userId\": \"$USER_ID\",
            \"role\": \"team_lead\",
            \"position\": \"Senior Account Executive\"
        }"
fi

# Add Second Member
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Add Second Member (POST /teams/:id/members)" "201" "" \
        -X POST "$BASE_URL/teams/$TEAM_ID/members" \
        -H "Content-Type: application/json" \
        -H "x-tenant-id: $TENANT" \
        -d "{
            \"userId\": \"$USER_ID_2\",
            \"role\": \"member\",
            \"position\": \"Account Executive\"
        }"
fi

# Get Team Members
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Get Team Members (GET /teams/:id/members)" "200" "" \
        -X GET "$BASE_URL/teams/$TEAM_ID/members" \
        -H "x-tenant-id: $TENANT"
fi

# Update Member Role
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Update Member Role (PATCH /teams/:id/members/:userId)" "200" "" \
        -X PATCH "$BASE_URL/teams/$TEAM_ID/members/$USER_ID_2" \
        -H "Content-Type: application/json" \
        -H "x-tenant-id: $TENANT" \
        -d '{
            "role": "team_lead",
            "position": "Regional Manager"
        }'
fi

# Get Next Assignee (Round Robin)
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Get Next Assignee (GET /teams/:id/next-assignee)" "200" "" \
        -X GET "$BASE_URL/teams/$TEAM_ID/next-assignee" \
        -H "x-tenant-id: $TENANT"
fi

# Get Team Stats
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Get Team Stats (GET /teams/:id/stats)" "200" "" \
        -X GET "$BASE_URL/teams/$TEAM_ID/stats" \
        -H "x-tenant-id: $TENANT"
fi

# =============================================================================
# TERRITORIES TESTS
# =============================================================================
echo ""
echo "=============================================="
echo "          TERRITORIES TESTS"
echo "=============================================="

# Create Territory
test_endpoint "Create Territory (POST /territories)" "201" "id" \
    -X POST "$BASE_URL/territories" \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: $TENANT" \
    -d '{
        "name": "North America Enterprise",
        "description": "Enterprise accounts in North America",
        "type": "geographic",
        "criteria": {
            "geographic": {
                "countries": ["US", "CA"],
                "regions": ["Northeast", "Southeast", "Midwest", "Southwest", "West"]
            },
            "accountSize": {
                "minEmployees": 1000,
                "segments": ["enterprise", "large_enterprise"]
            },
            "revenueRange": {
                "minRevenue": 10000000,
                "currency": "USD"
            }
        },
        "settings": {
            "autoLeadRouting": true,
            "allowOverlap": false,
            "roundRobinWithinTerritory": true,
            "conflictResolution": "primary_owner",
            "leadCapacity": 500
        }
    }'

TERRITORY_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created Territory ID: $TERRITORY_ID"

# List Territories
test_endpoint "List Territories (GET /territories)" "200" "" \
    -X GET "$BASE_URL/territories" \
    -H "x-tenant-id: $TENANT"

# Get Territory Hierarchy
test_endpoint "Get Territory Hierarchy (GET /territories/hierarchy)" "200" "" \
    -X GET "$BASE_URL/territories/hierarchy" \
    -H "x-tenant-id: $TENANT"

# Update Territory
if [ -n "$TERRITORY_ID" ]; then
    test_endpoint "Update Territory (PATCH /territories/:id)" "200" "" \
        -X PATCH "$BASE_URL/territories/$TERRITORY_ID" \
        -H "Content-Type: application/json" \
        -H "x-tenant-id: $TENANT" \
        -d '{
            "description": "Updated: Premium enterprise accounts in North America",
            "settings": {
                "leadCapacity": 750
            }
        }'
fi

# Territory Assignment
if [ -n "$TERRITORY_ID" ]; then
    test_endpoint "Assign User to Territory (POST /territories/:id/assignments)" "201" "" \
        -X POST "$BASE_URL/territories/$TERRITORY_ID/assignments" \
        -H "Content-Type: application/json" \
        -H "x-tenant-id: $TENANT" \
        -d "{
            \"userId\": \"$USER_ID\",
            \"teamId\": \"$TEAM_ID\",
            \"assignmentType\": \"exclusive\",
            \"isPrimary\": true
        }"
fi

# Get Territory Assignments
if [ -n "$TERRITORY_ID" ]; then
    test_endpoint "Get Territory Assignments (GET /territories/:id/assignments)" "200" "" \
        -X GET "$BASE_URL/territories/$TERRITORY_ID/assignments" \
        -H "x-tenant-id: $TENANT"
fi

# Match Lead to Territory
test_endpoint "Match Lead to Territory (POST /territories/match)" "200" "" \
    -X POST "$BASE_URL/territories/match" \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: $TENANT" \
    -d '{
        "country": "US",
        "state": "CA",
        "city": "San Francisco",
        "industry": "healthcare",
        "employeeCount": 5000,
        "annualRevenue": 50000000
    }'

# Get Territory Stats
if [ -n "$TERRITORY_ID" ]; then
    test_endpoint "Get Territory Stats (GET /territories/:id/stats)" "200" "" \
        -X GET "$BASE_URL/territories/$TERRITORY_ID/stats" \
        -H "x-tenant-id: $TENANT"
fi

# =============================================================================
# QUOTAS TESTS
# =============================================================================
echo ""
echo "=============================================="
echo "            QUOTAS TESTS"
echo "=============================================="

# Create Quota
test_endpoint "Create Quota (POST /quotas)" "201" "id" \
    -X POST "$BASE_URL/quotas" \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: $TENANT" \
    -d '{
        "name": "Q1 2025 Revenue Quota",
        "description": "First quarter revenue target",
        "type": "revenue",
        "period": "quarterly",
        "startDate": "2025-01-01T00:00:00Z",
        "endDate": "2025-03-31T23:59:59Z",
        "target": 1000000,
        "currency": "USD",
        "settings": {
            "allowOverachievement": true,
            "prorateForiNewHires": true,
            "includeInForecasting": true,
            "rollupToParent": true,
            "accelerators": [
                {"threshold": 100, "multiplier": 1.0, "name": "Base"},
                {"threshold": 110, "multiplier": 1.25, "name": "Accelerator 1"},
                {"threshold": 125, "multiplier": 1.5, "name": "Accelerator 2"}
            ]
        }
    }'

QUOTA_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created Quota ID: $QUOTA_ID"

# List Quotas
test_endpoint "List Quotas (GET /quotas)" "200" "" \
    -X GET "$BASE_URL/quotas" \
    -H "x-tenant-id: $TENANT"

# Get Quota by ID
if [ -n "$QUOTA_ID" ]; then
    test_endpoint "Get Quota by ID (GET /quotas/:id)" "200" "$QUOTA_ID" \
        -X GET "$BASE_URL/quotas/$QUOTA_ID" \
        -H "x-tenant-id: $TENANT"
fi

# Update Quota
if [ -n "$QUOTA_ID" ]; then
    test_endpoint "Update Quota (PATCH /quotas/:id)" "200" "" \
        -X PATCH "$BASE_URL/quotas/$QUOTA_ID" \
        -H "Content-Type: application/json" \
        -H "x-tenant-id: $TENANT" \
        -d '{
            "description": "Updated: First quarter revenue target with stretch goal",
            "target": 1200000
        }'
fi

# Activate Quota
if [ -n "$QUOTA_ID" ]; then
    test_endpoint "Activate Quota (POST /quotas/:id/activate)" "200" "" \
        -X POST "$BASE_URL/quotas/$QUOTA_ID/activate" \
        -H "x-tenant-id: $TENANT"
fi

# Assign Quota to User
if [ -n "$QUOTA_ID" ]; then
    test_endpoint "Assign Quota to User (POST /quotas/:id/assignments)" "201" "id" \
        -X POST "$BASE_URL/quotas/$QUOTA_ID/assignments" \
        -H "Content-Type: application/json" \
        -H "x-tenant-id: $TENANT" \
        -d "{
            \"userId\": \"$USER_ID\",
            \"target\": 300000
        }"
    ASSIGNMENT_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

# Get Quota Assignments
if [ -n "$QUOTA_ID" ]; then
    test_endpoint "Get Quota Assignments (GET /quotas/:id/assignments)" "200" "" \
        -X GET "$BASE_URL/quotas/$QUOTA_ID/assignments" \
        -H "x-tenant-id: $TENANT"
fi

# Adjust Quota Assignment
if [ -n "$QUOTA_ID" ] && [ -n "$ASSIGNMENT_ID" ]; then
    test_endpoint "Adjust Quota (POST /quotas/:id/assignments/:assignmentId/adjust)" "201" "" \
        -X POST "$BASE_URL/quotas/$QUOTA_ID/assignments/$ASSIGNMENT_ID/adjust" \
        -H "Content-Type: application/json" \
        -H "x-tenant-id: $TENANT" \
        -H "x-user-id: $USER_ID" \
        -d '{
            "amount": 50000,
            "reason": "Mid-quarter adjustment for territory expansion"
        }'
fi

# Get Team Rollup
if [ -n "$QUOTA_ID" ]; then
    test_endpoint "Get Team Rollup (GET /quotas/:id/rollup/teams)" "200" "" \
        -X GET "$BASE_URL/quotas/$QUOTA_ID/rollup/teams" \
        -H "x-tenant-id: $TENANT"
fi

# Get Territory Rollup
if [ -n "$QUOTA_ID" ]; then
    test_endpoint "Get Territory Rollup (GET /quotas/:id/rollup/territories)" "200" "" \
        -X GET "$BASE_URL/quotas/$QUOTA_ID/rollup/territories" \
        -H "x-tenant-id: $TENANT"
fi

# Get Leaderboard
if [ -n "$QUOTA_ID" ]; then
    test_endpoint "Get Leaderboard (GET /quotas/:id/leaderboard)" "200" "" \
        -X GET "$BASE_URL/quotas/$QUOTA_ID/leaderboard?limit=10" \
        -H "x-tenant-id: $TENANT"
fi

# Get User Quotas
test_endpoint "Get User Quotas (GET /quotas/user/:userId)" "200" "" \
    -X GET "$BASE_URL/quotas/user/$USER_ID" \
    -H "x-tenant-id: $TENANT"

# Get User Performance
test_endpoint "Get User Performance (GET /quotas/user/:userId/performance)" "200" "metrics" \
    -X GET "$BASE_URL/quotas/user/$USER_ID/performance?startDate=2025-01-01T00:00:00Z&endDate=2025-12-31T23:59:59Z" \
    -H "x-tenant-id: $TENANT"

# Archive Quota
if [ -n "$QUOTA_ID" ]; then
    test_endpoint "Archive Quota (POST /quotas/:id/archive)" "200" "" \
        -X POST "$BASE_URL/quotas/$QUOTA_ID/archive" \
        -H "x-tenant-id: $TENANT"
fi

# =============================================================================
# CLEANUP
# =============================================================================
echo ""
echo "=============================================="
echo "            CLEANUP"
echo "=============================================="

# Remove Team Member
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Remove Team Member (DELETE /teams/:id/members/:userId)" "204" "" \
        -X DELETE "$BASE_URL/teams/$TEAM_ID/members/$USER_ID_2" \
        -H "x-tenant-id: $TENANT"
fi

# Remove Territory Assignment
if [ -n "$TERRITORY_ID" ]; then
    test_endpoint "Remove Territory Assignment (DELETE /territories/:id/assignments/:userId)" "204" "" \
        -X DELETE "$BASE_URL/territories/$TERRITORY_ID/assignments/$USER_ID" \
        -H "x-tenant-id: $TENANT"
fi

# Delete Sub-Team
if [ -n "$SUBTEAM_ID" ]; then
    test_endpoint "Delete Sub-Team (DELETE /teams/:id)" "204" "" \
        -X DELETE "$BASE_URL/teams/$SUBTEAM_ID" \
        -H "x-tenant-id: $TENANT"
fi

# Delete Team
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Delete Team (DELETE /teams/:id)" "204" "" \
        -X DELETE "$BASE_URL/teams/$TEAM_ID" \
        -H "x-tenant-id: $TENANT"
fi

# Delete Territory
if [ -n "$TERRITORY_ID" ]; then
    test_endpoint "Delete Territory (DELETE /territories/:id)" "204" "" \
        -X DELETE "$BASE_URL/territories/$TERRITORY_ID" \
        -H "x-tenant-id: $TENANT"
fi

# =============================================================================
# TEST SUMMARY
# =============================================================================
echo ""
echo "=============================================="
echo "           TEST SUMMARY"
echo "=============================================="
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ "$FAILED_TESTS" -eq 0 ]; then
    log_info "All tests passed!"
    exit 0
else
    log_error "Some tests failed. Please review the output above."
    exit 1
fi
