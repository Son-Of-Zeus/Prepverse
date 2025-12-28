import { useState, useEffect } from 'react';
import { CosmicBackground } from '../components/ui/CosmicBackground';
import { Search, Plus } from 'lucide-react';
import { forumApi } from '../api/forum';
import { Post } from '../types/forum';
import { DiscussionCard } from '../components/discussion/DiscussionCard';
import { AskQuestionModal } from '../components/discussion/AskQuestionModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, Zap, LogOut, MessageSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Use same side nav from Dashboard to avoid duplication or import it if exported
// For now, I'll inline a simplified version or assume Layout wrapper exists
// Since App structure doesn't seem to have a layout wrapper, I'll replicate Layout for consistency or create a Layout component later.
// To save time and keep it clean, I will assume we should use the same SideNav.
// Ideally, SideNav should be a shared component. I'll make a mental note to refactor later.
// For this task, I will just replicate the wrapper structure.

const SideNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const navItems = [
        { label: 'Home', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Start Practice', icon: Target, path: '/practice' },
        { label: 'Discussion', icon: MessageSquare, path: '/discussion' },
        { label: 'Focus Mode', icon: Zap, path: '/focus' },
    ];

    return (
        <aside className="w-64 flex-shrink-0 border-r border-white/5 bg-slate-900/50 backdrop-blur-xl flex flex-col fixed left-0 top-0 bottom-0 z-50">
            <div className="p-6 border-b border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-prepverse-red to-orange-600 flex items-center justify-center shadow-lg shadow-prepverse-red/20">
                    <span className="font-display text-white font-bold text-xl">P</span>
                </div>
                <h1 className="font-display text-xl text-white tracking-wide">PrepVerse</h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${(location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path)))
                            ? 'bg-prepverse-red text-white shadow-glow-sm'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="p-4 border-t border-white/5">
                <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
                    <LogOut size={20} /> <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
};


export const DiscussionFeed = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAskModal, setShowAskModal] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchPosts = async (reset = false) => {
        try {
            setLoading(true);
            const p = reset ? 1 : page;
            const res = await forumApi.getPosts(p, 20, search);

            if (reset) {
                setPosts(res.posts);
            } else {
                setPosts(prev => [...prev, ...res.posts]);
            }

            setHasMore(res.has_more);
            if (!reset) setPage(p + 1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts(true);
    }, [search]);

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            setPage(prev => prev + 1);
            fetchPosts(); // uses new page state next render? No, state update async. Fixed logic in fetchPosts args essentially.
            // Actually, simpler to just rely on effect or pass page explicitly.
            // Let's fix the pagination logic:
            const nextPage = page + 1;
            forumApi.getPosts(nextPage, 20, search).then(res => {
                setPosts(prev => [...prev, ...res.posts]);
                setHasMore(res.has_more);
                setPage(nextPage);
            });
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans flex overflow-hidden">
            <CosmicBackground starCount={30} showGrid={false} />
            <SideNav />

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen relative z-10 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-8">

                    {/* Header & Controls */}
                    <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                        <div>
                            <h1 className="text-3xl font-display font-bold text-white mb-2">Discussion Forum</h1>
                            <p className="text-slate-400">Join the conversation, ask questions, and share knowledge.</p>
                        </div>
                        <button
                            onClick={() => setShowAskModal(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-prepverse-red hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-900/20 transition-all transform hover:-translate-y-1"
                        >
                            <Plus size={20} />
                            <span>Ask Question</span>
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search size={20} className="text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search discussions..."
                            className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:bg-slate-900/80 transition-all shadow-xl"
                        />
                    </div>

                    {/* Post List */}
                    <div className="space-y-4">
                        {posts.map(post => (
                            <DiscussionCard key={post.id} post={post} />
                        ))}

                        {loading && (
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 h-40 animate-pulse flex flex-col gap-4">
                                        <div className="flex gap-4">
                                            <div className="w-12 h-full bg-slate-800/50 rounded-lg" />
                                            <div className="flex-1 space-y-3">
                                                <div className="h-6 w-3/4 bg-slate-800/50 rounded" />
                                                <div className="h-4 w-full bg-slate-800/50 rounded" />
                                                <div className="h-4 w-1/2 bg-slate-800/20 rounded" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && posts.length === 0 && (
                            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                                    <MessageSquare size={32} />
                                </div>
                                <h3 className="text-xl font-display text-white mb-2">No discussions found</h3>
                                <p className="text-slate-400">Be the first to ask a question!</p>
                            </div>
                        )}

                        {/* Load More Trigger (can be replaced with IntersectionObserver later) */}
                        {!loading && hasMore && posts.length > 0 && (
                            <button
                                onClick={handleLoadMore}
                                className="w-full py-4 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors font-medium"
                            >
                                Load More Discussions
                            </button>
                        )}
                    </div>
                </div>
            </main>

            {showAskModal && (
                <AskQuestionModal
                    onClose={() => setShowAskModal(false)}
                    onSuccess={() => fetchPosts(true)}
                />
            )}
        </div>
    );
};
