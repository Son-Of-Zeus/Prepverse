from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
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
    db.table("user_encryption_keys").upsert({
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
    if not user.get("school_id"):
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
    session_result = db.table("peer_sessions").select("*").eq(
        "id", str(session_id)
    ).single().execute()
    
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = session_result.data

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
        "id, user_id"
    ).eq("session_id", str(session_id)).is_("left_at", "null").execute()

    if len(participants.data) >= session["max_participants"]:
        raise HTTPException(status_code=400, detail="Room is full")

    # Check if user is blocked by any participant
    participant_ids = [p["user_id"] for p in participants.data]
    if participant_ids:
        # We need a more complex query or multiple queries to check blocks efficiently.
        # For now, let's just make sure the user isn't blocked by any current participant
        # and doesn't block any current participant.
        blocks = db.table("user_blocks").select("*").or_(
            f"blocker_id.eq.{user_id},blocked_id.in.({','.join(participant_ids)}),"
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
            user_name=p["users"].get("full_name") or "Anonymous",
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
    since: Optional[str] = Query(None), # ISO timestamp
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
            sender_name=m["users"].get("full_name") or "Anonymous",
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
    state_result = db.table("peer_whiteboard_state").select("*").eq(
        "session_id", str(request.session_id)
    ).single().execute()
    
    if not state_result.data:
        raise HTTPException(status_code=404, detail="Whiteboard not found")
        
    state = state_result.data

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
    state_result = db.table("peer_whiteboard_state").select("*").eq(
        "session_id", str(session_id)
    ).single().execute()
    
    if not state_result.data:
        raise HTTPException(status_code=404, detail="Whiteboard not found")

    state = state_result.data

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

    if not user.get("school_id"):
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
