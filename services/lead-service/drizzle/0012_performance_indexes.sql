-- Performance Optimization Indexes
-- Purpose: Improve login and common query performance
-- See: docs/PERFORMANCE_OPTIMIZATION_PLAN_V2.md - Section 4
-- Date: 2025-12-30

-- ===========================================
-- LOGIN OPTIMIZATION INDEX
-- ===========================================

-- Index for case-insensitive email lookups during login
-- The signIn method uses: WHERE LOWER(email) = $1
-- This functional index allows PostgreSQL to use an index scan instead of sequential scan
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_email_lower_idx
  ON users (LOWER(email));

-- ===========================================
-- ONBOARDING OPTIMIZATION INDEXES
-- ===========================================

-- Index for user onboarding status lookups (if table exists)
-- The onboarding check is done during every login
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_onboarding') THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS user_onboarding_user_idx ON user_onboarding (user_id)';
  END IF;
END $$;

-- ===========================================
-- ACTIVITY LOG OPTIMIZATION
-- ===========================================

-- Compound index for activity logs with date filtering (DESC for recent-first queries)
-- This improves dashboard and audit log queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_logs_tenant_created_desc_idx
  ON activity_logs (tenant_id, created_at DESC);

-- ===========================================
-- QUOTES OPTIMIZATION
-- ===========================================

-- Index for quotes by tenant and status (common filter combination)
CREATE INDEX CONCURRENTLY IF NOT EXISTS quotes_tenant_status_idx
  ON quotes (tenant_id, status);

-- ===========================================
-- REFRESH STATISTICS
-- ===========================================

-- Update table statistics for the query planner
ANALYZE users;
ANALYZE tenant_memberships;
ANALYZE activity_logs;
ANALYZE quotes;
