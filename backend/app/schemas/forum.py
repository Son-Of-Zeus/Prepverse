"""
Pydantic schemas for Discussion Forum
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import IntEnum


class VoteType(IntEnum):
    """Vote type enum: UP = 1, DOWN = -1"""
    UP = 1
    DOWN = -1


# ============================================================================
# Base Models
# ============================================================================

class PostBase(BaseModel):
    """Base model for forum posts"""
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    category: str = Field(default="general", max_length=100)
    tags: Optional[List[str]] = Field(default=None)


class CommentBase(BaseModel):
    """Base model for forum comments"""
    content: str = Field(..., min_length=1)
    parent_comment_id: Optional[str] = Field(default=None)


# ============================================================================
# Create Models
# ============================================================================

class PostCreate(PostBase):
    """Request model for creating a forum post"""
    pass


class CommentCreate(CommentBase):
    """Request model for creating a comment"""
    pass


class VoteCreate(BaseModel):
    """Request model for voting"""
    vote_type: VoteType


# ============================================================================
# Response Models
# ============================================================================

class PostResponse(PostBase):
    """Response model for a forum post"""
    id: str
    user_id: str
    author_name: str
    upvotes: int = 0
    view_count: int = 0
    is_pinned: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    comment_count: int = 0


class CommentResponse(BaseModel):
    """Response model for a comment"""
    id: str
    post_id: str
    user_id: str
    content: str
    parent_comment_id: Optional[str] = None
    author_name: str
    upvotes: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None


class PostDetailResponse(PostResponse):
    """Response model for post details including comments"""
    comments: List[CommentResponse] = []
    user_vote_status: Optional[int] = None  # 1, -1, or None if not voted


# ============================================================================
# List Response Models
# ============================================================================

class PostListResponse(BaseModel):
    """Response model for paginated list of posts"""
    posts: List[PostResponse]
    total: int
    page: int
    limit: int
    has_more: bool


class VoteResponse(BaseModel):
    """Response model for vote action"""
    success: bool
    new_upvote_count: int
    user_vote_status: Optional[int] = None  # 1, -1, or None if removed
