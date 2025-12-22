#!/bin/bash
# ============================================
# Zuclubit CRM - Create Test Users
# Run this script after `supabase start`
# ============================================

set -e

API_URL="http://127.0.0.1:54321"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
DEMO_TENANT_ID="550e8400-e29b-41d4-a716-446655440000"

echo "Creating test users for Zuclubit CRM..."
echo ""

# Function to create user and add to tenant
create_user() {
  local email=$1
  local password=$2
  local name=$3
  local role=$4

  echo "Creating user: $email ($role)..."

  # Create user via Supabase Auth Admin API
  response=$(curl -s -X POST "${API_URL}/auth/v1/admin/users" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"${email}\",
      \"password\": \"${password}\",
      \"email_confirm\": true,
      \"user_metadata\": {
        \"full_name\": \"${name}\"
      }
    }")

  # Extract user ID from response
  user_id=$(echo $response | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -z "$user_id" ]; then
    echo "  Error: Could not create user or get user ID"
    echo "  Response: $response"
    return 1
  fi

  echo "  User ID: $user_id"

  # Add user to Demo tenant with specified role
  docker exec supabase_db_zuclubit-smart-crm psql -U postgres -d postgres -c \
    "INSERT INTO public.tenant_memberships (user_id, tenant_id, role, status)
     VALUES ('${user_id}', '${DEMO_TENANT_ID}', '${role}', 'active')
     ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = '${role}';" > /dev/null 2>&1

  echo "  Added to Demo tenant as: $role"
  echo ""
}

# Create test users
create_user "owner@demo.com" "Test1234!" "Juan Owner" "owner"
create_user "admin@demo.com" "Test1234!" "Maria Admin" "admin"
create_user "manager@demo.com" "Test1234!" "Carlos Manager" "manager"
create_user "sales@demo.com" "Test1234!" "Ana Sales" "sales_rep"
create_user "viewer@demo.com" "Test1234!" "Pedro Viewer" "viewer"

echo "============================================"
echo "Test users created successfully!"
echo ""
echo "Login credentials:"
echo "  - owner@demo.com / Test1234! (Owner)"
echo "  - admin@demo.com / Test1234! (Admin)"
echo "  - manager@demo.com / Test1234! (Manager)"
echo "  - sales@demo.com / Test1234! (Sales Rep)"
echo "  - viewer@demo.com / Test1234! (Viewer)"
echo ""
echo "Supabase Studio: http://127.0.0.1:54323"
echo "============================================"
