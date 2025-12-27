import { useNavigate } from 'react-router-dom';

import { Post } from '../../types/forum';
import { formatDistanceToNow } from 'date-fns';

interface DiscussionCardProps {
    post: Post;
}

export const DiscussionCard = ({ post }: DiscussionCardProps) => {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`/discussion/${post.id}`)}
            className="group cursor-pointer bg-gradient-to-br from-slate-900/50 to-slate-950 border border-slate-800/50 rounded-xl p-4 md:p-6 hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/10 relative overflow-hidden"
        >
            {/* Hover Glow Effect */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/0 to-transparent group-hover:via-blue-500/50 transition-all duration-500" />

            <div className="flex gap-4 md:gap-6">
                {/* Interaction Stats Sidebar (Desktop) */}
                <div className="hidden md:flex flex-col gap-3 min-w-[3.5rem] shrink-0 text-right text-xs">
                    <div className="flex flex-col">
                        <span className="text-lg font-bold text-slate-200 leading-none">{post.upvotes}</span>
                        <span className="text-slate-500 font-light text-[10px] uppercase tracking-wide">Votes</span>
                    </div>
                    <div className={`flex flex-col ${post.comment_count > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <span className="text-lg font-bold leading-none">{post.comment_count}</span>
                        <span className="font-light text-[10px] uppercase tracking-wide opacity-80">Ans</span>
                    </div>
                    <div className="flex flex-col text-slate-500">
                        <span className="text-lg font-bold leading-none">{post.view_count}</span>
                        <span className="font-light text-[10px] uppercase tracking-wide opacity-80">Views</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0 flex flex-col h-full">
                    <div className="mb-2">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {post.is_pinned && (
                                <span className="text-[10px] bg-prepverse-red/20 text-prepverse-red px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                    Pinned
                                </span>
                            )}
                            <h3 className="text-lg md:text-xl font-display font-medium text-white group-hover:translate-x-1 transition-transform duration-300 line-clamp-2">
                                {post.title}
                            </h3>
                        </div>

                        <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                            {post.content.replace(/<[^>]*>?/gm, '')}
                        </p>
                    </div>

                    <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-4">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                            {post.tags?.map(tag => (
                                <span
                                    key={tag}
                                    className="px-2.5 py-1 rounded-full bg-blue-500/5 border-l-2 border-blue-500/50 text-xs text-blue-300 font-medium hover:bg-blue-500/10 transition-colors"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>

                        {/* Author & Mobile Stats */}
                        <div className="flex items-center gap-4 text-xs text-slate-500 ml-auto">
                            {/* Mobile Stats Row */}
                            <div className="flex md:hidden items-center gap-3 mr-2 border-r border-slate-800 pr-3">
                                <span className="font-bold text-slate-300">{post.upvotes} <span className="font-normal text-slate-500">votes</span></span>
                                <span className={`${post.comment_count > 0 ? 'text-emerald-400 font-bold' : ''}`}>{post.comment_count} <span className="font-normal text-slate-500">ans</span></span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="text-right hidden sm:block">
                                    <span className="text-blue-400 font-medium block leading-none">{post.author_name}</span>
                                    <span className="text-[10px] opacity-70">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 flex items-center justify-center text-xs text-white font-bold shadow-sm">
                                    {post.author_name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
