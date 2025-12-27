-- PrepVerse Schools Schema for Supabase (PostgreSQL)
-- Run this in your Supabase SQL Editor
-- Data source: https://github.com/deedy/cbse_schools_data (CC-BY-SA 4.0)

-- Schools table
-- Contains CBSE affiliated schools data (20,367 schools as of 2018)
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Core identifiers
    affiliation_code TEXT UNIQUE NOT NULL,  -- CBSE affiliation number (e.g., "1030456")
    name TEXT NOT NULL,

    -- Location
    state TEXT NOT NULL,
    district TEXT,
    region TEXT,
    address TEXT,
    pincode TEXT,

    -- Contact info
    phone TEXT,
    email TEXT,
    website TEXT,

    -- School details
    principal_name TEXT,
    year_founded INTEGER,
    affiliation_type TEXT,  -- e.g., "Permanent", "Provisional"
    school_type TEXT,       -- e.g., "Co-ed", "Boys", "Girls"

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools USING gin (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_schools_state ON schools(state);
CREATE INDEX IF NOT EXISTS idx_schools_district ON schools(district);
CREATE INDEX IF NOT EXISTS idx_schools_affiliation_code ON schools(affiliation_code);
CREATE INDEX IF NOT EXISTS idx_schools_name_lower ON schools(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_schools_address ON schools USING gin (to_tsvector('english', address));

-- Update trigger for updated_at
CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON schools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add school_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);

-- Enable RLS on schools table
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Everyone can read schools (public data)
CREATE POLICY "Anyone can view schools"
    ON schools FOR SELECT
    USING (true);

-- Only backend service can insert/update schools (via service role key)
-- No INSERT/UPDATE/DELETE policies for authenticated users

-- Function to search schools by name with fuzzy matching
CREATE OR REPLACE FUNCTION search_schools(
    search_query TEXT,
    state_filter TEXT DEFAULT NULL,
    result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    affiliation_code TEXT,
    name TEXT,
    state TEXT,
    district TEXT,
    address TEXT,
    similarity_score REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.affiliation_code,
        s.name,
        s.state,
        s.district,
        s.address,
        similarity(LOWER(s.name), LOWER(search_query)) as similarity_score
    FROM schools s
    WHERE
        (state_filter IS NULL OR s.state = state_filter)
        AND (
            LOWER(s.name) LIKE '%' || LOWER(search_query) || '%'
            OR s.affiliation_code LIKE search_query || '%'
        )
    ORDER BY
        -- Exact matches first
        CASE WHEN LOWER(s.name) = LOWER(search_query) THEN 0 ELSE 1 END,
        -- Then prefix matches
        CASE WHEN LOWER(s.name) LIKE LOWER(search_query) || '%' THEN 0 ELSE 1 END,
        -- Then similarity score
        similarity(LOWER(s.name), LOWER(search_query)) DESC,
        s.name
    LIMIT result_limit;
END;
$$;

-- Enable pg_trgm extension for similarity search (run if not exists)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- View for school statistics by state
CREATE OR REPLACE VIEW school_stats_by_state AS
SELECT
    state,
    COUNT(*) as school_count
FROM schools
GROUP BY state
ORDER BY school_count DESC;

-- Grant permissions
GRANT SELECT ON schools TO authenticated;
GRANT SELECT ON school_stats_by_state TO authenticated;

COMMENT ON TABLE schools IS 'CBSE affiliated schools directory';
COMMENT ON COLUMN schools.affiliation_code IS 'Unique CBSE affiliation number';
COMMENT ON COLUMN schools.name IS 'Official school name';
