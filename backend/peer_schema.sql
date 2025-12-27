-- PrepVerse Peer Mentoring Schema
-- Run in Supabase SQL Editor

-- ============================================
-- ENCRYPTION KEY STORAGE
-- ============================================

-- User encryption keys for E2E messaging (Signal Protocol)
CREATE TABLE IF NOT EXISTS user_encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Signal Protocol keys (stored as base64)
    identity_public_key TEXT NOT NULL,        -- Long-term identity key
    signed_prekey_public TEXT NOT NULL,       -- Signed prekey (rotated periodically)
    signed_prekey_signature TEXT NOT NULL,    -- Signature of signed prekey
    signed_prekey_id INTEGER NOT NULL,

    -- One-time prekeys are stored separately
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- One-time prekeys for Signal Protocol (consumed on first message)
CREATE TABLE IF NOT EXISTS user_one_time_prekeys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prekey_id INTEGER NOT NULL,
    prekey_public TEXT NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, prekey_id)
);

CREATE INDEX idx_one_time_prekeys_user_unused ON user_one_time_prekeys(user_id, used) WHERE used = FALSE;

-- ============================================
-- PEER SESSIONS (Study Rooms)
-- ============================================

CREATE TABLE IF NOT EXISTS peer_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Room metadata
    name TEXT,                                -- Optional room name
    topic TEXT,                               -- Study topic (e.g., "Quadratic Equations")
    subject TEXT,                             -- Subject (e.g., "Mathematics")

    -- Matching constraints (CRITICAL: same school + grade)
    school_id UUID NOT NULL REFERENCES schools(id),
    class_level INTEGER NOT NULL CHECK (class_level IN (10, 12)),

    -- Room settings
    max_participants INTEGER DEFAULT 4 CHECK (max_participants BETWEEN 2 AND 4),
    is_voice_enabled BOOLEAN DEFAULT TRUE,
    is_whiteboard_enabled BOOLEAN DEFAULT TRUE,

    -- Room state
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'closed')),
    created_by UUID NOT NULL REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_peer_sessions_school_class ON peer_sessions(school_id, class_level);
CREATE INDEX idx_peer_sessions_status ON peer_sessions(status);
CREATE INDEX idx_peer_sessions_topic ON peer_sessions(topic);

-- ============================================
-- PEER SESSION PARTICIPANTS
-- ============================================

CREATE TABLE IF NOT EXISTS peer_session_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES peer_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role in session
    role TEXT DEFAULT 'participant' CHECK (role IN ('host', 'participant')),

    -- Voice/video state
    is_muted BOOLEAN DEFAULT FALSE,
    is_voice_active BOOLEAN DEFAULT FALSE,

    -- Session state
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(session_id, user_id)
);

CREATE INDEX idx_participants_session ON peer_session_participants(session_id);
CREATE INDEX idx_participants_user ON peer_session_participants(user_id);
CREATE INDEX idx_participants_active ON peer_session_participants(session_id, left_at) WHERE left_at IS NULL;

-- ============================================
-- ENCRYPTED MESSAGES
-- ============================================

-- Messages are E2E encrypted - server stores ciphertext only
CREATE TABLE IF NOT EXISTS peer_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES peer_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),

    -- Encrypted content (Signal Protocol ciphertext)
    -- Each recipient has their own encrypted copy
    encrypted_content JSONB NOT NULL,  -- {"recipient_id": "ciphertext_base64", ...}

    -- Message metadata (not encrypted)
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'whiteboard_sync')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_session ON peer_messages(session_id);
CREATE INDEX idx_messages_created ON peer_messages(created_at);

-- ============================================
-- WHITEBOARD STATE (CRDT-based)
-- ============================================

CREATE TABLE IF NOT EXISTS peer_whiteboard_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID UNIQUE NOT NULL REFERENCES peer_sessions(id) ON DELETE CASCADE,

    -- CRDT state for conflict-free sync
    -- Stores all drawing operations as a CRDT log
    crdt_state JSONB DEFAULT '{"operations": [], "version": 0}',

    -- Last update
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- ============================================
-- USER BLOCKING
-- ============================================

CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON user_blocks(blocked_id);

-- ============================================
-- USER REPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS user_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    reported_id UUID NOT NULL REFERENCES users(id),
    session_id UUID REFERENCES peer_sessions(id),

    reason TEXT NOT NULL CHECK (reason IN (
        'inappropriate_content',
        'harassment',
        'spam',
        'impersonation',
        'other'
    )),
    description TEXT,

    -- Admin review
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CHECK (reporter_id != reported_id)
);

CREATE INDEX idx_reports_status ON user_reports(status);

-- ============================================
-- PEER DISCOVERY: User Online Status
-- ============================================

-- Tracks who is available for peer sessions (updated via Supabase Realtime presence)
CREATE TABLE IF NOT EXISTS peer_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Availability status
    is_available BOOLEAN DEFAULT FALSE,
    status_message TEXT,                      -- e.g., "Looking for help with Physics"

    -- Topics user is strong in (for matching)
    strong_topics TEXT[],

    -- Topics user wants help with (for matching)
    seeking_help_topics TEXT[],

    -- Denormalized for faster queries (from users table)
    school_id UUID REFERENCES schools(id),
    class_level INTEGER,

    -- Last seen
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_availability_school_class ON peer_availability(school_id, class_level);
CREATE INDEX idx_availability_available ON peer_availability(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_availability_topics ON peer_availability USING gin(strong_topics);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_one_time_prekeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_whiteboard_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_availability ENABLE ROW LEVEL SECURITY;

-- Users can read their own encryption keys
CREATE POLICY "Users can view own encryption keys"
    ON user_encryption_keys FOR SELECT
    USING (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

-- Users can read other users' public keys (needed for E2E encryption)
CREATE POLICY "Users can view others public keys"
    ON user_encryption_keys FOR SELECT
    USING (true);  -- Public keys are meant to be shared

-- Users can manage their own keys
CREATE POLICY "Users can manage own encryption keys"
    ON user_encryption_keys FOR ALL
    USING (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

-- Peer sessions: users can view sessions from their school/class
CREATE POLICY "Users can view peer sessions from same school and class"
    ON peer_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth0_id = auth.uid()::text
            AND u.school_id = peer_sessions.school_id
            AND u.class_level = peer_sessions.class_level
        )
    );

-- Users can create sessions in their school/class
CREATE POLICY "Users can create peer sessions"
    ON peer_sessions FOR INSERT
    WITH CHECK (
        created_by IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text)
        AND EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth0_id = auth.uid()::text
            AND u.school_id = peer_sessions.school_id
            AND u.class_level = peer_sessions.class_level
        )
    );

-- Participants can view their session's participants
CREATE POLICY "Users can view session participants"
    ON peer_session_participants FOR SELECT
    USING (
        session_id IN (
            SELECT ps.id FROM peer_sessions ps
            JOIN users u ON u.school_id = ps.school_id AND u.class_level = ps.class_level
            WHERE u.auth0_id = auth.uid()::text
        )
    );

-- Users can join/leave sessions
CREATE POLICY "Users can join sessions"
    ON peer_session_participants FOR INSERT
    WITH CHECK (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

CREATE POLICY "Users can leave sessions"
    ON peer_session_participants FOR UPDATE
    USING (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

-- Messages: participants can view messages in their sessions
CREATE POLICY "Participants can view session messages"
    ON peer_messages FOR SELECT
    USING (
        session_id IN (
            SELECT session_id FROM peer_session_participants psp
            JOIN users u ON psp.user_id = u.id
            WHERE u.auth0_id = auth.uid()::text AND psp.left_at IS NULL
        )
    );

-- Participants can send messages
CREATE POLICY "Participants can send messages"
    ON peer_messages FOR INSERT
    WITH CHECK (
        sender_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text)
        AND session_id IN (
            SELECT session_id FROM peer_session_participants psp
            JOIN users u ON psp.user_id = u.id
            WHERE u.auth0_id = auth.uid()::text AND psp.left_at IS NULL
        )
    );

-- Blocking: users can manage their blocks
CREATE POLICY "Users can manage blocks"
    ON user_blocks FOR ALL
    USING (blocker_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

-- Availability: users can see available peers from same school/class
CREATE POLICY "Users can view peers from same school and class"
    ON peer_availability FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth0_id = auth.uid()::text
            AND u.school_id = peer_availability.school_id
            AND u.class_level = peer_availability.class_level
        )
    );

CREATE POLICY "Users can manage own availability"
    ON peer_availability FOR ALL
    USING (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get available peers (same school + class, not blocked)
CREATE OR REPLACE FUNCTION get_available_peers(requesting_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    strong_topics TEXT[],
    seeking_help_topics TEXT[],
    status_message TEXT,
    last_seen_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_school_id UUID;
    user_class_level INTEGER;
BEGIN
    -- Get requesting user's school and class
    SELECT u.school_id, u.class_level INTO user_school_id, user_class_level
    FROM users u WHERE u.id = requesting_user_id;

    RETURN QUERY
    SELECT
        pa.user_id,
        u.full_name as user_name,
        pa.strong_topics,
        pa.seeking_help_topics,
        pa.status_message,
        pa.last_seen_at
    FROM peer_availability pa
    JOIN users u ON pa.user_id = u.id
    WHERE
        pa.is_available = TRUE
        AND pa.school_id = user_school_id
        AND pa.class_level = user_class_level
        AND pa.user_id != requesting_user_id
        -- Exclude blocked users (both directions)
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks ub
            WHERE (ub.blocker_id = requesting_user_id AND ub.blocked_id = pa.user_id)
               OR (ub.blocker_id = pa.user_id AND ub.blocked_id = requesting_user_id)
        )
        -- Only show users seen in last 5 minutes
        AND pa.last_seen_at > NOW() - INTERVAL '5 minutes'
    ORDER BY pa.last_seen_at DESC;
END;
$$;

-- Function to find peers by topic match
CREATE OR REPLACE FUNCTION find_peers_by_topic(
    requesting_user_id UUID,
    topic_needed TEXT
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    strong_topics TEXT[],
    match_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_school_id UUID;
    user_class_level INTEGER;
BEGIN
    -- Get requesting user's school and class
    SELECT u.school_id, u.class_level INTO user_school_id, user_class_level
    FROM users u WHERE u.id = requesting_user_id;

    RETURN QUERY
    SELECT
        pa.user_id,
        u.full_name as user_name,
        pa.strong_topics,
        -- Match score: higher if topic is in their strong topics
        CASE WHEN topic_needed = ANY(pa.strong_topics) THEN 100 ELSE 50 END as match_score
    FROM peer_availability pa
    JOIN users u ON pa.user_id = u.id
    WHERE
        pa.is_available = TRUE
        AND pa.school_id = user_school_id
        AND pa.class_level = user_class_level
        AND pa.user_id != requesting_user_id
        AND topic_needed = ANY(pa.strong_topics)
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks ub
            WHERE (ub.blocker_id = requesting_user_id AND ub.blocked_id = pa.user_id)
               OR (ub.blocker_id = pa.user_id AND ub.blocked_id = requesting_user_id)
        )
        AND pa.last_seen_at > NOW() - INTERVAL '5 minutes'
    ORDER BY match_score DESC, pa.last_seen_at DESC;
END;
$$;

-- Function to close stale sessions (cleanup job)
CREATE OR REPLACE FUNCTION cleanup_stale_peer_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Close sessions with no active participants for > 10 minutes
    UPDATE peer_sessions
    SET status = 'closed', closed_at = NOW()
    WHERE status != 'closed'
    AND NOT EXISTS (
        SELECT 1 FROM peer_session_participants psp
        WHERE psp.session_id = peer_sessions.id
        AND psp.left_at IS NULL
    )
    AND created_at < NOW() - INTERVAL '10 minutes';

    -- Close sessions older than 4 hours regardless
    UPDATE peer_sessions
    SET status = 'closed', closed_at = NOW()
    WHERE status != 'closed'
    AND created_at < NOW() - INTERVAL '4 hours';
END;
$$;
