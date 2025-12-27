import { motion } from 'framer-motion';
import { User, BookOpen, HelpCircle, MessageSquare } from 'lucide-react';
import type { AvailablePeer } from '../../api/peer';

interface PeerCardProps {
  peer: AvailablePeer;
  onInvite?: (peerId: string) => void;
  onMessage?: (peerId: string) => void;
}

export function PeerCard({ peer, onInvite, onMessage }: PeerCardProps) {
  const isOnline = peer.last_seen_at
    ? new Date(peer.last_seen_at).getTime() > Date.now() - 5 * 60 * 1000
    : false;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-xl bg-surface border border-white/10 hover:border-white/20 transition-all"
    >
      {/* Header with avatar and name */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-prepverse-red/30 to-prepverse-red-deep/30 flex items-center justify-center">
            <User className="w-5 h-5 text-prepverse-red" />
          </div>
          {/* Online indicator */}
          <span
            className={`
              absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface
              ${isOnline ? 'bg-green-400' : 'bg-gray-500'}
            `}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{peer.user_name}</h3>
          {peer.status_message && (
            <p className="text-sm text-white/50 truncate">{peer.status_message}</p>
          )}
        </div>
      </div>

      {/* Strong topics */}
      {peer.strong_topics.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1">
            <BookOpen className="w-3 h-3" />
            <span>Strong in</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {peer.strong_topics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400"
              >
                {topic}
              </span>
            ))}
            {peer.strong_topics.length > 3 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-white/40">
                +{peer.strong_topics.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Seeking help topics */}
      {peer.seeking_help_topics.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1">
            <HelpCircle className="w-3 h-3" />
            <span>Needs help with</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {peer.seeking_help_topics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400"
              >
                {topic}
              </span>
            ))}
            {peer.seeking_help_topics.length > 3 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-white/40">
                +{peer.seeking_help_topics.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {onInvite && (
          <button
            onClick={() => onInvite(peer.user_id)}
            className="flex-1 py-2 px-3 rounded-lg bg-prepverse-red/20 text-prepverse-red hover:bg-prepverse-red/30 transition-colors text-sm font-medium"
          >
            Invite to Room
          </button>
        )}
        {onMessage && (
          <button
            onClick={() => onMessage(peer.user_id)}
            className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            title="Send message"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
