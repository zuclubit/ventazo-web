#!/bin/bash
#
# Quick Bot-Helper Integration Test Script
#
# Usage:
#   ./scripts/test-bot-helper.sh
#   BOT_HELPER_URL=http://localhost:3000 ./scripts/test-bot-helper.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BOT_HELPER_URL="${BOT_HELPER_URL:-http://localhost:3000}"
SHARED_SECRET="${BOT_HELPER_SHARED_SECRET:-${CRM_INTEGRATION_SECRET:-test-secret-for-local-development-min-32-chars}}"

echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Bot-Helper Integration Quick Test                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Bot-Helper URL: ${BOT_HELPER_URL}"
echo -e "  Shared Secret: ${SHARED_SECRET:0:8}...${SHARED_SECRET: -4}"
echo ""

# Function to generate HMAC signature
generate_signature() {
    local body="$1"
    local timestamp=$(date +%s%3N)
    local payload="${timestamp}.${body}"
    local signature=$(echo -n "$payload" | openssl dgst -sha256 -hmac "$SHARED_SECRET" | cut -d' ' -f2)
    echo "$signature:$timestamp"
}

# Test 1: Health Check
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 1: Bot-Helper CRM Health Check${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${BOT_HELPER_URL}/v1/crm/health" 2>/dev/null || echo "FAILED")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HEALTH_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓ Health check passed${NC}"
    echo -e "    Response: $HEALTH_BODY"
else
    echo -e "  ${RED}✗ Health check failed (HTTP $HEALTH_CODE)${NC}"
    echo -e "    Response: $HEALTH_BODY"
    echo -e "\n${RED}Bot-helper is not reachable. Please start it first.${NC}"
    exit 1
fi

# Test 2: Chat with HMAC Auth
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 2: Chat with HMAC Authentication${NC}"

CHAT_BODY='{"messages":[{"role":"user","content":"Say hello in Spanish"}],"tenantId":"test-tenant"}'
SIG_DATA=$(generate_signature "$CHAT_BODY")
SIGNATURE=$(echo "$SIG_DATA" | cut -d':' -f1)
TIMESTAMP=$(echo "$SIG_DATA" | cut -d':' -f2)

CHAT_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BOT_HELPER_URL}/v1/crm/chat" \
    -H "Content-Type: application/json" \
    -H "x-crm-signature: $SIGNATURE" \
    -H "x-crm-timestamp: $TIMESTAMP" \
    -d "$CHAT_BODY" 2>/dev/null || echo "FAILED")

CHAT_CODE=$(echo "$CHAT_RESPONSE" | tail -n1)
CHAT_BODY_RESP=$(echo "$CHAT_RESPONSE" | head -n -1)

if [ "$CHAT_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓ Chat with HMAC auth passed${NC}"
    echo -e "    Response: $(echo "$CHAT_BODY_RESP" | head -c 200)..."
else
    echo -e "  ${RED}✗ Chat failed (HTTP $CHAT_CODE)${NC}"
    echo -e "    Response: $CHAT_BODY_RESP"
fi

# Test 3: Lead Scoring
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 3: Lead Scoring${NC}"

LEAD_BODY='{"leadData":{"companyName":"Acme Corp","email":"john@acme.com","industry":"Technology"},"tenantId":"test-tenant"}'
SIG_DATA=$(generate_signature "$LEAD_BODY")
SIGNATURE=$(echo "$SIG_DATA" | cut -d':' -f1)
TIMESTAMP=$(echo "$SIG_DATA" | cut -d':' -f2)

LEAD_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BOT_HELPER_URL}/v1/crm/lead/score" \
    -H "Content-Type: application/json" \
    -H "x-crm-signature: $SIGNATURE" \
    -H "x-crm-timestamp: $TIMESTAMP" \
    -d "$LEAD_BODY" 2>/dev/null || echo "FAILED")

LEAD_CODE=$(echo "$LEAD_RESPONSE" | tail -n1)
LEAD_BODY_RESP=$(echo "$LEAD_RESPONSE" | head -n -1)

if [ "$LEAD_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓ Lead scoring passed${NC}"
    echo -e "    Response: $LEAD_BODY_RESP"
else
    echo -e "  ${RED}✗ Lead scoring failed (HTTP $LEAD_CODE)${NC}"
    echo -e "    Response: $LEAD_BODY_RESP"
fi

# Test 4: Sentiment Analysis
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 4: Sentiment Analysis${NC}"

SENTIMENT_BODY='{"text":"Estoy muy contento con el servicio, excelente atención!","tenantId":"test-tenant"}'
SIG_DATA=$(generate_signature "$SENTIMENT_BODY")
SIGNATURE=$(echo "$SIG_DATA" | cut -d':' -f1)
TIMESTAMP=$(echo "$SIG_DATA" | cut -d':' -f2)

SENTIMENT_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BOT_HELPER_URL}/v1/crm/sentiment/analyze" \
    -H "Content-Type: application/json" \
    -H "x-crm-signature: $SIGNATURE" \
    -H "x-crm-timestamp: $TIMESTAMP" \
    -d "$SENTIMENT_BODY" 2>/dev/null || echo "FAILED")

SENTIMENT_CODE=$(echo "$SENTIMENT_RESPONSE" | tail -n1)
SENTIMENT_BODY_RESP=$(echo "$SENTIMENT_RESPONSE" | head -n -1)

if [ "$SENTIMENT_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓ Sentiment analysis passed${NC}"
    echo -e "    Response: $SENTIMENT_BODY_RESP"
else
    echo -e "  ${RED}✗ Sentiment analysis failed (HTTP $SENTIMENT_CODE)${NC}"
    echo -e "    Response: $SENTIMENT_BODY_RESP"
fi

echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     Tests Complete                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"
