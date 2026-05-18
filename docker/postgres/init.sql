-- ============================================================
-- SECE CO-PO Platform — PostgreSQL Initialization
-- Additional indexes and extensions beyond Django migrations
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search on student names

-- The main schema is handled by Django migrations.
-- This file handles database-level configurations.

-- Set timezone
SET timezone = 'Asia/Kolkata';

-- Increase work_mem for complex attainment aggregation queries
ALTER DATABASE sece_copo SET work_mem = '32MB';
