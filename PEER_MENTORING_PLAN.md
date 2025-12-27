# Peer Mentoring Feature - Implementation Plan

## Overview

This document provides a complete implementation plan for the PrepVerse peer mentoring feature, enabling students to connect with classmates from the **same school and grade** for collaborative study sessions.

### Key Features
- **Study Rooms**: 2-4 students per room
- **Communication**: End-to-end encrypted text chat + voice calls
- **Whiteboard**: Real-time collaborative drawing + text
- **Discovery**: Browse online peers + topic-based smart matching
- **Safety**: Block/report functionality
- **Matching**: Restricted to same `school_id` AND same `class_level`

### Tech Stack
- **Real-time**: Supabase Realtime (presence, messaging)
- **Voice**: WebRTC peer-to-peer
- **Encryption**: Signal Protocol (libsignal) for E2E encryption
- **Whiteboard**: Canvas-based with CRDT sync

---

## Part 1: Database Schema

### File: `backend/peer_schema.sql`

```sql
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
```

---

## Part 2: Backend API

### File: `backend/app/schemas/peer.py`

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from uuid import UUID

# ============================================
# Encryption Key Schemas
# ============================================

class EncryptionKeyBundle(BaseModel):
    """User's public encryption keys for E2E messaging"""
    identity_public_key: str
    signed_prekey_public: str
    signed_prekey_signature: str
    signed_prekey_id: int
    one_time_prekey_public: Optional[str] = None  # Consumed after first use
    one_time_prekey_id: Optional[int] = None

class RegisterKeysRequest(BaseModel):
    """Request to register encryption keys"""
    identity_public_key: str
    signed_prekey_public: str
    signed_prekey_signature: str
    signed_prekey_id: int
    one_time_prekeys: List[Dict[str, str]]  # [{"id": 1, "key": "base64..."}]

# ============================================
# Peer Session Schemas
# ============================================

class CreateSessionRequest(BaseModel):
    """Create a new study room"""
    name: Optional[str] = None
    topic: str
    subject: str
    max_participants: int = Field(default=4, ge=2, le=4)
    is_voice_enabled: bool = True
    is_whiteboard_enabled: bool = True

class SessionResponse(BaseModel):
    """Study room details"""
    id: UUID
    name: Optional[str]
    topic: str
    subject: str
    school_id: UUID
    class_level: int
    max_participants: int
    is_voice_enabled: bool
    is_whiteboard_enabled: bool
    status: str
    created_by: UUID
    created_at: datetime
    participant_count: int

class JoinSessionRequest(BaseModel):
    """Join a study room"""
    session_id: UUID

class LeaveSessionRequest(BaseModel):
    """Leave a study room"""
    session_id: UUID

class ParticipantResponse(BaseModel):
    """Session participant info"""
    user_id: UUID
    user_name: str
    role: str
    is_muted: bool
    is_voice_active: bool
    joined_at: datetime

# ============================================
# Messaging Schemas
# ============================================

class SendMessageRequest(BaseModel):
    """Send an encrypted message"""
    session_id: UUID
    encrypted_content: Dict[str, str]  # {recipient_id: ciphertext}
    message_type: str = "text"

class MessageResponse(BaseModel):
    """Encrypted message from server"""
    id: UUID
    session_id: UUID
    sender_id: UUID
    sender_name: str
    encrypted_content: Dict[str, str]
    message_type: str
    created_at: datetime

# ============================================
# Whiteboard Schemas
# ============================================

class WhiteboardOperation(BaseModel):
    """A single whiteboard operation"""
    type: str  # "draw", "text", "erase", "clear"
    data: Dict  # Operation-specific data
    timestamp: int
    user_id: str

class WhiteboardSyncRequest(BaseModel):
    """Sync whiteboard operations"""
    session_id: UUID
    operations: List[WhiteboardOperation]
    version: int

class WhiteboardStateResponse(BaseModel):
    """Current whiteboard state"""
    session_id: UUID
    operations: List[Dict]
    version: int

# ============================================
# Peer Discovery Schemas
# ============================================

class SetAvailabilityRequest(BaseModel):
    """Set user's availability for peer sessions"""
    is_available: bool
    status_message: Optional[str] = None
    strong_topics: List[str] = []
    seeking_help_topics: List[str] = []

class AvailablePeerResponse(BaseModel):
    """An available peer from same school/class"""
    user_id: UUID
    user_name: str
    strong_topics: List[str]
    seeking_help_topics: List[str]
    status_message: Optional[str]
    last_seen_at: datetime

class FindPeersRequest(BaseModel):
    """Find peers by topic"""
    topic: str

# ============================================
# Safety Schemas
# ============================================

class BlockUserRequest(BaseModel):
    """Block a user"""
    user_id: UUID
    reason: Optional[str] = None

class ReportUserRequest(BaseModel):
    """Report a user"""
    user_id: UUID
    session_id: Optional[UUID] = None
    reason: str  # inappropriate_content, harassment, spam, impersonation, other
    description: Optional[str] = None

# ============================================
# WebRTC Signaling Schemas
# ============================================

class WebRTCSignal(BaseModel):
    """WebRTC signaling message"""
    type: str  # "offer", "answer", "ice-candidate"
    target_user_id: UUID
    session_id: UUID
    payload: Dict  # SDP or ICE candidate
```

### File: `backend/app/api/v1/peer.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from uuid import UUID

from app.core.security import get_current_user_flexible, get_db_user_id
from app.db.session import get_db
from app.schemas.peer import (
    CreateSessionRequest, SessionResponse, JoinSessionRequest,
    LeaveSessionRequest, ParticipantResponse, SendMessageRequest,
    MessageResponse, SetAvailabilityRequest, AvailablePeerResponse,
    FindPeersRequest, BlockUserRequest, ReportUserRequest,
    RegisterKeysRequest, EncryptionKeyBundle, WhiteboardSyncRequest,
    WhiteboardStateResponse
)

router = APIRouter(prefix="/peer", tags=["peer"])

# ============================================
# Encryption Key Management
# ============================================

@router.post("/keys/register")
async def register_encryption_keys(
    request: RegisterKeysRequest,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """
    Register user's encryption keys for E2E messaging.
    Must be called before user can send/receive encrypted messages.
    """
    user_id = await get_db_user_id(current_user, db)

    # Upsert identity and signed prekey
    result = db.table("user_encryption_keys").upsert({
        "user_id": str(user_id),
        "identity_public_key": request.identity_public_key,
        "signed_prekey_public": request.signed_prekey_public,
        "signed_prekey_signature": request.signed_prekey_signature,
        "signed_prekey_id": request.signed_prekey_id,
    }, on_conflict="user_id").execute()

    # Store one-time prekeys
    if request.one_time_prekeys:
        prekeys = [
            {
                "user_id": str(user_id),
                "prekey_id": int(pk["id"]),
                "prekey_public": pk["key"],
            }
            for pk in request.one_time_prekeys
        ]
        db.table("user_one_time_prekeys").upsert(
            prekeys, on_conflict="user_id,prekey_id"
        ).execute()

    return {"status": "success", "message": "Keys registered"}

@router.get("/keys/{user_id}", response_model=EncryptionKeyBundle)
async def get_user_keys(
    user_id: UUID,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """
    Get a user's public encryption keys for establishing E2E session.
    Consumes one one-time prekey if available.
    """
    # Get main keys
    result = db.table("user_encryption_keys").select("*").eq(
        "user_id", str(user_id)
    ).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User keys not found")

    keys = result.data

    # Try to get and consume a one-time prekey
    otp_result = db.table("user_one_time_prekeys").select("*").eq(
        "user_id", str(user_id)
    ).eq("used", False).limit(1).execute()

    one_time_key = None
    one_time_id = None
    if otp_result.data:
        otp = otp_result.data[0]
        one_time_key = otp["prekey_public"]
        one_time_id = otp["prekey_id"]
        # Mark as used
        db.table("user_one_time_prekeys").update(
            {"used": True}
        ).eq("id", otp["id"]).execute()

    return EncryptionKeyBundle(
        identity_public_key=keys["identity_public_key"],
        signed_prekey_public=keys["signed_prekey_public"],
        signed_prekey_signature=keys["signed_prekey_signature"],
        signed_prekey_id=keys["signed_prekey_id"],
        one_time_prekey_public=one_time_key,
        one_time_prekey_id=one_time_id,
    )

# ============================================
# Session Management
# ============================================

@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    request: CreateSessionRequest,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """
    Create a new study room. Room is restricted to users from same school and class.
    """
    user_id = await get_db_user_id(current_user, db)

    # Get user's school and class
    user_result = db.table("users").select(
        "school_id, class_level"
    ).eq("id", str(user_id)).single().execute()

    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = user_result.data
    if not user["school_id"]:
        raise HTTPException(
            status_code=400,
            detail="You must select a school before creating a study room"
        )

    # Create session
    session_data = {
        "name": request.name,
        "topic": request.topic,
        "subject": request.subject,
        "school_id": user["school_id"],
        "class_level": user["class_level"],
        "max_participants": request.max_participants,
        "is_voice_enabled": request.is_voice_enabled,
        "is_whiteboard_enabled": request.is_whiteboard_enabled,
        "created_by": str(user_id),
        "status": "waiting",
    }

    result = db.table("peer_sessions").insert(session_data).execute()
    session = result.data[0]

    # Add creator as host participant
    db.table("peer_session_participants").insert({
        "session_id": session["id"],
        "user_id": str(user_id),
        "role": "host",
    }).execute()

    # Initialize whiteboard if enabled
    if request.is_whiteboard_enabled:
        db.table("peer_whiteboard_state").insert({
            "session_id": session["id"],
            "crdt_state": {"operations": [], "version": 0},
        }).execute()

    return SessionResponse(
        **session,
        participant_count=1
    )

@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    topic: str = None,
    subject: str = None,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """
    List available study rooms from user's school and class.
    Only shows rooms with status 'waiting' or 'active'.
    """
    user_id = await get_db_user_id(current_user, db)

    # Get user's school and class
    user_result = db.table("users").select(
        "school_id, class_level"
    ).eq("id", str(user_id)).single().execute()

    user = user_result.data
    if not user["school_id"]:
        return []

    # Query sessions from same school and class
    query = db.table("peer_sessions").select(
        "*, peer_session_participants(count)"
    ).eq("school_id", user["school_id"]).eq(
        "class_level", user["class_level"]
    ).in_("status", ["waiting", "active"])

    if topic:
        query = query.ilike("topic", f"%{topic}%")
    if subject:
        query = query.eq("subject", subject)

    result = query.order("created_at", desc=True).limit(20).execute()

    sessions = []
    for s in result.data:
        participant_count = s.get("peer_session_participants", [{}])[0].get("count", 0)
        sessions.append(SessionResponse(
            id=s["id"],
            name=s["name"],
            topic=s["topic"],
            subject=s["subject"],
            school_id=s["school_id"],
            class_level=s["class_level"],
            max_participants=s["max_participants"],
            is_voice_enabled=s["is_voice_enabled"],
            is_whiteboard_enabled=s["is_whiteboard_enabled"],
            status=s["status"],
            created_by=s["created_by"],
            created_at=s["created_at"],
            participant_count=participant_count,
        ))

    return sessions

@router.post("/sessions/{session_id}/join")
async def join_session(
    session_id: UUID,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """Join a study room."""
    user_id = await get_db_user_id(current_user, db)

    # Verify session exists and user is from same school/class
    session = db.table("peer_sessions").select("*").eq(
        "id", str(session_id)
    ).single().execute().data

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user = db.table("users").select(
        "school_id, class_level"
    ).eq("id", str(user_id)).single().execute().data

    if user["school_id"] != session["school_id"] or \
       user["class_level"] != session["class_level"]:
        raise HTTPException(
            status_code=403,
            detail="You can only join rooms from your school and class"
        )

    # Check if room is full
    participants = db.table("peer_session_participants").select(
        "id"
    ).eq("session_id", str(session_id)).is_("left_at", "null").execute()

    if len(participants.data) >= session["max_participants"]:
        raise HTTPException(status_code=400, detail="Room is full")

    # Check if user is blocked by any participant
    participant_ids = [p["user_id"] for p in participants.data]
    blocks = db.table("user_blocks").select("*").or_(
        f"blocker_id.eq.{user_id},blocked_id.in.({','.join(participant_ids)})",
        f"blocked_id.eq.{user_id},blocker_id.in.({','.join(participant_ids)})"
    ).execute()

    if blocks.data:
        raise HTTPException(
            status_code=403,
            detail="Cannot join this room due to user blocks"
        )

    # Add participant
    db.table("peer_session_participants").insert({
        "session_id": str(session_id),
        "user_id": str(user_id),
        "role": "participant",
    }).execute()

    # Update session status to active if it was waiting
    if session["status"] == "waiting":
        db.table("peer_sessions").update({
            "status": "active",
            "started_at": "now()",
        }).eq("id", str(session_id)).execute()

    return {"status": "joined", "session_id": str(session_id)}

@router.post("/sessions/{session_id}/leave")
async def leave_session(
    session_id: UUID,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """Leave a study room."""
    user_id = await get_db_user_id(current_user, db)

    # Update participant record
    db.table("peer_session_participants").update({
        "left_at": "now()"
    }).eq("session_id", str(session_id)).eq(
        "user_id", str(user_id)
    ).execute()

    # Check if room is now empty
    active = db.table("peer_session_participants").select(
        "id"
    ).eq("session_id", str(session_id)).is_(
        "left_at", "null"
    ).execute()

    if not active.data:
        # Close the session
        db.table("peer_sessions").update({
            "status": "closed",
            "closed_at": "now()",
        }).eq("id", str(session_id)).execute()

    return {"status": "left", "session_id": str(session_id)}

@router.get("/sessions/{session_id}/participants", response_model=List[ParticipantResponse])
async def get_participants(
    session_id: UUID,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """Get list of participants in a session."""
    result = db.table("peer_session_participants").select(
        "*, users(full_name)"
    ).eq("session_id", str(session_id)).is_(
        "left_at", "null"
    ).execute()

    return [
        ParticipantResponse(
            user_id=p["user_id"],
            user_name=p["users"]["full_name"] or "Anonymous",
            role=p["role"],
            is_muted=p["is_muted"],
            is_voice_active=p["is_voice_active"],
            joined_at=p["joined_at"],
        )
        for p in result.data
    ]

# ============================================
# Messaging
# ============================================

@router.post("/messages")
async def send_message(
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """
    Send an E2E encrypted message to a session.
    Message content is encrypted client-side for each recipient.
    """
    user_id = await get_db_user_id(current_user, db)

    # Verify user is in session
    participant = db.table("peer_session_participants").select(
        "id"
    ).eq("session_id", str(request.session_id)).eq(
        "user_id", str(user_id)
    ).is_("left_at", "null").execute()

    if not participant.data:
        raise HTTPException(status_code=403, detail="Not in session")

    # Store message
    result = db.table("peer_messages").insert({
        "session_id": str(request.session_id),
        "sender_id": str(user_id),
        "encrypted_content": request.encrypted_content,
        "message_type": request.message_type,
    }).execute()

    return {"status": "sent", "message_id": result.data[0]["id"]}

@router.get("/messages/{session_id}", response_model=List[MessageResponse])
async def get_messages(
    session_id: UUID,
    since: str = None,  # ISO timestamp
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """Get encrypted messages from a session."""
    user_id = await get_db_user_id(current_user, db)

    query = db.table("peer_messages").select(
        "*, users!sender_id(full_name)"
    ).eq("session_id", str(session_id))

    if since:
        query = query.gt("created_at", since)

    result = query.order("created_at").limit(100).execute()

    return [
        MessageResponse(
            id=m["id"],
            session_id=m["session_id"],
            sender_id=m["sender_id"],
            sender_name=m["users"]["full_name"] or "Anonymous",
            encrypted_content=m["encrypted_content"],
            message_type=m["message_type"],
            created_at=m["created_at"],
        )
        for m in result.data
    ]

# ============================================
# Whiteboard
# ============================================

@router.post("/whiteboard/sync")
async def sync_whiteboard(
    request: WhiteboardSyncRequest,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """Sync whiteboard operations using CRDT."""
    user_id = await get_db_user_id(current_user, db)

    # Get current state
    state = db.table("peer_whiteboard_state").select("*").eq(
        "session_id", str(request.session_id)
    ).single().execute().data

    if not state:
        raise HTTPException(status_code=404, detail="Whiteboard not found")

    current_ops = state["crdt_state"].get("operations", [])
    current_version = state["crdt_state"].get("version", 0)

    # Merge operations (CRDT - order by timestamp)
    new_ops = [op.dict() for op in request.operations]
    merged_ops = sorted(
        current_ops + new_ops,
        key=lambda x: x["timestamp"]
    )

    # Update state
    new_state = {
        "operations": merged_ops,
        "version": current_version + 1
    }

    db.table("peer_whiteboard_state").update({
        "crdt_state": new_state,
        "updated_at": "now()",
        "updated_by": str(user_id),
    }).eq("session_id", str(request.session_id)).execute()

    return {"status": "synced", "version": new_state["version"]}

@router.get("/whiteboard/{session_id}", response_model=WhiteboardStateResponse)
async def get_whiteboard(
    session_id: UUID,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """Get current whiteboard state."""
    state = db.table("peer_whiteboard_state").select("*").eq(
        "session_id", str(session_id)
    ).single().execute().data

    if not state:
        raise HTTPException(status_code=404, detail="Whiteboard not found")

    return WhiteboardStateResponse(
        session_id=session_id,
        operations=state["crdt_state"].get("operations", []),
        version=state["crdt_state"].get("version", 0),
    )

# ============================================
# Peer Discovery
# ============================================

@router.post("/availability")
async def set_availability(
    request: SetAvailabilityRequest,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """Set user's availability for peer sessions."""
    user_id = await get_db_user_id(current_user, db)

    # Get user's school and class
    user = db.table("users").select(
        "school_id, class_level"
    ).eq("id", str(user_id)).single().execute().data

    if not user["school_id"]:
        raise HTTPException(
            status_code=400,
            detail="You must select a school first"
        )

    db.table("peer_availability").upsert({
        "user_id": str(user_id),
        "is_available": request.is_available,
        "status_message": request.status_message,
        "strong_topics": request.strong_topics,
        "seeking_help_topics": request.seeking_help_topics,
        "school_id": user["school_id"],
        "class_level": user["class_level"],
        "last_seen_at": "now()",
    }, on_conflict="user_id").execute()

    return {"status": "updated"}

@router.get("/available", response_model=List[AvailablePeerResponse])
async def get_available_peers(
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """Get list of available peers from same school and class."""
    user_id = await get_db_user_id(current_user, db)

    result = db.rpc("get_available_peers", {
        "requesting_user_id": str(user_id)
    }).execute()

    return [
        AvailablePeerResponse(
            user_id=p["user_id"],
            user_name=p["user_name"] or "Anonymous",
            strong_topics=p["strong_topics"] or [],
            seeking_help_topics=p.get("seeking_help_topics") or [],
            status_message=p["status_message"],
            last_seen_at=p["last_seen_at"],
        )
        for p in result.data
    ]

@router.post("/find-by-topic", response_model=List[AvailablePeerResponse])
async def find_peers_by_topic(
    request: FindPeersRequest,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """Find peers who are strong in a specific topic."""
    user_id = await get_db_user_id(current_user, db)

    result = db.rpc("find_peers_by_topic", {
        "requesting_user_id": str(user_id),
        "topic_needed": request.topic,
    }).execute()

    return [
        AvailablePeerResponse(
            user_id=p["user_id"],
            user_name=p["user_name"] or "Anonymous",
            strong_topics=p["strong_topics"] or [],
            seeking_help_topics=[],
            status_message=None,
            last_seen_at=None,
        )
        for p in result.data
    ]

# ============================================
# Safety: Block & Report
# ============================================

@router.post("/block")
async def block_user(
    request: BlockUserRequest,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """Block a user."""
    user_id = await get_db_user_id(current_user, db)

    if str(user_id) == str(request.user_id):
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    db.table("user_blocks").upsert({
        "blocker_id": str(user_id),
        "blocked_id": str(request.user_id),
        "reason": request.reason,
    }, on_conflict="blocker_id,blocked_id").execute()

    return {"status": "blocked"}

@router.delete("/block/{user_id}")
async def unblock_user(
    user_id: UUID,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """Unblock a user."""
    my_user_id = await get_db_user_id(current_user, db)

    db.table("user_blocks").delete().eq(
        "blocker_id", str(my_user_id)
    ).eq("blocked_id", str(user_id)).execute()

    return {"status": "unblocked"}

@router.get("/blocked", response_model=List[UUID])
async def get_blocked_users(
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """Get list of blocked users."""
    user_id = await get_db_user_id(current_user, db)

    result = db.table("user_blocks").select(
        "blocked_id"
    ).eq("blocker_id", str(user_id)).execute()

    return [UUID(b["blocked_id"]) for b in result.data]

@router.post("/report")
async def report_user(
    request: ReportUserRequest,
    current_user: dict = Depends(get_current_user_flexible),
    db = Depends(get_db)
):
    """Report a user for inappropriate behavior."""
    user_id = await get_db_user_id(current_user, db)

    if str(user_id) == str(request.user_id):
        raise HTTPException(status_code=400, detail="Cannot report yourself")

    db.table("user_reports").insert({
        "reporter_id": str(user_id),
        "reported_id": str(request.user_id),
        "session_id": str(request.session_id) if request.session_id else None,
        "reason": request.reason,
        "description": request.description,
    }).execute()

    return {"status": "reported"}
```

### Add router to main app

Update `backend/app/api/v1/router.py`:

```python
from app.api.v1 import auth, onboarding, questions, practice, dashboard, schools, peer

api_router = APIRouter()

# ... existing routes ...
api_router.include_router(peer.router)
```

---

## Part 3: Android Implementation

### 3.1 Dependencies

Add to `app/build.gradle.kts`:

```kotlin
dependencies {
    // Existing dependencies...

    // Signal Protocol for E2E encryption
    implementation("org.signal:libsignal-client:0.40.0")

    // WebRTC for voice
    implementation("io.getstream:stream-webrtc-android:1.1.1")

    // Supabase Realtime for presence
    implementation("io.github.jan-tennert.supabase:realtime-kt:2.0.4")
    implementation("io.ktor:ktor-client-okhttp:2.3.7")
}
```

### 3.2 Domain Models

**File: `app/.../domain/model/Peer.kt`**

```kotlin
package com.prepverse.prepverse.domain.model

import java.time.Instant
import java.util.UUID

data class PeerSession(
    val id: String,
    val name: String?,
    val topic: String,
    val subject: String,
    val schoolId: String,
    val classLevel: Int,
    val maxParticipants: Int,
    val isVoiceEnabled: Boolean,
    val isWhiteboardEnabled: Boolean,
    val status: SessionStatus,
    val createdBy: String,
    val createdAt: Instant,
    val participantCount: Int
)

enum class SessionStatus {
    WAITING, ACTIVE, CLOSED
}

data class Participant(
    val userId: String,
    val userName: String,
    val role: ParticipantRole,
    val isMuted: Boolean,
    val isVoiceActive: Boolean,
    val joinedAt: Instant
)

enum class ParticipantRole {
    HOST, PARTICIPANT
}

data class AvailablePeer(
    val userId: String,
    val userName: String,
    val strongTopics: List<String>,
    val seekingHelpTopics: List<String>,
    val statusMessage: String?,
    val lastSeenAt: Instant?
)

data class ChatMessage(
    val id: String,
    val sessionId: String,
    val senderId: String,
    val senderName: String,
    val content: String,  // Decrypted content
    val messageType: MessageType,
    val createdAt: Instant,
    val isFromMe: Boolean = false
)

enum class MessageType {
    TEXT, SYSTEM, WHITEBOARD_SYNC
}

// Whiteboard operations
sealed class WhiteboardOperation {
    abstract val id: String
    abstract val userId: String
    abstract val timestamp: Long

    data class Draw(
        override val id: String,
        override val userId: String,
        override val timestamp: Long,
        val points: List<Point>,
        val color: Int,
        val strokeWidth: Float
    ) : WhiteboardOperation()

    data class Text(
        override val id: String,
        override val userId: String,
        override val timestamp: Long,
        val text: String,
        val position: Point,
        val fontSize: Float,
        val color: Int
    ) : WhiteboardOperation()

    data class Erase(
        override val id: String,
        override val userId: String,
        override val timestamp: Long,
        val targetIds: List<String>
    ) : WhiteboardOperation()

    data class Clear(
        override val id: String,
        override val userId: String,
        override val timestamp: Long
    ) : WhiteboardOperation()
}

data class Point(val x: Float, val y: Float)
```

### 3.3 DTOs

**File: `app/.../data/remote/api/dto/PeerDtos.kt`**

```kotlin
package com.prepverse.prepverse.data.remote.api.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ============================================
// Encryption Keys
// ============================================

@JsonClass(generateAdapter = true)
data class RegisterKeysRequest(
    @Json(name = "identity_public_key") val identityPublicKey: String,
    @Json(name = "signed_prekey_public") val signedPrekeyPublic: String,
    @Json(name = "signed_prekey_signature") val signedPrekeySignature: String,
    @Json(name = "signed_prekey_id") val signedPrekeyId: Int,
    @Json(name = "one_time_prekeys") val oneTimePrekeys: List<OneTimePrekey>
)

@JsonClass(generateAdapter = true)
data class OneTimePrekey(
    val id: Int,
    val key: String
)

@JsonClass(generateAdapter = true)
data class KeyBundleResponse(
    @Json(name = "identity_public_key") val identityPublicKey: String,
    @Json(name = "signed_prekey_public") val signedPrekeyPublic: String,
    @Json(name = "signed_prekey_signature") val signedPrekeySignature: String,
    @Json(name = "signed_prekey_id") val signedPrekeyId: Int,
    @Json(name = "one_time_prekey_public") val oneTimePrekeyPublic: String?,
    @Json(name = "one_time_prekey_id") val oneTimePrekeyId: Int?
)

// ============================================
// Sessions
// ============================================

@JsonClass(generateAdapter = true)
data class CreateSessionRequest(
    val name: String?,
    val topic: String,
    val subject: String,
    @Json(name = "max_participants") val maxParticipants: Int = 4,
    @Json(name = "is_voice_enabled") val isVoiceEnabled: Boolean = true,
    @Json(name = "is_whiteboard_enabled") val isWhiteboardEnabled: Boolean = true
)

@JsonClass(generateAdapter = true)
data class SessionResponse(
    val id: String,
    val name: String?,
    val topic: String,
    val subject: String,
    @Json(name = "school_id") val schoolId: String,
    @Json(name = "class_level") val classLevel: Int,
    @Json(name = "max_participants") val maxParticipants: Int,
    @Json(name = "is_voice_enabled") val isVoiceEnabled: Boolean,
    @Json(name = "is_whiteboard_enabled") val isWhiteboardEnabled: Boolean,
    val status: String,
    @Json(name = "created_by") val createdBy: String,
    @Json(name = "created_at") val createdAt: String,
    @Json(name = "participant_count") val participantCount: Int
)

@JsonClass(generateAdapter = true)
data class ParticipantResponse(
    @Json(name = "user_id") val userId: String,
    @Json(name = "user_name") val userName: String,
    val role: String,
    @Json(name = "is_muted") val isMuted: Boolean,
    @Json(name = "is_voice_active") val isVoiceActive: Boolean,
    @Json(name = "joined_at") val joinedAt: String
)

// ============================================
// Messaging
// ============================================

@JsonClass(generateAdapter = true)
data class SendMessageRequest(
    @Json(name = "session_id") val sessionId: String,
    @Json(name = "encrypted_content") val encryptedContent: Map<String, String>,
    @Json(name = "message_type") val messageType: String = "text"
)

@JsonClass(generateAdapter = true)
data class MessageResponse(
    val id: String,
    @Json(name = "session_id") val sessionId: String,
    @Json(name = "sender_id") val senderId: String,
    @Json(name = "sender_name") val senderName: String,
    @Json(name = "encrypted_content") val encryptedContent: Map<String, String>,
    @Json(name = "message_type") val messageType: String,
    @Json(name = "created_at") val createdAt: String
)

// ============================================
// Availability
// ============================================

@JsonClass(generateAdapter = true)
data class SetAvailabilityRequest(
    @Json(name = "is_available") val isAvailable: Boolean,
    @Json(name = "status_message") val statusMessage: String?,
    @Json(name = "strong_topics") val strongTopics: List<String>,
    @Json(name = "seeking_help_topics") val seekingHelpTopics: List<String>
)

@JsonClass(generateAdapter = true)
data class AvailablePeerResponse(
    @Json(name = "user_id") val userId: String,
    @Json(name = "user_name") val userName: String,
    @Json(name = "strong_topics") val strongTopics: List<String>,
    @Json(name = "seeking_help_topics") val seekingHelpTopics: List<String>,
    @Json(name = "status_message") val statusMessage: String?,
    @Json(name = "last_seen_at") val lastSeenAt: String?
)

@JsonClass(generateAdapter = true)
data class FindByTopicRequest(
    val topic: String
)

// ============================================
// Block & Report
// ============================================

@JsonClass(generateAdapter = true)
data class BlockUserRequest(
    @Json(name = "user_id") val userId: String,
    val reason: String?
)

@JsonClass(generateAdapter = true)
data class ReportUserRequest(
    @Json(name = "user_id") val userId: String,
    @Json(name = "session_id") val sessionId: String?,
    val reason: String,
    val description: String?
)

// ============================================
// Whiteboard
// ============================================

@JsonClass(generateAdapter = true)
data class WhiteboardOperationDto(
    val type: String,
    val data: Map<String, Any>,
    val timestamp: Long,
    @Json(name = "user_id") val userId: String
)

@JsonClass(generateAdapter = true)
data class WhiteboardSyncRequest(
    @Json(name = "session_id") val sessionId: String,
    val operations: List<WhiteboardOperationDto>,
    val version: Int
)

@JsonClass(generateAdapter = true)
data class WhiteboardStateResponse(
    @Json(name = "session_id") val sessionId: String,
    val operations: List<Map<String, Any>>,
    val version: Int
)
```

### 3.4 API Interface

Add to `PrepVerseApi.kt`:

```kotlin
// ================================
// Peer Endpoints
// ================================

// Encryption keys
@POST("api/v1/peer/keys/register")
suspend fun registerEncryptionKeys(
    @Body request: RegisterKeysRequest
): Response<Unit>

@GET("api/v1/peer/keys/{userId}")
suspend fun getUserKeys(
    @Path("userId") userId: String
): Response<KeyBundleResponse>

// Sessions
@POST("api/v1/peer/sessions")
suspend fun createPeerSession(
    @Body request: CreateSessionRequest
): Response<SessionResponse>

@GET("api/v1/peer/sessions")
suspend fun listPeerSessions(
    @Query("topic") topic: String? = null,
    @Query("subject") subject: String? = null
): Response<List<SessionResponse>>

@POST("api/v1/peer/sessions/{sessionId}/join")
suspend fun joinPeerSession(
    @Path("sessionId") sessionId: String
): Response<Unit>

@POST("api/v1/peer/sessions/{sessionId}/leave")
suspend fun leavePeerSession(
    @Path("sessionId") sessionId: String
): Response<Unit>

@GET("api/v1/peer/sessions/{sessionId}/participants")
suspend fun getSessionParticipants(
    @Path("sessionId") sessionId: String
): Response<List<ParticipantResponse>>

// Messaging
@POST("api/v1/peer/messages")
suspend fun sendPeerMessage(
    @Body request: SendMessageRequest
): Response<Unit>

@GET("api/v1/peer/messages/{sessionId}")
suspend fun getPeerMessages(
    @Path("sessionId") sessionId: String,
    @Query("since") since: String? = null
): Response<List<MessageResponse>>

// Availability
@POST("api/v1/peer/availability")
suspend fun setAvailability(
    @Body request: SetAvailabilityRequest
): Response<Unit>

@GET("api/v1/peer/available")
suspend fun getAvailablePeers(): Response<List<AvailablePeerResponse>>

@POST("api/v1/peer/find-by-topic")
suspend fun findPeersByTopic(
    @Body request: FindByTopicRequest
): Response<List<AvailablePeerResponse>>

// Block & Report
@POST("api/v1/peer/block")
suspend fun blockUser(
    @Body request: BlockUserRequest
): Response<Unit>

@DELETE("api/v1/peer/block/{userId}")
suspend fun unblockUser(
    @Path("userId") userId: String
): Response<Unit>

@GET("api/v1/peer/blocked")
suspend fun getBlockedUsers(): Response<List<String>>

@POST("api/v1/peer/report")
suspend fun reportUser(
    @Body request: ReportUserRequest
): Response<Unit>

// Whiteboard
@POST("api/v1/peer/whiteboard/sync")
suspend fun syncWhiteboard(
    @Body request: WhiteboardSyncRequest
): Response<Unit>

@GET("api/v1/peer/whiteboard/{sessionId}")
suspend fun getWhiteboardState(
    @Path("sessionId") sessionId: String
): Response<WhiteboardStateResponse>
```

### 3.5 Repository

**File: `app/.../data/repository/PeerRepository.kt`**

```kotlin
package com.prepverse.prepverse.data.repository

import com.prepverse.prepverse.data.remote.api.PrepVerseApi
import com.prepverse.prepverse.data.remote.api.dto.*
import com.prepverse.prepverse.domain.model.*
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PeerRepository @Inject constructor(
    private val api: PrepVerseApi
) {
    // ============================================
    // Encryption Keys
    // ============================================

    suspend fun registerKeys(request: RegisterKeysRequest): Result<Unit> {
        return try {
            val response = api.registerEncryptionKeys(request)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to register keys: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getUserKeys(userId: String): Result<KeyBundleResponse> {
        return try {
            val response = api.getUserKeys(userId)
            if (response.isSuccessful) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to get keys: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ============================================
    // Sessions
    // ============================================

    suspend fun createSession(
        name: String?,
        topic: String,
        subject: String,
        maxParticipants: Int = 4,
        voiceEnabled: Boolean = true,
        whiteboardEnabled: Boolean = true
    ): Result<PeerSession> {
        return try {
            val response = api.createPeerSession(
                CreateSessionRequest(
                    name = name,
                    topic = topic,
                    subject = subject,
                    maxParticipants = maxParticipants,
                    isVoiceEnabled = voiceEnabled,
                    isWhiteboardEnabled = whiteboardEnabled
                )
            )
            if (response.isSuccessful) {
                Result.success(response.body()!!.toDomain())
            } else {
                Result.failure(Exception("Failed to create session: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun listSessions(
        topic: String? = null,
        subject: String? = null
    ): Result<List<PeerSession>> {
        return try {
            val response = api.listPeerSessions(topic, subject)
            if (response.isSuccessful) {
                Result.success(response.body()!!.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to list sessions: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun joinSession(sessionId: String): Result<Unit> {
        return try {
            val response = api.joinPeerSession(sessionId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to join session: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun leaveSession(sessionId: String): Result<Unit> {
        return try {
            val response = api.leavePeerSession(sessionId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to leave session: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getParticipants(sessionId: String): Result<List<Participant>> {
        return try {
            val response = api.getSessionParticipants(sessionId)
            if (response.isSuccessful) {
                Result.success(response.body()!!.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to get participants: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ============================================
    // Availability
    // ============================================

    suspend fun setAvailability(
        available: Boolean,
        statusMessage: String? = null,
        strongTopics: List<String> = emptyList(),
        seekingHelpTopics: List<String> = emptyList()
    ): Result<Unit> {
        return try {
            val response = api.setAvailability(
                SetAvailabilityRequest(
                    isAvailable = available,
                    statusMessage = statusMessage,
                    strongTopics = strongTopics,
                    seekingHelpTopics = seekingHelpTopics
                )
            )
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to set availability: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAvailablePeers(): Result<List<AvailablePeer>> {
        return try {
            val response = api.getAvailablePeers()
            if (response.isSuccessful) {
                Result.success(response.body()!!.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to get peers: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun findPeersByTopic(topic: String): Result<List<AvailablePeer>> {
        return try {
            val response = api.findPeersByTopic(FindByTopicRequest(topic))
            if (response.isSuccessful) {
                Result.success(response.body()!!.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to find peers: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ============================================
    // Block & Report
    // ============================================

    suspend fun blockUser(userId: String, reason: String? = null): Result<Unit> {
        return try {
            val response = api.blockUser(BlockUserRequest(userId, reason))
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Failed to block: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun unblockUser(userId: String): Result<Unit> {
        return try {
            val response = api.unblockUser(userId)
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Failed to unblock: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun reportUser(
        userId: String,
        sessionId: String?,
        reason: String,
        description: String?
    ): Result<Unit> {
        return try {
            val response = api.reportUser(
                ReportUserRequest(userId, sessionId, reason, description)
            )
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Failed to report: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ============================================
    // Mappers
    // ============================================

    private fun SessionResponse.toDomain() = PeerSession(
        id = id,
        name = name,
        topic = topic,
        subject = subject,
        schoolId = schoolId,
        classLevel = classLevel,
        maxParticipants = maxParticipants,
        isVoiceEnabled = isVoiceEnabled,
        isWhiteboardEnabled = isWhiteboardEnabled,
        status = SessionStatus.valueOf(status.uppercase()),
        createdBy = createdBy,
        createdAt = Instant.parse(createdAt),
        participantCount = participantCount
    )

    private fun ParticipantResponse.toDomain() = Participant(
        userId = userId,
        userName = userName,
        role = ParticipantRole.valueOf(role.uppercase()),
        isMuted = isMuted,
        isVoiceActive = isVoiceActive,
        joinedAt = Instant.parse(joinedAt)
    )

    private fun AvailablePeerResponse.toDomain() = AvailablePeer(
        userId = userId,
        userName = userName,
        strongTopics = strongTopics,
        seekingHelpTopics = seekingHelpTopics,
        statusMessage = statusMessage,
        lastSeenAt = lastSeenAt?.let { Instant.parse(it) }
    )
}
```

### 3.6 Encryption Manager

**File: `app/.../data/local/EncryptionManager.kt`**

```kotlin
package com.prepverse.prepverse.data.local

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import org.signal.libsignal.protocol.*
import org.signal.libsignal.protocol.state.*
import org.signal.libsignal.protocol.util.KeyHelper
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages E2E encryption using Signal Protocol.
 *
 * Key concepts:
 * - Identity Key: Long-term key pair for user identity
 * - Signed Prekey: Medium-term key, signed by identity key
 * - One-time Prekeys: Single-use keys for forward secrecy
 * - Session: Encrypted channel between two users
 */
@Singleton
class EncryptionManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val signalProtocolStore: SignalProtocolStore by lazy {
        // Use a persistent implementation in production
        InMemorySignalProtocolStore(
            KeyHelper.generateIdentityKeyPair(),
            KeyHelper.generateRegistrationId(false)
        )
    }

    /**
     * Generate encryption keys for registration.
     * Call this on first app launch and send keys to server.
     */
    fun generateKeys(): KeyBundle {
        val identityKeyPair = KeyHelper.generateIdentityKeyPair()
        val registrationId = KeyHelper.generateRegistrationId(false)

        val signedPreKey = KeyHelper.generateSignedPreKey(identityKeyPair, 1)
        val oneTimePreKeys = KeyHelper.generatePreKeys(1, 100)

        return KeyBundle(
            identityKeyPair = identityKeyPair,
            registrationId = registrationId,
            signedPreKey = signedPreKey,
            oneTimePreKeys = oneTimePreKeys
        )
    }

    /**
     * Encrypt a message for a recipient.
     */
    fun encrypt(message: String, recipientAddress: SignalProtocolAddress): ByteArray {
        val sessionCipher = SessionCipher(signalProtocolStore, recipientAddress)
        return sessionCipher.encrypt(message.toByteArray()).serialize()
    }

    /**
     * Decrypt a message from a sender.
     */
    fun decrypt(ciphertext: ByteArray, senderAddress: SignalProtocolAddress): String {
        val sessionCipher = SessionCipher(signalProtocolStore, senderAddress)
        val preKeyMessage = PreKeySignalMessage(ciphertext)
        return String(sessionCipher.decrypt(preKeyMessage))
    }

    /**
     * Build a session with a recipient using their key bundle.
     */
    fun buildSession(
        recipientAddress: SignalProtocolAddress,
        recipientKeyBundle: PreKeyBundle
    ) {
        val sessionBuilder = SessionBuilder(signalProtocolStore, recipientAddress)
        sessionBuilder.process(recipientKeyBundle)
    }

    data class KeyBundle(
        val identityKeyPair: IdentityKeyPair,
        val registrationId: Int,
        val signedPreKey: SignedPreKeyRecord,
        val oneTimePreKeys: List<PreKeyRecord>
    )
}
```

### 3.7 Navigation Routes

Add to `Routes.kt`:

```kotlin
object Routes {
    // Existing routes...

    // Peer routes
    const val PEER_LOBBY = "peer_lobby"
    const val STUDY_ROOM = "study_room/{sessionId}"
    const val PEER_DISCOVERY = "peer_discovery"

    fun studyRoom(sessionId: String) = "study_room/$sessionId"
}
```

### 3.8 Screens (Overview)

The Android implementation requires these screens:

1. **PeerLobbyScreen** (`ui/screens/peer/PeerLobbyScreen.kt`)
   - Lists available study rooms from same school/class
   - Create room button
   - Filter by topic/subject
   - Join room functionality

2. **PeerDiscoveryScreen** (`ui/screens/peer/PeerDiscoveryScreen.kt`)
   - Browse available peers
   - Topic-based matching
   - View peer strengths
   - Invite to session

3. **StudyRoomScreen** (`ui/screens/peer/StudyRoomScreen.kt`)
   - Chat interface (encrypted messages)
   - Participant list
   - Voice call controls
   - Whiteboard toggle
   - Leave room button

4. **WhiteboardScreen** (`ui/screens/peer/WhiteboardScreen.kt`)
   - Canvas for drawing
   - Text tool
   - Color picker
   - Eraser
   - Real-time sync

5. **Supporting ViewModels**:
   - `PeerLobbyViewModel.kt`
   - `StudyRoomViewModel.kt`
   - `WhiteboardViewModel.kt`

### 3.9 WebRTC Voice Integration

**File: `app/.../data/webrtc/VoiceCallManager.kt`**

```kotlin
package com.prepverse.prepverse.data.webrtc

import org.webrtc.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages WebRTC voice calls in study rooms.
 * Uses Supabase Realtime for signaling.
 */
@Singleton
class VoiceCallManager @Inject constructor() {

    private var peerConnection: PeerConnection? = null
    private var localAudioTrack: AudioTrack? = null

    private val iceServers = listOf(
        PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer()
    )

    fun initializePeerConnection(
        context: android.content.Context,
        onIceCandidate: (IceCandidate) -> Unit,
        onRemoteStream: (MediaStream) -> Unit
    ) {
        val options = PeerConnectionFactory.InitializationOptions.builder(context)
            .createInitializationOptions()
        PeerConnectionFactory.initialize(options)

        val factory = PeerConnectionFactory.builder().createPeerConnectionFactory()

        val rtcConfig = PeerConnection.RTCConfiguration(iceServers)

        peerConnection = factory.createPeerConnection(rtcConfig, object : PeerConnection.Observer {
            override fun onIceCandidate(candidate: IceCandidate) {
                onIceCandidate(candidate)
            }

            override fun onAddStream(stream: MediaStream) {
                onRemoteStream(stream)
            }

            // Other required overrides...
            override fun onSignalingChange(state: PeerConnection.SignalingState) {}
            override fun onIceConnectionChange(state: PeerConnection.IceConnectionState) {}
            override fun onIceConnectionReceivingChange(receiving: Boolean) {}
            override fun onIceGatheringChange(state: PeerConnection.IceGatheringState) {}
            override fun onRemoveStream(stream: MediaStream) {}
            override fun onDataChannel(channel: DataChannel) {}
            override fun onRenegotiationNeeded() {}
        })

        // Create local audio track
        val audioSource = factory.createAudioSource(MediaConstraints())
        localAudioTrack = factory.createAudioTrack("audio", audioSource)

        val stream = factory.createLocalMediaStream("localStream")
        stream.addTrack(localAudioTrack)
        peerConnection?.addStream(stream)
    }

    suspend fun createOffer(): SessionDescription? {
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
        }

        return suspendCancellableCoroutine { continuation ->
            peerConnection?.createOffer(object : SdpObserver {
                override fun onCreateSuccess(sdp: SessionDescription) {
                    peerConnection?.setLocalDescription(SimpleSdpObserver(), sdp)
                    continuation.resume(sdp) {}
                }
                override fun onCreateFailure(error: String) {
                    continuation.resume(null) {}
                }
                override fun onSetSuccess() {}
                override fun onSetFailure(error: String) {}
            }, constraints)
        }
    }

    suspend fun handleOffer(offer: SessionDescription): SessionDescription? {
        peerConnection?.setRemoteDescription(SimpleSdpObserver(), offer)

        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
        }

        return suspendCancellableCoroutine { continuation ->
            peerConnection?.createAnswer(object : SdpObserver {
                override fun onCreateSuccess(sdp: SessionDescription) {
                    peerConnection?.setLocalDescription(SimpleSdpObserver(), sdp)
                    continuation.resume(sdp) {}
                }
                override fun onCreateFailure(error: String) {
                    continuation.resume(null) {}
                }
                override fun onSetSuccess() {}
                override fun onSetFailure(error: String) {}
            }, constraints)
        }
    }

    fun handleAnswer(answer: SessionDescription) {
        peerConnection?.setRemoteDescription(SimpleSdpObserver(), answer)
    }

    fun addIceCandidate(candidate: IceCandidate) {
        peerConnection?.addIceCandidate(candidate)
    }

    fun setMuted(muted: Boolean) {
        localAudioTrack?.setEnabled(!muted)
    }

    fun disconnect() {
        localAudioTrack?.setEnabled(false)
        peerConnection?.close()
        peerConnection = null
    }

    private class SimpleSdpObserver : SdpObserver {
        override fun onCreateSuccess(sdp: SessionDescription) {}
        override fun onSetSuccess() {}
        override fun onCreateFailure(error: String) {}
        override fun onSetFailure(error: String) {}
    }
}
```

---

## Part 4: Web Frontend Instructions

### DO NOT IMPLEMENT - Instructions Only

The web frontend should mirror the Android implementation with these key differences:

### 4.1 Dependencies to Add

```json
{
  "dependencies": {
    "@aspect-ui/signal-protocol": "^1.0.0",
    "simple-peer": "^9.11.1",
    "@supabase/supabase-js": "^2.38.0",
    "fabric": "^5.3.0"
  }
}
```

### 4.2 File Structure to Create

```
web/src/
├── api/
│   └── peer.ts                    # API client for peer endpoints
├── lib/
│   ├── encryption.ts              # Signal Protocol wrapper
│   ├── webrtc.ts                  # WebRTC voice call manager
│   └── supabaseRealtime.ts        # Supabase Realtime client
├── store/
│   └── peerStore.ts               # Zustand store for peer state
├── hooks/
│   ├── usePeer.ts                 # Hook for peer sessions
│   ├── usePeerChat.ts             # Hook for encrypted chat
│   ├── usePeerVoice.ts            # Hook for voice calls
│   └── usePeerWhiteboard.ts       # Hook for whiteboard sync
├── components/
│   └── peer/
│       ├── SessionCard.tsx        # Room card component
│       ├── PeerCard.tsx           # Available peer card
│       ├── ChatMessage.tsx        # Chat message bubble
│       ├── ParticipantList.tsx    # Session participants
│       ├── VoiceControls.tsx      # Mute/unmute buttons
│       ├── Whiteboard.tsx         # Fabric.js canvas
│       └── CreateRoomModal.tsx    # Create room form
└── pages/
    ├── PeerLobby.tsx              # Room listing page
    ├── PeerDiscovery.tsx          # Find peers page
    └── StudyRoom.tsx              # Active room page
```

### 4.3 Key Implementation Notes

1. **Encryption (`lib/encryption.ts`)**:
   - Use `@aspect-ui/signal-protocol` or `libsignal-protocol-javascript`
   - Store keys in IndexedDB
   - Encrypt each message for each recipient separately
   - Handle key exchange via API

2. **Supabase Realtime (`lib/supabaseRealtime.ts`)**:
   - Subscribe to `peer_sessions` table changes
   - Use presence for online status
   - Broadcast channel for WebRTC signaling
   - Listen for new messages

3. **WebRTC (`lib/webrtc.ts`)**:
   - Use `simple-peer` for easier WebRTC management
   - Exchange offers/answers via Supabase broadcast
   - Handle ICE candidates
   - Manage audio streams

4. **Whiteboard (`components/peer/Whiteboard.tsx`)**:
   - Use Fabric.js for canvas
   - Serialize operations as CRDT
   - Sync via API + Supabase Realtime
   - Handle drawing, text, and erase

5. **State Management (`store/peerStore.ts`)**:
   ```typescript
   interface PeerState {
     sessions: PeerSession[];
     currentSession: PeerSession | null;
     participants: Participant[];
     messages: ChatMessage[];
     availablePeers: AvailablePeer[];
     isAvailable: boolean;
     isMuted: boolean;
     isVoiceConnected: boolean;
   }
   ```

6. **API Client (`api/peer.ts`)**:
   - Mirror all endpoints from backend
   - Use `withCredentials: true` for cookies
   - Handle encryption before sending messages
   - Handle decryption after receiving messages

### 4.4 Security Considerations

1. **E2E Encryption**:
   - Never log decrypted messages
   - Store encryption keys securely in IndexedDB
   - Rotate signed prekeys periodically
   - Replenish one-time prekeys when low

2. **WebRTC**:
   - Use TURN servers in production (not just STUN)
   - Enable SRTP for encrypted voice
   - Handle connection failures gracefully

3. **Privacy**:
   - Only show users from same school/class
   - Respect block lists
   - Don't expose user emails

---

## Part 5: Testing Checklist

### Backend Tests
- [ ] Create session restricted to user's school/class
- [ ] Join session only if same school/class
- [ ] Block user prevents joining same room
- [ ] Encryption key registration and retrieval
- [ ] Message storage (encrypted)
- [ ] Whiteboard CRDT sync
- [ ] Availability updates
- [ ] Topic-based peer matching

### Android Tests
- [ ] Signal Protocol key generation
- [ ] Message encryption/decryption
- [ ] WebRTC voice call establishment
- [ ] Whiteboard drawing sync
- [ ] Session join/leave flow
- [ ] Block/report functionality

### Web Tests (When Implemented)
- [ ] Same tests as Android
- [ ] PWA offline handling
- [ ] Browser permission requests (microphone)

---

## Summary

This plan provides a complete implementation for the peer mentoring feature:

| Component | Status | Notes |
|-----------|--------|-------|
| Database Schema | Ready to implement | Run SQL in Supabase |
| Backend API | Ready to implement | FastAPI endpoints |
| Android App | Ready to implement | Full Compose UI |
| Web Frontend | Instructions only | Follow the guide |

**Key Security Features**:
- E2E encryption using Signal Protocol
- Same school + same grade restriction
- Block/report system
- RLS policies for data isolation

**Key Features**:
- Study rooms (2-4 users)
- Encrypted text chat
- Voice calls via WebRTC
- Collaborative whiteboard
- Peer discovery + topic matching
