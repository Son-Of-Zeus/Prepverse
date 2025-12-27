import { motion } from 'framer-motion';
import { Users, MessageSquare, Pencil, Clock } from 'lucide-react';
import type { PeerSession } from '../../api/peer';

interface SessionCardProps {
  session: PeerSession;
  onJoin: (sessionId: string) => void;
  isJoining?: boolean;
}

const subjectColors: Record<string, string> = {
  Mathematics: 'from-rose-500/20 to-rose-600/10 border-rose-500/30',
  Physics: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
  Chemistry: 'from-violet-500/20 to-violet-600/10 border-violet-500/30',
  Biology: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
};

const subjectTextColors: Record<string, string> = {
  Mathematics: 'text-rose-400',
  Physics: 'text-cyan-400',
  Chemistry: 'text-violet-400',
  Biology: 'text-emerald-400',
};

export function SessionCard({ session, onJoin, isJoining }: SessionCardProps) {
  const colorClass = subjectColors[session.subject] || subjectColors.Mathematics;
  const textColorClass = subjectTextColors[session.subject] || subjectTextColors.Mathematics;

  const isFull = session.participant_count >= session.max_participants;
  const isActive = session.status === 'active';

  const timeSinceCreated = getTimeSince(new Date(session.created_at));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative p-4 rounded-xl border bg-gradient-to-br ${colorClass}
        hover:shadow-lg transition-all duration-300
      `}
    >
      {/* Status indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <span
          className={`
            w-2 h-2 rounded-full
            ${isActive ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}
          `}
        />
        <span className="text-xs text-white/60">
          {isActive ? 'Active' : 'Waiting'}
        </span>
      </div>

      {/* Subject badge */}
      <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${textColorClass} bg-white/5 mb-2`}>
        {session.subject}
      </div>

      {/* Topic */}
      <h3 className="text-lg font-semibold text-white mb-1">
        {session.name || session.topic}
      </h3>

      {/* Topic if name exists */}
      {session.name && (
        <p className="text-sm text-white/60 mb-3">{session.topic}</p>
      )}

      {/* Meta info */}
      <div className="flex items-center gap-4 text-sm text-white/50 mb-4">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>
            {session.participant_count}/{session.max_participants}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{timeSinceCreated}</span>
        </div>
        {session.is_whiteboard_enabled && (
          <div className="flex items-center gap-1" title="Whiteboard enabled">
            <Pencil className="w-4 h-4" />
          </div>
        )}
        <div className="flex items-center gap-1" title="Chat enabled">
          <MessageSquare className="w-4 h-4" />
        </div>
      </div>

      {/* Join button */}
      <button
        onClick={() => onJoin(session.id)}
        disabled={isFull || isJoining}
        className={`
          w-full py-2 px-4 rounded-lg font-medium text-sm
          transition-all duration-200
          ${
            isFull
              ? 'bg-white/5 text-white/30 cursor-not-allowed'
              : 'bg-white/10 text-white hover:bg-white/20 active:scale-[0.98]'
          }
        `}
      >
        {isJoining ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Joining...
          </span>
        ) : isFull ? (
          'Room Full'
        ) : (
          'Join Room'
        )}
      </button>
    </motion.div>
  );
}

function getTimeSince(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
