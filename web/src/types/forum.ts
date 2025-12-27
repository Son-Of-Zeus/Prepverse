export enum VoteType {
    UP = 1,
    DOWN = -1
}

export interface Post {
    id: string;
    user_id: string;
    author_name: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    upvotes: number; // Backend sends 'int' but TS uses 'number', just documenting
    view_count: number;
    is_pinned: boolean;
    created_at: string;
    updated_at?: string;
    comment_count: number;
    user_vote_status?: number; // 1 | -1 | null
}

export interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    author_name: string;
    content: string;
    parent_comment_id?: string;
    upvotes: number;
    created_at: string;
    updated_at?: string;
    user_vote_status?: number; // 1 | -1 | null
    replies?: Comment[]; // For frontend nesting if needed
}

export interface PostDetail extends Post {
    comments: Comment[];
}

export interface PostCreatePayload {
    title: string;
    content: string;
    category?: string;
    tags?: string[];
}

export interface CommentCreatePayload {
    content: string;
    parent_comment_id?: string;
}

export interface PostListResponse {
    posts: Post[];
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
}
