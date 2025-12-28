import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  BookOpen,
  LayoutDashboard,
  Target,
  Zap,
  LogOut,
  School,
} from 'lucide-react';
import { usePeer, usePeerDiscovery } from '../hooks/usePeer';
import { SessionCard, PeerCard, CreateRoomModal } from '../components/peer';
import { useAuth } from '../hooks/useAuth';
import { CosmicBackground } from '../components/ui/CosmicBackground';

const subjects = ['All', 'Mathematics', 'Physics', 'Chemistry', 'Biology'];

// Sidebar Navigation Component (same as Dashboard)
const SideNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems: Array<{ label: string; icon: typeof LayoutDashboard; path: string; disabled?: boolean }> = [
    { label: 'Home', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Start Practice', icon: Target, path: '/practice' },
    { label: 'Focus Mode', icon: Zap, path: '/focus' },
    { label: 'Peer Study', icon: Users, path: '/peer' },
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
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => !item.disabled && navigate(item.path)}
              disabled={item.disabled}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200
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

      <div className="p-4 border-t border-white/5 space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-prepverse-red font-bold border border-white/10">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.full_name || 'Student'}</p>
            <p className="text-xs text-slate-500 truncate">Class {user?.class_level || 10}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export function PeerLobby() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    sessions,
    isLoading,
    error,
    fetchSessions,
    createSession,
    joinSession,
    setCurrentUser,
  } = usePeer();
  const {
    availablePeers,
    isAvailable,
    setAvailability,
    fetchAvailablePeers,
  } = usePeerDiscovery();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rooms' | 'peers'>('rooms');
  const [invitePeerTopic, setInvitePeerTopic] = useState<string | null>(null);

  // Set current user on mount
  useEffect(() => {
    if (user?.id && user?.full_name) {
      setCurrentUser(user.id, user.full_name);
    }
  }, [user, setCurrentUser]);

  // Fetch sessions on mount and when filters change
  useEffect(() => {
    const subject = selectedSubject === 'All' ? undefined : selectedSubject;
    const topic = searchQuery.trim() || undefined;
    fetchSessions(topic, subject);
  }, [selectedSubject, searchQuery, fetchSessions]);

  // Fetch available peers
  useEffect(() => {
    if (activeTab === 'peers') {
      fetchAvailablePeers();
    }
  }, [activeTab, fetchAvailablePeers]);

  const handleCreateRoom = async (request: Parameters<typeof createSession>[0]) => {
    setIsCreating(true);
    try {
      const session = await createSession(request);
      setShowCreateModal(false);
      navigate(`/study-room/${session.id}`);
    } catch {
      // Error handled in hook
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (sessionId: string) => {
    setJoiningSessionId(sessionId);
    try {
      await joinSession(sessionId);
      navigate(`/study-room/${sessionId}`);
    } catch {
      // Error handled in hook
    } finally {
      setJoiningSessionId(null);
    }
  };

  const handleToggleAvailability = async () => {
    await setAvailability(!isAvailable, {
      statusMessage: isAvailable ? '' : 'Looking for study partners',
    });
  };

  const handleRefresh = () => {
    if (activeTab === 'rooms') {
      fetchSessions(
        searchQuery.trim() || undefined,
        selectedSubject === 'All' ? undefined : selectedSubject
      );
    } else {
      fetchAvailablePeers();
    }
  };

  const handleInvitePeer = (peerId: string) => {
    // Find the peer to get their topics
    const peer = availablePeers.find((p) => p.user_id === peerId);
    if (peer) {
      // Use their first seeking_help topic or strong topic as the room topic
      const topic = peer.seeking_help_topics[0] || peer.strong_topics[0] || 'Study Session';
      setInvitePeerTopic(topic);
      setShowCreateModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-void text-white font-sans flex overflow-hidden">
      <CosmicBackground starCount={60} showGrid />

      <SideNav />

      {/* Main Content Area */}
      <main className="flex-1 ml-64 overflow-y-auto h-screen relative z-10">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-deep/80 backdrop-blur-lg border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-prepverse-red/20">
                  <Users className="w-6 h-6 text-prepverse-red" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Peer Study</h1>
                  <p className="text-sm text-white/50">
                    Connect with classmates from your school
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Availability toggle */}
                <button
                  onClick={handleToggleAvailability}
                  disabled={!user?.school_id}
                  title={!user?.school_id ? 'Select your school first' : undefined}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all
                    ${!user?.school_id
                      ? 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
                      : isAvailable
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                    }
                  `}
                >
                  {isAvailable ? 'Available' : 'Set Available'}
                </button>

                {/* Create room button */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  disabled={!user?.school_id}
                  title={!user?.school_id ? 'Select your school first' : undefined}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors
                    ${!user?.school_id
                      ? 'bg-white/10 text-white/30 cursor-not-allowed'
                      : 'bg-prepverse-red text-white hover:bg-prepverse-red-light'
                    }
                  `}
                >
                  <Plus className="w-4 h-4" />
                  Create Room
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-white/10">
              <button
                onClick={() => setActiveTab('rooms')}
                className={`
                  pb-2 px-1 text-sm font-medium transition-colors border-b-2
                  ${
                    activeTab === 'rooms'
                      ? 'text-white border-prepverse-red'
                      : 'text-white/50 border-transparent hover:text-white/70'
                  }
                `}
              >
                <BookOpen className="w-4 h-4 inline mr-2" />
                Study Rooms
              </button>
              <button
                onClick={() => setActiveTab('peers')}
                className={`
                  pb-2 px-1 text-sm font-medium transition-colors border-b-2
                  ${
                    activeTab === 'peers'
                      ? 'text-white border-prepverse-red'
                      : 'text-white/50 border-transparent hover:text-white/70'
                  }
                `}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Available Peers
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          {activeTab === 'rooms' && (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-6">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by topic..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-prepverse-red/50"
                  />
                </div>

                {/* Subject filter */}
                <div className="flex gap-1 p-1 bg-surface rounded-xl border border-white/10">
                  {subjects.map((subject) => (
                    <button
                      key={subject}
                      onClick={() => setSelectedSubject(subject)}
                      className={`
                        px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                        ${
                          selectedSubject === subject
                            ? 'bg-prepverse-red text-white'
                            : 'text-white/60 hover:bg-white/5'
                        }
                      `}
                    >
                      {subject}
                    </button>
                  ))}
                </div>

                {/* Refresh button */}
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="p-2 rounded-xl bg-surface border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400"
                >
                  {error}
                </motion.div>
              )}

              {/* Sessions grid */}
              {isLoading && sessions.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-prepverse-red/30 border-t-prepverse-red rounded-full animate-spin" />
                </div>
              ) : !user?.school_id ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <School className="w-8 h-8 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white/80 mb-2">
                    Select Your School First
                  </h3>
                  <p className="text-sm text-white/50 mb-4 max-w-md mx-auto">
                    To join study rooms with your classmates, you need to select your school.
                    This helps us connect you with students from the same school.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors"
                  >
                    <School className="w-4 h-4" />
                    Go to Dashboard
                  </button>
                </motion.div>
              ) : sessions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-white/30" />
                  </div>
                  <h3 className="text-lg font-medium text-white/60 mb-2">
                    No study rooms available
                  </h3>
                  <p className="text-sm text-white/40 mb-4">
                    Be the first to create one!
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-prepverse-red text-white font-medium hover:bg-prepverse-red-light transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Room
                  </button>
                </motion.div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onJoin={handleJoinRoom}
                      isJoining={joiningSessionId === session.id}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'peers' && (
            <>
              {/* Available peers grid */}
              {isLoading && availablePeers.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-prepverse-red/30 border-t-prepverse-red rounded-full animate-spin" />
                </div>
              ) : !user?.school_id ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <School className="w-8 h-8 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white/80 mb-2">
                    Select Your School First
                  </h3>
                  <p className="text-sm text-white/50 mb-4 max-w-md mx-auto">
                    To find peers from your school, you need to select your school first.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors"
                  >
                    <School className="w-4 h-4" />
                    Go to Dashboard
                  </button>
                </motion.div>
              ) : availablePeers.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <Users className="w-8 h-8 text-white/30" />
                  </div>
                  <h3 className="text-lg font-medium text-white/60 mb-2">
                    No peers available right now
                  </h3>
                  <p className="text-sm text-white/40">
                    Check back later or set yourself as available
                  </p>
                </motion.div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {availablePeers.map((peer) => (
                    <PeerCard
                      key={peer.user_id}
                      peer={peer}
                      onInvite={handleInvitePeer}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Create room modal */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setInvitePeerTopic(null);
        }}
        onCreate={handleCreateRoom}
        isCreating={isCreating}
        initialTopic={invitePeerTopic || undefined}
      />
    </div>
  );
}
