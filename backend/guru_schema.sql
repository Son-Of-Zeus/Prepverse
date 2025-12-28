-- Guru Mode (Teach AI) Schema
-- ================================
-- This schema supports the "Guru Mode" feature where students teach concepts 
-- to an AI persona (Reverse Student) to demonstrate mastery using the Feynman Technique.
-- The AI simulates confusion, asks clarifying questions, and grades based on simplicity and accuracy.

-- =============================================================================
-- ADD XP COLUMN TO USERS TABLE (if not exists)
-- =============================================================================

-- Add XP column to users table for tracking experience points
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;

-- =============================================================================
-- GURU SESSIONS TABLE
-- =============================================================================

-- Table for tracking teaching sessions
CREATE TABLE guru_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(50) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    
    -- Persona details (e.g., '5-year-old', 'peer', 'skeptic')
    target_persona VARCHAR(50) DEFAULT 'peer', 
    
    -- Status: 'active', 'completed', 'abandoned'
    status VARCHAR(20) DEFAULT 'active',
    
    -- Chat history stored as JSONB for context window management
    -- Structure: [{ "role": "user" | "model", "content": "..." }]
    messages JSONB DEFAULT '[]',
    
    -- Hidden field for the AI's "Ground Truth" verification
    -- This is fetched from Gemini when the session starts and used to validate user explanations
    ground_truth TEXT,
    
    -- Final report card after session completion
    -- Structure: { "accuracy": 0-10, "simplicity": 0-10, "feedback": "..." }
    score_report JSONB,
    
    -- XP earned from this teaching session
    xp_earned INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick history lookup by user
CREATE INDEX idx_guru_sessions_user ON guru_sessions(user_id);

-- Index for finding active sessions
CREATE INDEX idx_guru_sessions_status ON guru_sessions(status);

-- Index for sorting by creation date
CREATE INDEX idx_guru_sessions_created ON guru_sessions(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on guru_sessions table
ALTER TABLE guru_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own sessions
CREATE POLICY "Users can view own guru sessions"
    ON guru_sessions FOR SELECT
    USING (auth.uid()::text = (SELECT auth0_id FROM users WHERE id = guru_sessions.user_id));

-- Policy: Users can insert their own sessions
CREATE POLICY "Users can insert own guru sessions"
    ON guru_sessions FOR INSERT
    WITH CHECK (auth.uid()::text = (SELECT auth0_id FROM users WHERE id = guru_sessions.user_id));

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update own guru sessions"
    ON guru_sessions FOR UPDATE
    USING (auth.uid()::text = (SELECT auth0_id FROM users WHERE id = guru_sessions.user_id));

-- =============================================================================
-- TRIGGER FOR UPDATED_AT
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_guru_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row update
CREATE TRIGGER trigger_guru_sessions_updated_at
    BEFORE UPDATE ON guru_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_guru_sessions_updated_at();

-- =============================================================================
-- SAMPLE QUERIES FOR TESTING
-- =============================================================================

-- Get active sessions for a user:
-- SELECT * FROM guru_sessions WHERE user_id = 'user-uuid' AND status = 'active';

-- Get session history with scores:
-- SELECT id, subject, topic, score_report, xp_earned, created_at 
-- FROM guru_sessions 
-- WHERE user_id = 'user-uuid' AND status = 'completed'
-- ORDER BY created_at DESC;

-- Calculate total XP earned from Guru Mode:
-- SELECT COALESCE(SUM(xp_earned), 0) as total_guru_xp 
-- FROM guru_sessions 
-- WHERE user_id = 'user-uuid' AND status = 'completed';
