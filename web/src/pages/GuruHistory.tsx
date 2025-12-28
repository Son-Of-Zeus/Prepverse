import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  GraduationCap,
  Clock,
  Target,
  Lightbulb,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Loader2,
} from 'lucide-react';

import { CosmicBackground } from '../components/ui/CosmicBackground';
import {
  getGuruHistory,
  getPersonaDisplayName,
  GuruHistoryResponse,
  GuruSessionSummary,
} from '../api/guru';

/**
 * GuruHistory Page - View past teaching sessions
 */
export const GuruHistory: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<GuruHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const data = await getGuruHistory(50, 0);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Failed to load session history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
            Completed
          </span>
        );
      case 'active':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            In Progress
          </span>
        );
      case 'abandoned':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">
            Abandoned
          </span>
        );
      default:
        return null;
    }
  };

  const renderSessionCard = (session: GuruSessionSummary, index: number) => (
    <motion.div
      key={session.session_id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => {
        if (session.status === 'active') {
          navigate('/guru');
        }
      }}
      className={`bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 ${
        session.status === 'active' ? 'cursor-pointer hover:border-purple-500/50' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white text-lg">{session.topic}</h3>
          <p className="text-sm text-slate-400">
            {session.subject} • {getPersonaDisplayName(session.persona)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(session.status)}
          {session.status === 'active' && (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>

      {/* Stats */}
      {session.status === 'completed' && (
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
              <Target className="w-3 h-3" />
              <span className="text-xs">Accuracy</span>
            </div>
            <span className="font-bold text-white">
              {session.accuracy_score ?? '-'}/10
            </span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
              <Lightbulb className="w-3 h-3" />
              <span className="text-xs">Simplicity</span>
            </div>
            <span className="font-bold text-white">
              {session.simplicity_score ?? '-'}/10
            </span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
              <Sparkles className="w-3 h-3" />
              <span className="text-xs">XP</span>
            </div>
            <span className="font-bold text-white">+{session.xp_earned}</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
              <MessageSquare className="w-3 h-3" />
              <span className="text-xs">Messages</span>
            </div>
            <span className="font-bold text-white">{session.message_count}</span>
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-2 text-xs text-slate-500">
        <Clock className="w-3 h-3" />
        {formatDate(session.created_at)}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-prepverse-dark relative overflow-hidden">
      <CosmicBackground starCount={40} />

      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={() => navigate('/guru')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-full text-slate-300 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-16 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            Teaching History
          </h1>
          <p className="text-slate-400">Your past Guru Mode sessions</p>
        </div>

        {/* Stats Summary */}
        {history && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {history.total_sessions}
              </div>
              <div className="text-xs text-slate-400">Total Sessions</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {history.total_xp_earned}
              </div>
              <div className="text-xs text-slate-400">Total XP Earned</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {history.average_accuracy?.toFixed(1) ?? '-'}
              </div>
              <div className="text-xs text-slate-400">Avg. Accuracy</div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
            <p className="text-slate-400">Loading history...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadHistory}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Sessions List */}
        {history && !isLoading && (
          <div className="space-y-4">
            {history.sessions.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">No teaching sessions yet</p>
                <button
                  onClick={() => navigate('/guru')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white"
                >
                  Start Teaching
                </button>
              </div>
            ) : (
              history.sessions.map((session, index) =>
                renderSessionCard(session, index)
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuruHistory;
