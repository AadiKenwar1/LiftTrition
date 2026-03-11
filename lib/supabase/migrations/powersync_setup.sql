-- ============================================
-- PowerSync Setup
-- ============================================
-- IMPORTANT: Replace 'CHANGE_ME_TO_SECURE_PASSWORD' with a strong random password
-- 
-- Execution Order:
-- 1. Run schema.sql (creates tables + indexes)
-- 2. Run rls_policies.sql (enables RLS + creates policies)
-- 3. Run this file (sets up PowerSync replication)
-- ============================================

-- Create a role/user with replication privileges for PowerSync
-- SECURITY: Replace 'CHANGE_ME_TO_SECURE_PASSWORD' with a strong random password
-- You will need this password when connecting PowerSync to Supabase
CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD 'CHANGE_ME_TO_SECURE_PASSWORD';

-- Grant read-only access to all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;

-- Grant access to future tables (so new tables are automatically accessible)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- Create a publication named "powersync" for all tables
-- This publication is required for PowerSync to replicate data changes
-- Note: This replicates ALL tables. For production with large datasets,
-- consider specifying only the tables you need: FOR TABLE table1, table2, ...
CREATE PUBLICATION powersync FOR ALL TABLES;

-- Grant USAGE on auth schema (required to access tables in the schema)
GRANT USAGE ON SCHEMA auth TO powersync_role;

-- Grant SELECT on auth.users table
GRANT SELECT ON auth.users TO powersync_role;


--ALTER ROLE powersync_role WITH PASSWORD 'your_new_password_here';