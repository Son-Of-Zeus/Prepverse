-- ============================================================================
-- Optimized SQL Functions for PrepVerse
--
-- These functions provide efficient database operations that replace
-- inefficient client-side aggregation with proper SQL queries.
--
-- Run this migration on your Supabase database to enable optimized queries.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- get_school_states_with_counts
--
-- Returns all states with their school counts, sorted by count descending.
-- This replaces loading 20K+ school rows into memory for Python aggregation.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_school_states_with_counts()
RETURNS TABLE (state TEXT, count BIGINT)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        state,
        COUNT(*) as count
    FROM schools
    WHERE state IS NOT NULL
    GROUP BY state
    ORDER BY count DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_school_states_with_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_school_states_with_counts() TO service_role;


-- ----------------------------------------------------------------------------
-- get_distinct_subjects
--
-- Returns distinct subjects for a given class level from curriculum_topics.
-- More efficient than fetching all topics and deduplicating in Python.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_distinct_subjects(p_class_level INT)
RETURNS TABLE (subject TEXT)
LANGUAGE SQL
STABLE
AS $$
    SELECT DISTINCT subject
    FROM curriculum_topics
    WHERE class_level = p_class_level
      AND is_active = true
    ORDER BY subject;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_distinct_subjects(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_distinct_subjects(INT) TO service_role;


-- ----------------------------------------------------------------------------
-- Indexes for common query patterns (if not already exists)
-- ----------------------------------------------------------------------------

-- Composite index for school state filtering and counting
CREATE INDEX IF NOT EXISTS idx_schools_state_for_count
ON schools(state)
WHERE state IS NOT NULL;

-- Composite index for curriculum topics filtering
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_class_subject
ON curriculum_topics(class_level, is_active, subject);


-- ============================================================================
-- Usage Notes:
--
-- 1. Run this SQL in your Supabase SQL Editor or via migration
--
-- 2. Backend code will try to use these functions first, and fall back to
--    less efficient queries if they don't exist.
--
-- 3. Expected Performance Improvements:
--    - get_school_states_with_counts: ~100x faster (single query vs 20K+ rows)
--    - get_distinct_subjects: ~10x faster (DB-side DISTINCT vs Python set())
-- ============================================================================
