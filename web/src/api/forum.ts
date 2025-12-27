import { apiClient } from './client';
import {
    Post, PostListResponse, PostDetail,
    PostCreatePayload, CommentCreatePayload,
    VoteType,
    Comment
} from '../types/forum';

// --- Real Backend API Implementation ---

export const forumApi = {
    // List Posts
    getPosts: async (page = 1, limit = 20, search?: string, category?: string): Promise<PostListResponse> => {
        const params: any = { page, limit };
        if (search) params.search = search;
        if (category && category !== 'All') params.category = category;

        const response = await apiClient.get<PostListResponse>('/forum/', { params });
        return response.data;
    },

    // Create Post
    createPost: async (payload: PostCreatePayload): Promise<Post> => {
        const response = await apiClient.post<Post>('/forum/', payload);
        return response.data;
    },

    // Get Post Details
    getPostDetails: async (postId: string): Promise<PostDetail> => {
        const response = await apiClient.get<PostDetail>(`/forum/${postId}`);
        return response.data;
    },

    // Delete Post
    deletePost: async (postId: string): Promise<void> => {
        await apiClient.delete(`/forum/${postId}`);
    },

    // Create Comment
    createComment: async (postId: string, payload: CommentCreatePayload): Promise<Comment> => {
        const response = await apiClient.post<Comment>(`/forum/${postId}/comments`, payload);
        return response.data;
    },

    // Vote on Post
    voteOnPost: async (postId: string, voteType: VoteType) => {
        const response = await apiClient.post(`/forum/${postId}/vote`, { vote_type: voteType });
        return response.data;
    },

    // Vote on Comment
    voteOnComment: async (commentId: string, voteType: VoteType) => {
        const response = await apiClient.post(`/forum/comments/${commentId}/vote`, { vote_type: voteType });
        return response.data;
    },
};
