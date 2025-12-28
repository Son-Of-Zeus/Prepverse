import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CosmicBackground } from '../components/ui/CosmicBackground';
import { forumApi } from '../api/forum';
import { PostDetail } from '../types/forum';
import { VoteType } from '../types/forum';
import { ArrowLeft, ChevronUp, ChevronDown, Clock, Share2, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '../components/ui/Skeleton';

const VoteButtons = ({
    votes,
    userStatus,
    onVote
}: {
    votes: number,
    userStatus?: number | null | undefined,
    onVote: (type: VoteType) => void
}) => (
    <div className="flex flex-col items-center gap-1">
        <button
            onClick={() => onVote(VoteType.UP)}
            className={`p-2 rounded-full transition-all active:scale-95 ${userStatus === 1
                ? 'bg-orange-500/20 text-orange-500 ring-1 ring-orange-500/50'
                : 'text-slate-500 hover:bg-slate-800 hover:text-orange-400'}`}
        >
            <ChevronUp size={28} strokeWidth={3} />
        </button>

        <span className="text-xl font-bold text-slate-200 my-1 font-mono">
            {votes < 0 ? 0 : votes}
        </span>

        <button
            onClick={() => onVote(VoteType.DOWN)}
            className={`p-2 rounded-full transition-all active:scale-95 ${userStatus === -1
                ? 'bg-blue-500/20 text-blue-500 ring-1 ring-blue-500/50'
                : 'text-slate-500 hover:bg-slate-800 hover:text-blue-400'}`}
        >
            <ChevronDown size={28} strokeWidth={3} />
        </button>
    </div>
);


export const DiscussionThread = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<PostDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [answerText, setAnswerText] = useState('');
    const [submittingAnswer, setSubmittingAnswer] = useState(false);

    const fetchDetails = async () => {
        if (!id) return;
        try {
            const data = await forumApi.getPostDetails(id);
            setPost(data);
        } catch (err) {
            console.error("Failed to load thread", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const handleVotePost = async (type: VoteType) => {
        if (!post) return;
        try {
            const res = await forumApi.voteOnPost(post.id, type);
            setPost(prev => prev ? ({
                ...prev,
                upvotes: res.new_upvote_count,
                user_vote_status: res.user_vote_status ?? undefined
            }) : null);
        } catch (err) {
            console.error("Vote failed", err);
        }
    };

    const handleVoteComment = async (commentId: string, type: VoteType) => {
        if (!post) return;
        try {
            const res = await forumApi.voteOnComment(commentId, type);
            setPost(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    comments: prev.comments.map(c =>
                        c.id === commentId
                            ? { ...c, upvotes: res.new_upvote_count, user_vote_status: res.user_vote_status ?? undefined }
                            : c
                    )
                };
            });
        } catch (err) {
            console.error("Comment vote failed", err);
        }
    };

    const handleSubmitAnswer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!post || !answerText.trim()) return;

        setSubmittingAnswer(true);
        try {
            const newComment = await forumApi.createComment(post.id, { content: answerText });
            setPost(prev => prev ? ({
                ...prev,
                comments: [...prev.comments, newComment]
            }) : null);
            setAnswerText('');
        } catch (err) {
            console.error("Answer failed", err);
        } finally {
            setSubmittingAnswer(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 text-white font-sans flex justify-center p-8">
            <CosmicBackground starCount={30} showGrid={false} />
            <div className="max-w-4xl w-full space-y-8 relative z-10 pt-10">
                <Skeleton width={120} height={24} />
                <div className="flex gap-6">
                    <div className="w-16 flex flex-col gap-4 items-center">
                        <Skeleton variant="circular" width={40} height={40} />
                        <Skeleton variant="text" width={20} />
                        <Skeleton variant="circular" width={40} height={40} />
                    </div>
                    <div className="flex-1 space-y-4">
                        <Skeleton height={40} width="80%" />
                        <Skeleton height={200} />
                    </div>
                </div>
            </div>
        </div>
    );

    if (!post) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
            Post not found
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
            <CosmicBackground starCount={30} showGrid={false} />

            <div className="max-w-5xl mx-auto px-6 py-10 relative z-10">

                {/* Back Button */}
                <button
                    onClick={() => navigate('/discussion')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 group transition-colors font-medium text-sm border border-transparent hover:border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 w-fit"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Discussions
                </button>

                {/* Question Section */}
                <div className="flex gap-4 md:gap-8 mb-12">
                    {/* VOTING GUTTER */}
                    <div className="hidden md:flex flex-col items-center gap-2 pt-2 shrink-0 w-16 border-r border-slate-800/50 pr-4 h-fit sticky top-8">
                        <VoteButtons
                            votes={post.upvotes}
                            userStatus={post.user_vote_status}
                            onVote={handleVotePost}
                        />
                        <div className="h-px w-8 bg-slate-800 my-4" />
                        <button className="text-slate-500 hover:text-white transition-colors p-2" title="Share">
                            <Share2 size={20} />
                        </button>
                        <button className="text-slate-500 hover:text-red-400 transition-colors p-2" title="Report">
                            <Flag size={20} />
                        </button>
                    </div>

                    {/* MAIN CONTENT */}
                    <div className="flex-1 min-w-0">
                        {/* Title Header */}
                        <div className="mb-6 pb-6 border-b border-gradient-to-r from-slate-800 to-transparent">
                            <h1 className="text-2xl md:text-4xl font-display font-bold mb-4 leading-tight text-white tracking-tight">
                                {post.title}
                            </h1>
                            <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                                <span className="flex items-center gap-1">
                                    <Clock size={14} />
                                    asked {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                </span>
                                <span>Views: <span className="text-slate-300">{post.view_count}</span></span>
                            </div>
                        </div>

                        {/* Question Body */}
                        <div className="prose prose-invert prose-lg max-w-none text-slate-300 mb-8 leading-relaxed whitespace-pre-wrap font-light">
                            {post.content}
                        </div>

                        {/* Footer (Tags & Author Card) */}
                        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 pt-4">

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                                {post.tags?.map(tag => (
                                    <span key={tag} className="px-3 py-1 rounded-full bg-blue-500/5 border-l-2 border-blue-500/50 text-xs text-blue-300 font-medium hover:bg-blue-500/10 transition-colors cursor-pointer">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* Author Card */}
                            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/30 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm shadow-xl min-w-[200px]">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">Asked By</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg border border-white/10">
                                        {post.author_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">
                                            {post.author_name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] text-slate-400">New Contributor</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Answers Section */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                            {post.comments.length} Answers
                            <span className="text-sm font-normal text-slate-500 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                                Sorted by votes
                            </span>
                        </h2>
                    </div>

                    {post.comments.length === 0 ? (
                        <div className="bg-slate-900/30 border border-slate-800/50 border-dashed rounded-2xl p-12 text-center">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                                <Share2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">No answers yet</h3>
                            <p className="text-slate-400 max-w-md mx-auto">
                                Be the first to share your knowledge and help {post.author_name} solve this problem.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {post.comments.map(comment => (
                                <div key={comment.id} className="flex gap-4 md:gap-8 group animate-fade-in text-slate-300">
                                    {/* Answer Voting */}
                                    <div className="hidden md:flex flex-col items-center gap-2 pt-2 shrink-0 w-16">
                                        <VoteButtons
                                            votes={comment.upvotes}
                                            userStatus={comment.user_vote_status}
                                            onVote={(type) => handleVoteComment(comment.id, type)}
                                        />
                                        {/* Example 'Accepted' Checkmark Logic Visual */}
                                        {/* <button className="mt-4 text-slate-600 hover:text-emerald-500 transition-colors" title="Mark as accepted">
                                            <CheckCircle size={24} />
                                        </button> */}
                                    </div>

                                    <div className="flex-1 min-w-0 bg-slate-900/20 rounded-2xl border border-transparent hover:border-slate-800/50 p-6 transition-colors">
                                        <div className="prose prose-invert max-w-none mb-6 whitespace-pre-wrap leading-relaxed">
                                            {comment.content}
                                        </div>

                                        <div className="flex justify-end mt-4">
                                            <div className="text-right flex items-center gap-3">
                                                <span className="text-xs text-slate-500">
                                                    answered {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                </span>
                                                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                                                    <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold border border-white/10 text-white">
                                                        {comment.author_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-xs font-bold text-blue-400">{comment.author_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>


                {/* Your Answer Form */}
                <div className="bg-gradient-to-b from-slate-900/40 to-slate-950 border border-slate-800 rounded-xl p-6 md:p-8 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        Your Answer
                    </h3>

                    <form onSubmit={handleSubmitAnswer} className="relative z-10">
                        <textarea
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[240px] mb-4 font-mono text-sm leading-relaxed"
                            placeholder="Write your detailed answer here. Use code blocks, explanation and examples..."
                            required
                        />
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-slate-500">
                                Tips: Be specific, kind, and helpful.
                            </p>
                            <button
                                type="submit"
                                disabled={submittingAnswer || !answerText.trim()}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                            >
                                {submittingAnswer ? "Posting..." : "Post Answer"}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="h-20" /> {/* Bottom spacer */}
            </div>
        </div>
    );
};
