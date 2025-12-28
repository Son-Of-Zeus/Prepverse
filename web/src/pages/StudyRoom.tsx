import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MessageSquare,
  Pencil,
  Users,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { usePeer, usePeerSafety } from '../hooks/usePeer';
import { usePeerChat } from '../hooks/usePeerChat';
import { usePeerWhiteboard } from '../hooks/usePeerWhiteboard';
import { useAuth } from '../hooks/useAuth';
import { usePeerStore } from '../store/peerStore';
import {
  ChatMessage,
  ChatInput,
  ParticipantList,
  Whiteboard,
} from '../components/peer';

type ViewMode = 'chat' | 'whiteboard' | 'split';

export function StudyRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentSession,
    participants,
    isInSession,
    isLoading,
    error,
    joinSession,
    leaveSession,
    setCurrentUser,
    fetchParticipants,
  } = usePeer();
  // currentSession is used in JSX and in usePeerStore.getState() calls
  const { messages, sendMessage } = usePeerChat();
  const { operations, drawLine, addText, eraseItems, clearAll } = usePeerWhiteboard();
  const { blockUser, reportUser } = usePeerSafety();

  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isJoiningRef = useRef(false);
  const hasJoinedRef = useRef(false);
  const intentionalLeaveRef = useRef(false);

  // Set current user and join session
  useEffect(() => {
    // Don't rejoin if we intentionally left
    if (intentionalLeaveRef.current) return;
    // Need user info
    if (!user?.id || !user?.full_name) return;
    // Need session ID
    if (!sessionId) return;
    // Already joined this session
    if (hasJoinedRef.current) return;
    // Currently joining
    if (isJoiningRef.current) return;

    // Set current user first
    setCurrentUser(user.id, user.full_name);

    // Check if we're already in this session (e.g., we created it)
    if (currentSession?.id === sessionId && isInSession) {
      hasJoinedRef.current = true;
      return;
    }

    // Then join session
    isJoiningRef.current = true;
    joinSession(sessionId)
      .then(() => {
        hasJoinedRef.current = true;
      })
      .catch((err) => {
        console.error('Failed to join session:', err);
      })
      .finally(() => {
        isJoiningRef.current = false;
      });
  }, [user, sessionId, currentSession?.id, isInSession, setCurrentUser, joinSession]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll participants periodically
  useEffect(() => {
    if (!isInSession) return;

    const interval = setInterval(fetchParticipants, 10000);
    return () => clearInterval(interval);
  }, [isInSession, fetchParticipants]);

  // Cleanup on unmount - only leave if user intentionally left or navigated away
  // We use a ref to distinguish between intentional leaves and React StrictMode remounts
  useEffect(() => {
    const currentSessionId = sessionId;

    // Mark this session as joined when effect runs
    const hasJoined = hasJoinedRef.current;

    return () => {
      // Only leave if:
      // 1. User explicitly clicked leave (intentionalLeaveRef.current is true), OR
      // 2. User is navigating away from this page (not a React StrictMode remount)

      // If we haven't actually joined yet, don't try to leave
      if (!hasJoined) return;

      // If this is an intentional leave, the handleLeave function handles it
      if (intentionalLeaveRef.current) return;

      // For unintentional unmounts (navigation away), leave the session
      // Use setTimeout to ensure this doesn't run on React StrictMode remounts
      // StrictMode remounts happen synchronously, so a timeout lets us check
      // if the component remounted
      setTimeout(() => {
        const stillInSession = usePeerStore.getState().currentSession?.id === currentSessionId;
        if (stillInSession) {
          leaveSession();
        }
      }, 100);
    };
  }, [sessionId, leaveSession]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(messageInput.trim());
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleLeave = async () => {
    intentionalLeaveRef.current = true;
    await leaveSession();
    navigate('/peer');
  };

  const handleCopyLink = () => {
    if (sessionId) {
      // Create shareable link
      const shareUrl = `${window.location.origin}/study-room/${sessionId}`;
      navigator.clipboard.writeText(shareUrl);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  };

  const handleBlock = async (userId: string) => {
    try {
      await blockUser(userId);
    } catch (error) {
      console.error('Failed to block user:', error);
    }
  };

  const handleReport = async (userId: string) => {
    const description = prompt('Please describe the issue:');
    if (description) {
      try {
        await reportUser(userId, 'other', description, sessionId);
        alert('Report submitted. Thank you.');
      } catch (error) {
        console.error('Failed to report user:', error);
      }
    }
  };

  if (isLoading && !currentSession) {
    return (
      <div className="min-h-screen bg-gradient-verse flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-prepverse-red/30 border-t-prepverse-red rounded-full animate-spin" />
          <p className="text-white/60">Joining study room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-verse flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-6 bg-deep rounded-2xl border border-red-500/30 text-center"
        >
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-white mb-2">Unable to Join</h2>
          <p className="text-white/60 mb-4">{error}</p>
          <button
            onClick={() => navigate('/peer')}
            className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            Back to Lobby
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-verse">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-deep/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h1 className="font-semibold text-white">
              {currentSession?.name || currentSession?.topic || 'Study Room'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span>{currentSession?.subject}</span>
              <span>•</span>
              <span>{participants.length} participants</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Share link button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors text-sm"
            title="Copy invite link to share with others"
          >
            {keyCopied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {keyCopied ? 'Link Copied!' : 'Invite Link'}
          </button>

          {/* Participants toggle */}
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`
              p-2 rounded-lg transition-colors
              ${showParticipants ? 'bg-prepverse-red text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}
            `}
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* View mode tabs */}
      <div className="flex gap-1 px-4 py-2 bg-surface border-b border-white/10">
        <ViewModeButton
          active={viewMode === 'chat'}
          onClick={() => setViewMode('chat')}
          icon={<MessageSquare className="w-4 h-4" />}
          label="Chat"
        />
        {currentSession?.is_whiteboard_enabled && (
          <>
            <ViewModeButton
              active={viewMode === 'whiteboard'}
              onClick={() => setViewMode('whiteboard')}
              icon={<Pencil className="w-4 h-4" />}
              label="Whiteboard"
            />
            <ViewModeButton
              active={viewMode === 'split'}
              onClick={() => setViewMode('split')}
              icon={
                <div className="flex gap-0.5">
                  <MessageSquare className="w-3 h-3" />
                  <Pencil className="w-3 h-3" />
                </div>
              }
              label="Split"
            />
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat panel */}
        <AnimatePresence mode="wait">
          {(viewMode === 'chat' || viewMode === 'split') && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`
                flex flex-col bg-deep
                ${viewMode === 'split' ? 'w-1/2 border-r border-white/10' : 'flex-1'}
              `}
            >
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-white/40 text-sm">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <ChatInput
                value={messageInput}
                onChange={setMessageInput}
                onSend={handleSendMessage}
                disabled={isSending}
                placeholder="Type a message..."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Whiteboard panel */}
        <AnimatePresence mode="wait">
          {(viewMode === 'whiteboard' || viewMode === 'split') && (
            <motion.div
              key="whiteboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`h-full ${viewMode === 'split' ? 'w-1/2' : 'flex-1'}`}
            >
              <Whiteboard
                operations={operations}
                onDrawLine={drawLine}
                onAddText={addText}
                onEraseItems={eraseItems}
                onClearAll={clearAll}
                currentUserId={user?.id}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Participants sidebar */}
        <AnimatePresence>
          {showParticipants && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-64 bg-surface border-l border-white/10 p-4 overflow-y-auto"
            >
              <ParticipantList
                participants={participants}
                currentUserId={user?.id}
                onBlock={handleBlock}
                onReport={handleReport}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Leave confirmation modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLeaveConfirm(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-sm bg-deep rounded-2xl border border-white/10 p-6 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Leave Study Room?
                </h3>
                <p className="text-white/60 text-sm mb-6">
                  You'll need the room key to rejoin this session.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    Stay
                  </button>
                  <button
                    onClick={handleLeave}
                    className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    Leave
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ViewModeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ViewModeButton({ active, onClick, icon, label }: ViewModeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
        ${active ? 'bg-prepverse-red text-white' : 'text-white/60 hover:bg-white/5'}
      `}
    >
      {icon}
      {label}
    </button>
  );
}
