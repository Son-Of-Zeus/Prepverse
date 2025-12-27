"""
Forum Service

Handles:
- Forum post creation and retrieval
- Comment management
- Voting system
- Search and filtering
"""
from typing import List, Optional, Dict, Any, Tuple
from supabase import Client

from app.schemas.forum import (
    PostCreate,
    PostResponse,
    CommentCreate,
    CommentResponse,
    PostDetailResponse,
    PostListResponse,
    VoteResponse,
    VoteType,
)


class ForumService:
    """Service for managing forum posts, comments, and votes"""

    def __init__(self, db: Client):
        self.db = db

    # =========================================================================
    # Posts
    # =========================================================================

    async def get_posts(
        self,
        category: Optional[str] = None,
        search_query: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> PostListResponse:
        """
        Get paginated list of forum posts.
        
        Args:
            category: Filter by category (optional)
            search_query: Search in title/content (optional)
            page: Page number (1-based)
            limit: Items per page
            
        Returns:
            PostListResponse with posts and pagination info
        """
        offset = (page - 1) * limit

        # Build the query with user join for author name
        query = self.db.table("forum_posts").select(
            "*, users!inner(full_name)"
        )

        # Apply filters
        if category:
            query = query.eq("category", category)

        if search_query:
            # Search in title and content using ilike
            query = query.or_(
                f"title.ilike.%{search_query}%,content.ilike.%{search_query}%"
            )

        # Order by pinned first, then by created_at
        query = query.order("is_pinned", desc=True).order("created_at", desc=True)

        # Get total count first (separate query)
        count_query = self.db.table("forum_posts").select("id", count="exact")
        if category:
            count_query = count_query.eq("category", category)
        if search_query:
            count_query = count_query.or_(
                f"title.ilike.%{search_query}%,content.ilike.%{search_query}%"
            )
        count_result = count_query.execute()
        total = count_result.count if count_result.count else 0

        # Apply pagination
        query = query.range(offset, offset + limit - 1)
        result = query.execute()

        # Get comment counts for each post
        post_ids = [row["id"] for row in result.data]
        comment_counts = await self._get_comment_counts(post_ids)

        # Transform to response models
        posts = []
        for row in result.data:
            author_name = row.get("users", {}).get("full_name", "Anonymous") if row.get("users") else "Anonymous"
            posts.append(
                PostResponse(
                    id=str(row["id"]),
                    user_id=str(row["user_id"]),
                    title=row["title"],
                    content=row["content"],
                    category=row.get("category", "general"),
                    tags=row.get("tags", []),
                    author_name=author_name,
                    upvotes=row.get("upvotes", 0),
                    view_count=row.get("view_count", 0),
                    is_pinned=row.get("is_pinned", False),
                    created_at=row["created_at"],
                    updated_at=row.get("updated_at"),
                    comment_count=comment_counts.get(str(row["id"]), 0),
                )
            )

        return PostListResponse(
            posts=posts,
            total=total,
            page=page,
            limit=limit,
            has_more=(offset + limit) < total,
        )

    async def _get_comment_counts(self, post_ids: List[str]) -> Dict[str, int]:
        """Get comment counts for multiple posts"""
        if not post_ids:
            return {}

        result = self.db.table("forum_comments").select(
            "post_id", count="exact"
        ).in_("post_id", post_ids).execute()

        # Group by post_id - since we can't GROUP BY with supabase-py easily,
        # we'll do a separate count query per post or use RPC
        counts = {}
        for post_id in post_ids:
            count_result = self.db.table("forum_comments").select(
                "id", count="exact"
            ).eq("post_id", post_id).execute()
            counts[str(post_id)] = count_result.count if count_result.count else 0

        return counts

    async def create_post(
        self,
        user_id: str,
        post_data: PostCreate,
    ) -> PostResponse:
        """
        Create a new forum post.
        
        Args:
            user_id: Database user ID
            post_data: Post creation data
            
        Returns:
            Created post response
        """
        insert_data = {
            "user_id": user_id,
            "title": post_data.title,
            "content": post_data.content,
            "category": post_data.category,
            "tags": post_data.tags or [],
        }

        result = self.db.table("forum_posts").insert(insert_data).execute()

        if not result.data:
            raise Exception("Failed to create post")

        post = result.data[0]

        # Get author name
        user_result = self.db.table("users").select("full_name").eq("id", user_id).execute()
        author_name = user_result.data[0]["full_name"] if user_result.data else "Anonymous"

        return PostResponse(
            id=str(post["id"]),
            user_id=str(post["user_id"]),
            title=post["title"],
            content=post["content"],
            category=post.get("category", "general"),
            tags=post.get("tags", []),
            author_name=author_name,
            upvotes=post.get("upvotes", 0),
            view_count=post.get("view_count", 0),
            is_pinned=post.get("is_pinned", False),
            created_at=post["created_at"],
            updated_at=post.get("updated_at"),
            comment_count=0,
        )

    async def get_post_details(
        self,
        post_id: str,
        user_id: Optional[str] = None,
    ) -> Optional[PostDetailResponse]:
        """
        Get post details with comments.
        
        Args:
            post_id: Post UUID
            user_id: Current user ID (for vote status)
            
        Returns:
            PostDetailResponse or None if not found
        """
        # Fetch post with author
        result = self.db.table("forum_posts").select(
            "*, users!inner(full_name)"
        ).eq("id", post_id).execute()

        if not result.data:
            return None

        post = result.data[0]

        # Increment view count
        self.db.table("forum_posts").update({
            "view_count": post.get("view_count", 0) + 1
        }).eq("id", post_id).execute()

        # Fetch comments with authors
        comments_result = self.db.table("forum_comments").select(
            "*, users!inner(full_name)"
        ).eq("post_id", post_id).order("created_at", desc=False).execute()

        comments = []
        for row in comments_result.data:
            author_name = row.get("users", {}).get("full_name", "Anonymous") if row.get("users") else "Anonymous"
            comments.append(
                CommentResponse(
                    id=str(row["id"]),
                    post_id=str(row["post_id"]),
                    user_id=str(row["user_id"]),
                    content=row["content"],
                    parent_comment_id=str(row["parent_comment_id"]) if row.get("parent_comment_id") else None,
                    author_name=author_name,
                    upvotes=row.get("upvotes", 0),
                    created_at=row["created_at"],
                    updated_at=row.get("updated_at"),
                )
            )

        # Get user's vote status on this post
        user_vote_status = None
        if user_id:
            vote_result = self.db.table("forum_votes").select(
                "vote_type"
            ).eq("user_id", user_id).eq("post_id", post_id).execute()
            if vote_result.data:
                user_vote_status = vote_result.data[0]["vote_type"]

        author_name = post.get("users", {}).get("full_name", "Anonymous") if post.get("users") else "Anonymous"
        
        return PostDetailResponse(
            id=str(post["id"]),
            user_id=str(post["user_id"]),
            title=post["title"],
            content=post["content"],
            category=post.get("category", "general"),
            tags=post.get("tags", []),
            author_name=author_name,
            upvotes=post.get("upvotes", 0),
            view_count=post.get("view_count", 0) + 1,  # Include current view
            is_pinned=post.get("is_pinned", False),
            created_at=post["created_at"],
            updated_at=post.get("updated_at"),
            comment_count=len(comments),
            comments=comments,
            user_vote_status=user_vote_status,
        )

    async def delete_post(self, post_id: str, user_id: str) -> bool:
        """
        Delete a post (only if user is the owner).
        
        Args:
            post_id: Post UUID
            user_id: Current user ID
            
        Returns:
            True if deleted, False if not found or not authorized
        """
        # Verify ownership
        result = self.db.table("forum_posts").select(
            "user_id"
        ).eq("id", post_id).execute()

        if not result.data:
            return False

        if str(result.data[0]["user_id"]) != user_id:
            return False

        # Delete the post (cascade will handle comments and votes)
        self.db.table("forum_posts").delete().eq("id", post_id).execute()
        return True

    # =========================================================================
    # Comments
    # =========================================================================

    async def create_comment(
        self,
        user_id: str,
        post_id: str,
        comment_data: CommentCreate,
    ) -> CommentResponse:
        """
        Create a new comment on a post.
        
        Args:
            user_id: Database user ID
            post_id: Post UUID
            comment_data: Comment creation data
            
        Returns:
            Created comment response
        """
        insert_data = {
            "user_id": user_id,
            "post_id": post_id,
            "content": comment_data.content,
        }

        if comment_data.parent_comment_id:
            insert_data["parent_comment_id"] = comment_data.parent_comment_id

        result = self.db.table("forum_comments").insert(insert_data).execute()

        if not result.data:
            raise Exception("Failed to create comment")

        comment = result.data[0]

        # Get author name
        user_result = self.db.table("users").select("full_name").eq("id", user_id).execute()
        author_name = user_result.data[0]["full_name"] if user_result.data else "Anonymous"

        return CommentResponse(
            id=str(comment["id"]),
            post_id=str(comment["post_id"]),
            user_id=str(comment["user_id"]),
            content=comment["content"],
            parent_comment_id=str(comment["parent_comment_id"]) if comment.get("parent_comment_id") else None,
            author_name=author_name,
            upvotes=comment.get("upvotes", 0),
            created_at=comment["created_at"],
            updated_at=comment.get("updated_at"),
        )

    # =========================================================================
    # Voting
    # =========================================================================

    async def vote_on_post(
        self,
        user_id: str,
        post_id: str,
        vote_type: VoteType,
    ) -> VoteResponse:
        """
        Vote on a post.
        
        Logic:
        - If vote exists and is same type -> Remove vote (toggle off)
        - If vote exists and is different type -> Update vote (flip)
        - If new -> Insert vote
        
        Args:
            user_id: Database user ID
            post_id: Post UUID
            vote_type: VoteType.UP or VoteType.DOWN
            
        Returns:
            VoteResponse with new state
        """
        return await self._handle_vote(
            user_id=user_id,
            target_id=post_id,
            target_type="post",
            vote_type=vote_type,
        )

    async def vote_on_comment(
        self,
        user_id: str,
        comment_id: str,
        vote_type: VoteType,
    ) -> VoteResponse:
        """
        Vote on a comment.
        
        Args:
            user_id: Database user ID
            comment_id: Comment UUID
            vote_type: VoteType.UP or VoteType.DOWN
            
        Returns:
            VoteResponse with new state
        """
        return await self._handle_vote(
            user_id=user_id,
            target_id=comment_id,
            target_type="comment",
            vote_type=vote_type,
        )

    async def _handle_vote(
        self,
        user_id: str,
        target_id: str,
        target_type: str,  # "post" or "comment"
        vote_type: VoteType,
    ) -> VoteResponse:
        """
        Handle vote logic for posts or comments.
        """
        id_field = "post_id" if target_type == "post" else "comment_id"
        table = "forum_posts" if target_type == "post" else "forum_comments"

        # Check existing vote
        existing_vote = self.db.table("forum_votes").select(
            "id, vote_type"
        ).eq("user_id", user_id).eq(id_field, target_id).execute()

        upvote_delta = 0
        new_vote_status = None

        if existing_vote.data:
            existing = existing_vote.data[0]
            existing_vote_type = existing["vote_type"]

            if existing_vote_type == vote_type.value:
                # Same vote type - remove vote (toggle off)
                self.db.table("forum_votes").delete().eq("id", existing["id"]).execute()
                upvote_delta = -vote_type.value
                new_vote_status = None
            else:
                # Different vote type - update vote (flip)
                self.db.table("forum_votes").update({
                    "vote_type": vote_type.value
                }).eq("id", existing["id"]).execute()
                # Delta is 2x the vote type (e.g., -1 -> +1 is +2 upvote delta)
                upvote_delta = vote_type.value * 2
                new_vote_status = vote_type.value
        else:
            # New vote
            insert_data = {
                "user_id": user_id,
                id_field: target_id,
                "vote_type": vote_type.value,
            }
            self.db.table("forum_votes").insert(insert_data).execute()
            upvote_delta = vote_type.value
            new_vote_status = vote_type.value

        # Update upvote count on target
        target_result = self.db.table(table).select("upvotes").eq("id", target_id).execute()
        if target_result.data:
            current_upvotes = target_result.data[0].get("upvotes", 0)
            new_upvotes = max(0, current_upvotes + upvote_delta)  # Prevent negative
            self.db.table(table).update({
                "upvotes": new_upvotes
            }).eq("id", target_id).execute()
        else:
            new_upvotes = 0

        return VoteResponse(
            success=True,
            new_upvote_count=new_upvotes,
            user_vote_status=new_vote_status,
        )


def get_forum_service(db: Client) -> ForumService:
    """Factory function to create ForumService instance"""
    return ForumService(db)
