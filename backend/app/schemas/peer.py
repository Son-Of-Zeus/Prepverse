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
    last_seen_at: Optional[datetime]

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
