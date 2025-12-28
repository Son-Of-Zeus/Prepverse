import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { CosmicBackground } from '../components/ui/CosmicBackground';
import { useDashboard, fetchConceptMastery, ConceptMastery } from '../hooks/useDashboard';
import { useAuth } from '../hooks/useAuth';
import { getRecentPractice, SubjectProgress } from '../utils/progress';

import { SWOTAnalysis } from '../components/dashboard/SWOTAnalysis';
import {
  LayoutDashboard, Target, Zap, Users,
  LogOut, Flame, Star, BookOpen, Clock,
  ArrowRight, Trophy, Activity, TrendingUp, MessageSquare
} from 'lucide-react';
import { forumApi } from '../api/forum';

// --- Components ---

const SideNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { label: 'Home', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Start Practice', icon: Target, path: '/practice' },
    { label: 'Discussion', icon: MessageSquare, path: '/discussion' },
    { label: 'Focus Mode', icon: Zap, path: '/focus' },
    { label: 'Peer Study', icon: Users, path: '/peer' },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay (could be added later for full mobile support) */}

      <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-white/5 bg-slate-950 backdrop-blur-xl flex-col h-screen z-20">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-prepverse-red to-orange-600 flex items-center justify-center shadow-lg shadow-prepverse-red/20">
            <span className="font-display text-white font-bold text-xl">P</span>
          </div>
          <h1 className="font-display text-xl text-white tracking-wide">PrepVerse</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.label}
                onClick={() => !item.disabled && navigate(item.path)}
                disabled={item.disabled}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 flex-shrink-0
                  ${isActive
                    ? 'bg-prepverse-red text-white shadow-glow-sm'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }
                  ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {item.disabled && <span className="ml-auto text-[10px] uppercase font-bold bg-white/5 px-1.5 py-0.5 rounded text-slate-500">Soon</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-4 flex-shrink-0 bg-slate-950 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-prepverse-red font-bold border border-white/10 flex-shrink-0">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || 'Student'}</p>
              <p className="text-xs text-slate-500 truncate">Class {user?.class_level || 10}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-950 border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-prepverse-red to-orange-600 flex items-center justify-center shadow-lg shadow-prepverse-red/20">
            <span className="font-display text-white font-bold text-lg">P</span>
          </div>
          <h1 className="font-display text-lg text-white tracking-wide">PrepVerse</h1>
        </div>
        {/* Mobile Menu trigger could go here */}
      </div>
    </>
  );
};

const SignOutButton = () => {
  const { logout } = useAuth();
  return (
    <button
      onClick={logout}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
    >
      <LogOut size={20} />
      <span>Sign Out</span>
    </button>
  );
};

const PracticeInsightsWidget = () => {
  const [recent, setRecent] = useState<SubjectProgress[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setRecent(getRecentPractice());
    const handleStorageChange = () => setRecent(getRecentPractice());
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (recent.length === 0) return (
    <div className="glass rounded-3xl p-6 h-full flex flex-col items-center justify-center text-center space-y-4 min-h-[200px]">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
        <Activity size={24} />
      </div>
      <div>
        <h3 className="text-white font-medium">No Data Yet</h3>
        <p className="text-sm text-slate-500 max-w-[200px]">Complete a practice session to see insights here.</p>
      </div>
    </div>
  );

  return (
    <div className="glass rounded-3xl p-6 border border-white/5">
      <h3 className="font-display text-white mb-6 flex items-center gap-2">
        <Activity className="text-prepverse-red" size={20} />
        Practice Insights
      </h3>

      <div className="space-y-6">
        {recent.slice(0, 4).map((item) => (
          <div key={item.subjectId}>
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-medium text-slate-300 capitalize truncate max-w-[120px]" title={item.subjectId}>{item.subjectId}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  {item.averageAccuracy}% Mastery
                </span>
                <button
                  onClick={() => {
                    navigate('/practice/session/quick-start', {
                      state: {
                        config: { difficulty: 'medium', questionCount: 10, timer: '15 Mins' },
                        topic: {
                          id: item.subjectId,
                          subject: item.subjectId,
                          topic: item.subjectId,
                          display_name: item.subjectId
                        }
                      }
                    });
                  }}
                  className="w-6 h-6 rounded-full bg-slate-800 hover:bg-prepverse-red flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  title="Quick Start"
                >
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-brand rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${item.averageAccuracy}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecentDiscussionsWidget = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch recent posts (page 1, limit 3)
    forumApi.getPosts(1, 3).then((data: any) => {
      setPosts(data.posts);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to fetch recent discussions", err);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="glass rounded-3xl p-6 h-full border border-white/5 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col relative z-20">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-display text-white flex items-center gap-2">
          <MessageSquare className="text-blue-400" size={20} />
          Recent Discussions
        </h3>
        <button
          onClick={() => navigate('/discussion')}
          className="text-xs text-blue-400 hover:text-blue-300 font-medium uppercase tracking-wider transition-colors"
        >
          View All
        </button>
      </div>

      <div className="space-y-4 overflow-hidden">
        {posts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-2 min-h-[100px]">
            <MessageSquare size={24} className="opacity-50" />
            <p className="text-sm">No discussions yet.</p>
          </div>
        ) : (
          posts.map(post => (
            <div
              key={post.id}
              onClick={() => navigate(`/discussion/${post.id}`)}
              className="group cursor-pointer bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-colors border border-transparent hover:border-white/10"
            >
              <h4 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors line-clamp-1 mb-1">
                {post.title}
              </h4>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="font-bold text-slate-400">{post.upvotes}</span> votes
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {post.comment_count} answers
                </span>
                <span>•</span>
                <span className="truncate max-w-[80px]">{post.category}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => navigate('/discussion')}
        className="mt-4 w-full py-3 bg-prepverse-red/10 hover:bg-prepverse-red/20 text-prepverse-red font-bold rounded-xl transition-all border border-prepverse-red/20 hover:border-prepverse-red/50 flex items-center justify-center gap-2"
      >
        <span>Ask a Question</span>
      </button>
    </div>
  );
};

// --- Page Component ---

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    isLoading,
    error,
    currentStreak,
    totalXP,
    continueLearning,
    suggestedTopics,
    totalSessions,
    overallAccuracy,
    subjectScores,
    refresh,
  } = useDashboard();

  // State for SWOT analysis and performance trend
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [concepts, setConcepts] = useState<ConceptMastery[]>([]);
  const [isLoadingConcepts, setIsLoadingConcepts] = useState(false);

  // Get available subjects from subjectScores
  const availableSubjects = useMemo(() => Object.keys(subjectScores), [subjectScores]);

  // Fetch concepts when subject changes
  useEffect(() => {
    if (selectedSubject) {
      setIsLoadingConcepts(true);
      fetchConceptMastery(selectedSubject).then((data) => {
        setConcepts(data);
        setIsLoadingConcepts(false);
      });
    } else if (availableSubjects.length > 0 && !selectedSubject) {
      setSelectedSubject(availableSubjects[0] || '');
    }
  }, [selectedSubject, availableSubjects]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <CosmicBackground starCount={50} />
        <div className="w-12 h-12 border-4 border-prepverse-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center text-center p-8">
        <div className="glass p-8 rounded-3xl max-w-md">
          <h2 className="text-xl text-white font-display mb-2">Sync Error</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button onClick={refresh} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void text-white font-sans flex overflow-hidden">
      <CosmicBackground starCount={60} showGrid />

      <SideNav />

      {/* Main Content Area */}
      {/* Main Content Area */}
      <main className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto h-screen relative z-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8 pb-10">

          {/* Welcome Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-display text-white">
                {getTimeGreeting()}, {user?.full_name || 'Student'}
              </h2>
              <p className="text-slate-400 mt-1">Ready to continue your journey?</p>
            </div>
            <div className="flex items-center gap-4">

              <div className="glass px-4 py-2 rounded-xl flex items-center gap-2 border border-white/5">
                <Flame className="text-orange-500 fill-orange-500" size={18} />
                <span className="font-mono font-bold">{currentStreak} Day Streak</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Flame />} value={currentStreak} label="Streak" color="text-orange-500" />
            <StatCard icon={<Star />} value={totalXP} label="Total XP" color="text-yellow-400" />
            <StatCard icon={<BookOpen />} value={totalSessions} label="Sessions" color="text-blue-400" />
            <StatCard icon={<Trophy />} value={`${overallAccuracy.toFixed(0)}%`} label="Accuracy" color="text-emerald-400" />
          </div>

          {/* Split Section: Continue Learning + Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Learning Path (2 cols wide) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Call to Action Wrapper */}
              <div className="glass rounded-3xl p-6 border border-white/5">
                <h3 className="font-display text-xl text-white mb-4">Continue Learning</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Quick Action */}
                  <button
                    onClick={() => {
                      const recent = getRecentPractice();
                      if (recent.length > 0 && recent[0]) {
                        const last = recent[0];
                        navigate('/practice/session/quick-start', {
                          state: {
                            config: { difficulty: 'medium', questionCount: 10, timer: '15 Mins' },
                            topic: {
                              id: last.subjectId,
                              subject: last.subjectId,
                              topic: last.subjectId,
                              display_name: last.subjectId
                            }
                          }
                        });
                      } else {
                        navigate('/practice');
                      }
                    }}
                    className="bg-gradient-to-br from-prepverse-red to-pink-600 rounded-2xl p-5 text-left group relative overflow-hidden shadow-lg shadow-prepverse-red/20 hover:scale-[1.02] transition-transform duration-300"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Target size={80} />
                    </div>
                    <div className="relative z-10">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center mb-3 text-white">
                        <Target size={20} />
                      </div>
                      <h4 className="font-bold text-lg text-white mb-1">Quick Practice</h4>
                      <p className="text-white/80 text-sm">Jump into the arena</p>
                    </div>
                  </button>

                  {/* Topics List */}
                  {continueLearning.slice(0, 3).map((topic) => (
                    <TopicCard key={`${topic.subject}-${topic.topic}`} topic={topic} />
                  ))}

                  {continueLearning.length === 0 && (
                    <div className="bg-white/5 rounded-2xl p-5 flex items-center justify-center text-slate-500 text-sm">
                      No recent topics found.
                    </div>
                  )}
                </div>
              </div>

              {/* SWOT Analysis Section */}
              {availableSubjects.length > 0 && (
                <div className="glass rounded-3xl p-6 border border-white/5 relative z-10">
                  <h3 className="font-display text-xl text-white mb-4 flex items-center gap-2">
                    <Zap className="text-violet-400" size={20} />
                    SWOT Analysis
                  </h3>
                  {/* Subject Tabs */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {availableSubjects.map((subject) => {
                      const isSelected = selectedSubject === subject;
                      const bgColor = getSubjectBgColor(subject);
                      return (
                        <button
                          key={subject}
                          onClick={() => setSelectedSubject(subject)}
                          className={`
                            px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200
                            ${isSelected
                              ? `${bgColor} text-white shadow-lg`
                              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                            }
                          `}
                        >
                          {formatSubjectName(subject)}
                        </button>
                      );
                    })}
                  </div>
                  {isLoadingConcepts ? (
                    <div className="p-12 text-center">
                      <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-slate-400">Analyzing your performance...</p>
                    </div>
                  ) : (
                    <SWOTAnalysis concepts={concepts} streak={currentStreak} />
                  )}
                </div>
              )}

            </div>

            {/* Column 2: Insights & Study Time (1 col wide) */}
            <div className="space-y-6">
              <PracticeInsightsWidget />
              <RecentDiscussionsWidget />

              {/* Recommended for You Widget */}
              {suggestedTopics.length > 0 && (
                <div className="glass rounded-3xl p-6 border border-white/5 relative z-10 flex flex-col">
                  <h3 className="font-display text-white mb-6 flex items-center gap-2">
                    <Target className="text-purple-400" size={20} />
                    Recommended
                  </h3>
                  <div className="space-y-4">
                    {suggestedTopics.slice(0, 3).map((topic) => (
                      <TopicCard
                        key={`${topic.subject}-${topic.topic}`}
                        topic={topic}
                        suggested
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>





        </div>
      </main>
    </div>
  );
};


// --- Helper Components & Logic ---

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const StatCard = ({ icon, value, label, color }: any) => (
  <div className="glass rounded-2xl p-4 flex items-center gap-4">
    <div className={`p-3 rounded-xl bg-slate-900/50 ${color}`}>{icon}</div>
    <div>
      <p className="font-display text-xl text-white">{value}</p>
      <p className="text-slate-500 text-xs uppercase tracking-wider font-bold">{label}</p>
    </div>
  </div>
);

function formatSubjectName(subject: string): string {
  return subject
    .split(/[\s_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getSubjectBgColor(subject: string): string {
  const colors: Record<string, string> = {
    mathematics: 'bg-math',
    physics: 'bg-physics',
    chemistry: 'bg-chemistry',
    biology: 'bg-biology',
    science: 'bg-science',
  };
  return colors[subject.toLowerCase()] || 'bg-cosmic';
}

function getSubjectBorderColor(subject: string): string {
  const colors: Record<string, string> = {
    mathematics: 'border-math text-math',
    physics: 'border-physics text-physics',
    chemistry: 'border-chemistry text-chemistry',
    biology: 'border-biology text-biology',
    science: 'border-science text-science',
  };
  return colors[subject.toLowerCase()] || 'border-cosmic text-cosmic';
}

const TopicCard = ({ topic, suggested }: any) => {
  const borderColor = getSubjectBorderColor(topic.subject);
  const displaySubject = formatSubjectName(topic.subject);

  return (
    <div
      className={`glass rounded-2xl p-5 border-l-4 ${borderColor.split(' ')[0]} hover:bg-white/5 transition-all cursor-pointer group`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-[10px] font-mono uppercase tracking-widest ${borderColor.split(' ')[1]}`}>
          {displaySubject}
        </span>
        {suggested && (
          <span className="text-[10px] bg-prepverse-red/20 text-prepverse-red px-2 py-0.5 rounded uppercase font-bold">
            Tip
          </span>
        )}
      </div>
      <h3 className="font-medium text-white mb-3 group-hover:text-prepverse-red transition-colors">{topic.displayName}</h3>
      <div className="relative h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
          style={{ width: `${topic.progress * 100}%` }}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
