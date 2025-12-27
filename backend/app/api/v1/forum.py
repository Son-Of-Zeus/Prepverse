"""
Forum API Endpoints

Provides:
- Post listing and creation
- Post details with comments
- Comment creation
- Voting on posts and comments
- Post deletion
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from app.core.security import get_current_user_flexible, get_db_user_id
from app.db.session import get_db
from app.services.forum_service import get_forum_service
from app.schemas.forum import (
    PostCreate,
    PostResponse,
    PostListResponse,
    PostDetailResponse,
    CommentCreate,
    CommentResponse,
    VoteCreate,
    VoteResponse,
)

router = APIRouter(prefix="/forum", tags=["forum"])


# =============================================================================
# Posts
# =============================================================================


@router.get("/", response_model=PostListResponse)
async def list_posts(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in title/content"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Get paginated list of forum posts.
    
    Supports filtering by category and searching in title/content.
    Returns posts ordered by pinned status first, then by creation date.
    """
    service = get_forum_service(db)
    return await service.get_posts(
        category=category,
        search_query=search,
        page=page,
        limit=limit,
    )


@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Create a new forum post.
    
    Requires authentication. The post will be associated with the current user.
    """
    user_id = await get_db_user_id(current_user, db)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    service = get_forum_service(db)
    try:
        return await service.create_post(user_id, post_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create post: {str(e)}"
        )


@router.get("/{post_id}", response_model=PostDetailResponse)
async def get_post_details(
    post_id: str,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Get post details including all comments.
    
    Also increments the view count and returns the user's vote status on the post.
    """
    user_id = await get_db_user_id(current_user, db)
    
    service = get_forum_service(db)
    post = await service.get_post_details(post_id, user_id)
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Delete a forum post.
    
    Only the post owner can delete their post.
    Deleting a post will also delete all associated comments and votes.
    """
    user_id = await get_db_user_id(current_user, db)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    service = get_forum_service(db)
    deleted = await service.delete_post(post_id, user_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this post or post not found"
        )
    
    return None


# =============================================================================
# Comments
# =============================================================================


@router.post("/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: str,
    comment_data: CommentCreate,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Add a comment to a post.
    
    Supports nested replies by specifying parent_comment_id.
    """
    user_id = await get_db_user_id(current_user, db)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Verify post exists
    post_check = db.table("forum_posts").select("id").eq("id", post_id).execute()
    if not post_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    service = get_forum_service(db)
    try:
        return await service.create_comment(user_id, post_id, comment_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create comment: {str(e)}"
        )


# =============================================================================
# Voting
# =============================================================================


@router.post("/{post_id}/vote", response_model=VoteResponse)
async def vote_on_post(
    post_id: str,
    vote_data: VoteCreate,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Vote on a post.
    
    - If the user hasn't voted: adds the vote
    - If voting the same way again: removes the vote (toggle off)
    - If voting differently: changes the vote
    """
    user_id = await get_db_user_id(current_user, db)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Verify post exists
    post_check = db.table("forum_posts").select("id").eq("id", post_id).execute()
    if not post_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    service = get_forum_service(db)
    return await service.vote_on_post(user_id, post_id, vote_data.vote_type)


@router.post("/comments/{comment_id}/vote", response_model=VoteResponse)
async def vote_on_comment(
    comment_id: str,
    vote_data: VoteCreate,
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    """
    Vote on a comment.
    
    - If the user hasn't voted: adds the vote
    - If voting the same way again: removes the vote (toggle off)
    - If voting differently: changes the vote
    """
    user_id = await get_db_user_id(current_user, db)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Verify comment exists
    comment_check = db.table("forum_comments").select("id").eq("id", comment_id).execute()
    if not comment_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    service = get_forum_service(db)
    return await service.vote_on_comment(user_id, comment_id, vote_data.vote_type)
