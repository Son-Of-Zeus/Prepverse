

import {
    Post, PostListResponse, PostDetail,
    PostCreatePayload, CommentCreatePayload,
    VoteType,
    Comment
} from '../types/forum';

// --- Mock Data Management ---
const STORAGE_KEY_POSTS = 'prepverse_mock_posts';
const STORAGE_KEY_COMMENTS = 'prepverse_mock_comments';

// Seed Data (Empty now)
const SEED_POSTS: Post[] = [];
const SEED_COMMENTS: Comment[] = [];

// Helper to get data
const getLocalPosts = (): Post[] => {
    const stored = localStorage.getItem(STORAGE_KEY_POSTS);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(SEED_POSTS));
        return SEED_POSTS;
    }
    const posts = JSON.parse(stored) as Post[];
    // User requested to remove MOCK posts but KEEP user posts.
    // Mock posts had IDs starting with 'mock-'. User posts start with 'local-'.
    return posts.filter(p => !p.id.startsWith('mock-'));
};

const getLocalComments = (): Comment[] => {
    const stored = localStorage.getItem(STORAGE_KEY_COMMENTS);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(SEED_COMMENTS));
        return SEED_COMMENTS;
    }
    const comments = JSON.parse(stored) as Comment[];
    // Filter out mock comments (IDs 'c-1', 'c-2')
    return comments.filter(c => !['c-1', 'c-2'].includes(c.id));
};

const savePosts = (posts: Post[]) => localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(posts));
const saveComments = (comments: Comment[]) => localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(comments));

// --- API Implementation (Mock) ---

export const forumApi = {
    // List Posts
    getPosts: async (page = 1, limit = 20, search?: string, category?: string) => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        let posts = getLocalPosts();

        // Filter
        if (search) {
            const q = search.toLowerCase();
            posts = posts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
        }
        if (category && category !== 'All') {
            posts = posts.filter(p => p.category === category);
        }

        // Sort (Pinned first, then new)
        posts.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        // Paginate
        const start = (page - 1) * limit;
        const pagedPosts = posts.slice(start, start + limit);

        return {
            posts: pagedPosts,
            total: posts.length,
            page,
            limit,
            has_more: start + limit < posts.length
        } as PostListResponse;
    },

    // Create Post
    createPost: async (payload: PostCreatePayload) => {
        await new Promise(resolve => setTimeout(resolve, 600));
        const posts = getLocalPosts();

        const newPost: Post = {
            id: `local-${Date.now()}`,
            user_id: 'current-user', // Mock user
            author_name: 'You', // Mock name
            title: payload.title,
            content: payload.content,
            category: payload.category || 'General',
            tags: payload.tags || [],
            upvotes: 0,
            view_count: 0,
            is_pinned: false,
            created_at: new Date().toISOString(),
            comment_count: 0,
            user_vote_status: 0
        };

        const updated = [newPost, ...posts];
        savePosts(updated);
        return newPost;
    },

    // Get Post Details
    getPostDetails: async (postId: string) => {
        await new Promise(resolve => setTimeout(resolve, 400));
        const posts = getLocalPosts();
        const comments = getLocalComments();

        const post = posts.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');

        const postComments = comments.filter(c => c.post_id === postId);

        // Fix: Increment view count logic
        // 1. Do not increment if viewer is the author (mock user 'current-user')
        // 2. Prevent +2 issue (Strict Mode) and duplicate session views using sessionStorage
        const isAuthor = post.user_id === 'current-user';
        const viewedKey = `viewed_post_${postId}`;
        const hasViewedInSession = sessionStorage.getItem(viewedKey);

        if (!isAuthor && !hasViewedInSession) {
            post.view_count += 1;
            savePosts(posts); // Save the view count update
            sessionStorage.setItem(viewedKey, 'true');
        }

        return {
            ...post,
            comments: postComments
        } as PostDetail;
    },

    // Delete Post
    deletePost: async (postId: string) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        let posts = getLocalPosts();
        posts = posts.filter(p => p.id !== postId);
        savePosts(posts);
    },

    // Create Comment
    createComment: async (postId: string, payload: CommentCreatePayload) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const comments = getLocalComments();

        const newComment: Comment = {
            id: `c-local-${Date.now()}`,
            post_id: postId,
            user_id: 'current-user',
            author_name: 'You',
            content: payload.content,
            parent_comment_id: payload.parent_comment_id,
            upvotes: 0,
            created_at: new Date().toISOString(),
            user_vote_status: 0
        };

        const updatedComments = [...comments, newComment];
        saveComments(updatedComments);

        // Update post comment count
        const posts = getLocalPosts();
        const post = posts.find(p => p.id === postId);
        if (post) {
            post.comment_count += 1;
            savePosts(posts);
        }

        return newComment;
    },

    // Vote on Post
    voteOnPost: async (postId: string, voteType: VoteType) => {
        await new Promise(resolve => setTimeout(resolve, 200));
        const posts = getLocalPosts();
        const post = posts.find(p => p.id === postId);

        if (post) {
            // Simple toggle logic for mock
            if (post.user_vote_status === voteType) {
                // Remove vote
                post.upvotes -= voteType;
                post.user_vote_status = 0; // null/0
            } else {
                // Change vote (remove old if exists, add new)
                if (post.user_vote_status) post.upvotes -= post.user_vote_status;
                post.upvotes += voteType;
                post.user_vote_status = voteType;
            }
            savePosts(posts);
            return { success: true, new_upvote_count: post.upvotes, user_vote_status: post.user_vote_status };
        }
        throw new Error('Post not found');
    },

    // Vote on Comment
    voteOnComment: async (commentId: string, voteType: VoteType) => {
        await new Promise(resolve => setTimeout(resolve, 200));
        const comments = getLocalComments();
        const comment = comments.find(c => c.id === commentId);

        if (comment) {
            if ((comment.user_vote_status as number) === voteType) {
                comment.upvotes -= voteType;
                comment.user_vote_status = 0;
            } else {
                if (comment.user_vote_status) comment.upvotes -= (comment.user_vote_status as number);
                comment.upvotes += voteType;
                comment.user_vote_status = voteType;
            }
            saveComments(comments);
            return { success: true, new_upvote_count: comment.upvotes, user_vote_status: comment.user_vote_status };
        }
        throw new Error('Comment not found');
    },
};
