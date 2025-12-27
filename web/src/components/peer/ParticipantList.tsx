import { motion, AnimatePresence } from 'framer-motion';
import { User, Crown, MoreVertical, Flag, Ban } from 'lucide-react';
import { useState } from 'react';
import type { Participant } from '../../api/peer';

interface ParticipantListProps {
  participants: Participant[];
  currentUserId?: string;
  onBlock?: (userId: string) => void;
  onReport?: (userId: string) => void;
}

export function ParticipantList({
  participants,
  currentUserId,
  onBlock,
  onReport,
}: ParticipantListProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm text-white/40 font-medium mb-3">
        Participants ({participants.length})
      </div>

      <AnimatePresence>
        {participants.map((participant) => (
          <ParticipantItem
            key={participant.user_id}
            participant={participant}
            isCurrentUser={participant.user_id === currentUserId}
            onBlock={onBlock}
            onReport={onReport}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ParticipantItemProps {
  participant: Participant;
  isCurrentUser: boolean;
  onBlock?: (userId: string) => void;
  onReport?: (userId: string) => void;
}

function ParticipantItem({
  participant,
  isCurrentUser,
  onBlock,
  onReport,
}: ParticipantItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const isHost = participant.role === 'host';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 group"
    >
      {/* Avatar */}
      <div className="relative">
        <div
          className={`
            w-8 h-8 rounded-full flex items-center justify-center
            ${isHost ? 'bg-amber-500/20' : 'bg-white/10'}
          `}
        >
          <User className={`w-4 h-4 ${isHost ? 'text-amber-400' : 'text-white/60'}`} />
        </div>
        {isHost && (
          <Crown
            className="absolute -top-1 -right-1 w-3 h-3 text-amber-400"
            fill="currentColor"
          />
        )}
      </div>

      {/* Name and role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white truncate">
            {participant.user_name}
            {isCurrentUser && (
              <span className="text-white/40 ml-1">(You)</span>
            )}
          </span>
        </div>
        <span className="text-xs text-white/40 capitalize">{participant.role}</span>
      </div>

      {/* Actions menu (not for current user) */}
      {!isCurrentUser && (onBlock || onReport) && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
          >
            <MoreVertical className="w-4 h-4 text-white/40" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 top-full mt-1 z-20 py-1 bg-elevated rounded-lg border border-white/10 shadow-lg min-w-[120px]"
              >
                {onReport && (
                  <button
                    onClick={() => {
                      onReport(participant.user_id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4" />
                    Report
                  </button>
                )}
                {onBlock && (
                  <button
                    onClick={() => {
                      onBlock(participant.user_id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-white/5 flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Block
                  </button>
                )}
              </motion.div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
